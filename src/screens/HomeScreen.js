import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert, ActivityIndicator,
  SafeAreaView, StatusBar,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useMqtt } from '../hooks/useMqtt';
import { publishFeed, getFeedValue, FEEDS } from '../services/adafruitIO';

export default function HomeScreen() {
  const { connected, sensorData, publish } = useMqtt();

  // Control states
  const [ledBrightness, setLedBrightness] = useState(50);
  const [rgbBrightness, setRgbBrightness] = useState(50);
  const [doorStatus, setDoorStatus] = useState('CLOSE'); // 'OPEN' | 'CLOSE'
  const [pirEnabled, setPirEnabled] = useState(false);
  const [gasStatus, setGasStatus] = useState('Safe');  // pulled via REST
  const [loading, setLoading] = useState({});
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  // Poll gas + themis via REST every 5 seconds (these are not directly subscribed)
  useEffect(() => {
    const poll = async () => {
      try {
        const gas = await getFeedValue('themis'); // Use themis as light; gas isn't published
        // Gas warning based on sensorData when Arduino publishes
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const setLoading_ = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  // ---- Handlers ----
  const handleLedChange = async (val) => {
    const v = Math.round(val);
    setLedBrightness(v);
  };
  const handleLedRelease = async (val) => {
    const v = Math.round(val);
    try {
      setLoading_('led', true);
      await publishFeed('lb1', v);
      addLog(`Đèn LED: ${v}%`);
    } catch (e) { Alert.alert('Lỗi', e.message); }
    finally { setLoading_('led', false); }
  };

  const handleRgbChange = async (val) => {
    setRgbBrightness(Math.round(val));
  };
  const handleRgbRelease = async (val) => {
    const v = Math.round(val);
    try {
      setLoading_('rgb', true);
      await publishFeed('rgb', v);
      addLog(`RGB: độ sáng ${v}%`);
    } catch (e) { Alert.alert('Lỗi', e.message); }
    finally { setLoading_('rgb', false); }
  };

  const handleDoor = async (action) => {
    try {
      setLoading_('door', true);
      await publishFeed('door', action);
      setDoorStatus(action);
      addLog(`Cửa: ${action === 'OPEN' ? 'Mở' : 'Đóng'}`);
    } catch (e) { Alert.alert('Lỗi', e.message); }
    finally { setLoading_('door', false); }
  };

  const handlePir = async (val) => {
    try {
      setPirEnabled(val);
      await publishFeed('pir', val ? 'ON' : 'OFF');
      addLog(`Chế độ PIR: ${val ? 'Bật' : 'Tắt'}`);
    } catch (e) { Alert.alert('Lỗi', e.message); }
  };

  // ---- UI ----
  const tempNum = parseFloat(sensorData.temperature);
  const tempColor = isNaN(tempNum) ? '#888' : tempNum > 35 ? '#ff6b6b' : tempNum > 28 ? '#ffaa44' : '#4ade80';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Smart Home</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[s.dot, { backgroundColor: connected ? '#4ade80' : '#f87171' }]} />
            <Text style={s.headerSub}>{connected ? 'Đang kết nối MQTT' : 'Đang kết nối lại...'}</Text>
          </View>
        </View>
        <View style={s.aioTag}>
          <Text style={s.aioText}>io.adafruit.com</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Sensor Grid */}
        <Text style={s.sectionLabel}>CẢM BIẾN</Text>
        <View style={s.sensorGrid}>
          <SensorCard icon="🌡️" value={`${sensorData.temperature}°C`} label="Nhiệt độ" color={tempColor} />
          <SensorCard icon="💧" value={`${sensorData.humidity}%`} label="Độ ẩm" color="#66ccff" />
          <SensorCard icon="☀️" value={`${sensorData.themis}%`} label="Ánh sáng" color="#ffdd44" />
          <SensorCard icon="🌬️" value={gasStatus} label="Khí gas"
            color={gasStatus === 'Safe' ? '#4ade80' : '#f87171'} />
        </View>

        {/* Controls */}
        <Text style={s.sectionLabel}>ĐIỀU KHIỂN</Text>

        {/* LED */}
        <ControlCard title="Đèn LED" sub={`Độ sáng: ${ledBrightness}%`} loading={loading.led}>
          <Slider
            style={{ width: '100%', height: 30 }}
            minimumValue={0} maximumValue={100} step={1}
            value={ledBrightness}
            minimumTrackTintColor="#6366f1"
            maximumTrackTintColor="#333355"
            thumbTintColor="#6366f1"
            onValueChange={handleLedChange}
            onSlidingComplete={handleLedRelease}
          />
        </ControlCard>

        {/* RGB */}
        <ControlCard title="RGB NeoPixel" sub={`Độ sáng: ${rgbBrightness}%`} loading={loading.rgb}>
          <Slider
            style={{ width: '100%', height: 30 }}
            minimumValue={1} maximumValue={100} step={1}
            value={rgbBrightness}
            minimumTrackTintColor="#a78bfa"
            maximumTrackTintColor="#333355"
            thumbTintColor="#a78bfa"
            onValueChange={handleRgbChange}
            onSlidingComplete={handleRgbRelease}
          />
        </ControlCard>

        {/* Door */}
        <ControlCard title="Cửa (Servo)" sub={`Trạng thái: ${doorStatus === 'OPEN' ? 'Đang mở' : 'Đang đóng'}`} loading={loading.door}>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity
              style={[s.doorBtn, doorStatus === 'OPEN' && s.doorBtnActiveOpen]}
              onPress={() => handleDoor('OPEN')}>
              <Text style={[s.doorBtnText, { color: '#4ade80' }]}>🔓 Mở cửa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.doorBtn, doorStatus === 'CLOSE' && s.doorBtnActiveClose]}
              onPress={() => handleDoor('CLOSE')}>
              <Text style={[s.doorBtnText, { color: '#f87171' }]}>🔒 Đóng cửa</Text>
            </TouchableOpacity>
          </View>
        </ControlCard>

        {/* PIR */}
        <ControlCard title="Chế độ PIR" sub="Phát hiện chuyển động + còi">
          <Switch
            value={pirEnabled}
            onValueChange={handlePir}
            trackColor={{ false: '#333355', true: '#6366f1' }}
            thumbColor="#fff"
          />
        </ControlCard>

        {/* Activity Log */}
        {logs.length > 0 && (
          <>
            <Text style={s.sectionLabel}>NHẬT KÝ HOẠT ĐỘNG</Text>
            <View style={s.logCard}>
              {logs.slice(0, 6).map((log, i) => (
                <Text key={i} style={[s.logText, i === 0 && { color: '#a0a0ff' }]}>{log}</Text>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function SensorCard({ icon, value, label, color }) {
  return (
    <View style={s.sensorCard}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={[s.sensorVal, { color }]}>{value}</Text>
      <Text style={s.sensorLabel}>{label}</Text>
    </View>
  );
}

function ControlCard({ title, sub, loading, children }) {
  return (
    <View style={s.controlCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View>
          <Text style={s.controlTitle}>{title}</Text>
          <Text style={s.controlSub}>{sub}</Text>
        </View>
        {loading && <ActivityIndicator size="small" color="#6366f1" />}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 12,
    backgroundColor: '#0f0f1a',
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  headerTitle: { color: '#e0e0ff', fontSize: 18, fontWeight: '500' },
  headerSub: { color: '#6666aa', fontSize: 11, marginLeft: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  aioTag: { backgroundColor: '#1a2a3a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2a4a6a' },
  aioText: { color: '#66aaff', fontSize: 10 },
  scroll: { flex: 1 },
  sectionLabel: { color: '#4444aa', fontSize: 10, letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8 },
  sensorCard: {
    width: '47%', backgroundColor: '#1a1a3e',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#2a2a5a',
  },
  sensorVal: { fontSize: 22, fontWeight: '500', marginTop: 4 },
  sensorLabel: { color: '#5555aa', fontSize: 10, marginTop: 2 },
  controlCard: {
    marginHorizontal: 12, marginBottom: 10,
    backgroundColor: '#1a1a3e', borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: '#2a2a5a',
  },
  controlTitle: { color: '#c0c0e8', fontSize: 14, fontWeight: '500' },
  controlSub: { color: '#4444aa', fontSize: 11, marginTop: 2 },
  doorBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#1a1a3e',
    borderWidth: 1, borderColor: '#3a3a6a',
  },
  doorBtnActiveOpen: { backgroundColor: '#1a3a1a', borderColor: '#2d6a2d' },
  doorBtnActiveClose: { backgroundColor: '#3a1a1a', borderColor: '#6a2d2d' },
  doorBtnText: { fontSize: 13, fontWeight: '500' },
  logCard: {
    marginHorizontal: 12, backgroundColor: '#0d0d20',
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#2a2a4a',
  },
  logText: { color: '#4444aa', fontSize: 11, marginBottom: 4, fontFamily: 'monospace' },
});
