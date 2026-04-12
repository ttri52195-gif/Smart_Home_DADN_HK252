import { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFeedValue } from '../services/adafruitIO';

// Hiển thị notification khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Ngưỡng cảnh báo
const THRESHOLDS = {
  temperature: {
    warn:   { above: 30, title: '🌡️ Nhiệt độ cao',       body: (v) => `Nhiệt độ đang ở ${v}°C — vượt ngưỡng 30°C` },
    danger: { above: 35, title: '🔴 Nhiệt độ nguy hiểm!', body: (v) => `Nhiệt độ đang ở ${v}°C — nguy hiểm!` },
  },
  humidity: {
    warnHigh: { above: 80, title: '💧 Độ ẩm quá cao',    body: (v) => `Độ ẩm đang ở ${v}% — vượt ngưỡng 80%` },
    warnLow:  { below: 30, title: '💧 Độ ẩm quá thấp',   body: (v) => `Độ ẩm đang ở ${v}% — thấp hơn 30%` },
    danger:   { above: 90, title: '🔴 Độ ẩm nguy hiểm!', body: (v) => `Độ ẩm đang ở ${v}%!` },
  },
  themis: {
    warnLow:   { below: 20, title: '☀️ Ánh sáng yếu',     body: (v) => `Ánh sáng chỉ còn ${v}%` },
    dangerLow: { below: 10, title: '🔴 Ánh sáng rất yếu!', body: (v) => `Ánh sáng chỉ còn ${v}% — quá tối!` },
  },
  gas: {
    warn:   { above: 2000, title: '⚠️ Phát hiện khí gas!', body: (v) => `Mức khí gas: ${v} — vượt ngưỡng cảnh báo` },
    danger: { above: 3000, title: '🔴 Khí gas nguy hiểm!', body: (v) => `Mức khí gas: ${v} — nguy hiểm! Kiểm tra ngay!` },
  },
  rain: {
    warn:  { below: 3500, title: '🌧️ Phát hiện mưa!', body: (v) => `Cảm biến mưa: ${v} — trời đang có mưa` },
    heavy: { below: 1000, title: '⛈️ Mưa to!',         body: (v) => `Cảm biến mưa: ${v} — mưa rất to!` },
  },
};

const COOLDOWN_MS = 5 * 60 * 1000; // 5 phút cooldown mỗi loại cảnh báo

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('smarthome-alerts', {
      name: 'Smart Home Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: true,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function sendNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger: null,
  });
}

export function useMqtt() {
  const [connected, setConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    temperature: '--',
    humidity: '--',
    themis: '--',
    gas: '--',
    rain: '--',
  });

  const lastNotif = useRef({});

  const canNotify = (key) => {
    const last = lastNotif.current[key] || 0;
    return Date.now() - last > COOLDOWN_MS;
  };

  const notify = async (key, title, body) => {
    if (!canNotify(key)) return;
    lastNotif.current[key] = Date.now();
    await sendNotification(title, body);
  };

  const checkThresholds = async (temp, hum, light, gas, rain) => {
    // Nhiệt độ
    if (temp !== null) {
      if (temp >= 35)      await notify('temp_danger',   THRESHOLDS.temperature.danger.title, THRESHOLDS.temperature.danger.body(temp));
      else if (temp >= 30) await notify('temp_warn',     THRESHOLDS.temperature.warn.title,   THRESHOLDS.temperature.warn.body(temp));
    }
    // Độ ẩm
    if (hum !== null) {
      if (hum >= 90)       await notify('hum_danger',    THRESHOLDS.humidity.danger.title,    THRESHOLDS.humidity.danger.body(hum));
      else if (hum >= 80)  await notify('hum_warn_high', THRESHOLDS.humidity.warnHigh.title,  THRESHOLDS.humidity.warnHigh.body(hum));
      else if (hum <= 30)  await notify('hum_warn_low',  THRESHOLDS.humidity.warnLow.title,   THRESHOLDS.humidity.warnLow.body(hum));
    }
    // Ánh sáng
    if (light !== null) {
      if (light <= 10)      await notify('light_danger', THRESHOLDS.themis.dangerLow.title, THRESHOLDS.themis.dangerLow.body(light));
      else if (light <= 20) await notify('light_warn',   THRESHOLDS.themis.warnLow.title,   THRESHOLDS.themis.warnLow.body(light));
    }
    // Khí gas
    if (gas !== null) {
      if (gas > 3000)      await notify('gas_danger', THRESHOLDS.gas.danger.title, THRESHOLDS.gas.danger.body(gas));
      else if (gas > 2000) await notify('gas_warn',   THRESHOLDS.gas.warn.title,   THRESHOLDS.gas.warn.body(gas));
    }
    // Mưa
    if (rain !== null) {
      if (rain < 1000)      await notify('rain_heavy', THRESHOLDS.rain.heavy.title, THRESHOLDS.rain.heavy.body(rain));
      else if (rain < 3500) await notify('rain_warn',  THRESHOLDS.rain.warn.title,  THRESHOLDS.rain.warn.body(rain));
    }
  };

  useEffect(() => {
    let active = true;
    requestPermissions();

    const poll = async () => {
      try {
        const [temp, hum, light, gas, rain] = await Promise.all([
          getFeedValue('temperature'),
          getFeedValue('humidity'),
          getFeedValue('themis'),
          getFeedValue('gas'),
          getFeedValue('rain'),
        ]);
        if (!active) return;

        const tempVal  = temp  !== null ? parseFloat(temp)  : null;
        const humVal   = hum   !== null ? parseInt(hum)     : null;
        const lightVal = light !== null ? parseInt(light)   : null;
        const gasVal   = gas   !== null ? parseInt(gas)     : null;
        const rainVal  = rain  !== null ? parseInt(rain)    : null;

        setSensorData({
          temperature: tempVal  !== null ? tempVal.toFixed(1) : '--',
          humidity:    humVal   !== null ? String(humVal)     : '--',
          themis:      lightVal !== null ? String(lightVal)   : '--',
          gas:         gasVal   !== null ? String(gasVal)     : '--',
          rain:        rainVal  !== null ? String(rainVal)    : '--',
        });
        setConnected(true);

        await checkThresholds(tempVal, humVal, lightVal, gasVal, rainVal);
      } catch {
        if (active) setConnected(false);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return { connected, sensorData };
}