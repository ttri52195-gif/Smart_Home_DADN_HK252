import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, Alert, ActivityIndicator,
  SafeAreaView, StatusBar, PanResponder,
} from 'react-native';
import { useMqtt } from '../hooks/useMqtt';
import { publishFeed, getFeedValue } from '../services/adafruitIO';

// ── Custom Slider thuần React Native ──
function Slider({ value, onValueChange, onSlidingComplete, minimumValue = 0, maximumValue = 100, color = '#6366f1' }) {
  const [width, setWidth] = useState(0);
  const clamp = (v) => Math.max(minimumValue, Math.min(maximumValue, v));
  const pct = width > 0 ? ((value - minimumValue) / (maximumValue - minimumValue)) : 0;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      if (width === 0) return;
      const newVal = clamp(Math.round(minimumValue + (e.nativeEvent.locationX / width) * (maximumValue - minimumValue)));
      onValueChange?.(newVal);
    },
    onPanResponderMove: (e) => {
      if (width === 0) return;
      const newVal = clamp(Math.round(minimumValue + (e.nativeEvent.locationX / width) * (maximumValue - minimumValue)));
      onValueChange?.(newVal);
    },
    onPanResponderRelease: (e) => {
      if (width === 0) return;
      const newVal = clamp(Math.round(minimumValue + (e.nativeEvent.locationX / width) * (maximumValue - minimumValue)));
      onSlidingComplete?.(newVal);
    },
  });

  return (
    <View
      style={{ width: '100%', height: 30, justifyContent: 'center' }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
      {...panResponder.panHandlers}
    >
      <View style={{ height: 4, backgroundColor: '#333355', borderRadius: 2, width: '100%' }}>
        <View style={{ height: 4, backgroundColor: color, borderRadius: 2, width: `${pct * 100}%` }} />
      </View>
      <View style={{
        position: 'absolute',
        left: pct * width - 10,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: color,
        elevation: 4,
      }} />
    </View>
  );
}

// Gas: giá trị analog 0-4095, ngưỡng nguy hiểm > 2000
function getGasStatus(val) {
  if (val === null) return { label: '--', color: '#888', bg: '#1a1a3e', icon: '🟢' };
  if (val > 3000)   return { label: 'Nguy hiểm!', color: '#f87171', bg: '#2a0d0d', icon: '🔴' };
  if (val > 2000)   return { label: 'Cảnh báo',   color: '#ffaa44', bg: '#2a1a00', icon: '🟡' };
  return               { label: 'An toàn',      color: '#4ade80', bg: '#0d2a1a', icon: '🟢' };
}

// Rain: 4095 = khô, giá trị thấp = ướt/mưa
function getRainStatus(val) {
  if (val === null) return { label: '--', color: '#888', bg: '#1a1a3e', icon: '☀️' };
  if (val < 1000)   return { label: 'Mưa to',   color: '#f87171', bg: '#0d1a2a', icon: '⛈️' };
  if (val < 2500)   return { label: 'Có mưa',   color: '#66ccff', bg: '#0d1a2a', icon: '🌧️' };
  if (val < 3500)   return { label: 'Ẩm ướt',   color: '#aaddff', bg: '#0d1a2a', icon: '🌦️' };
  return               { label: 'Khô ráo',   color: '#ffdd44', bg: '#1a1a0d', icon: '☀️' };
}

export default function HomeScreen() {
  const { connected, sensorData } = useMqtt();

  const [ledBrightness, setLedBrightness] = useState(50);
  const [rgbBrightness, setRgbBrightness] = useState(50);
  const [doorStatus, setDoorStatus]       = useState('CLOSE');
  const [pirEnabled, setPirEnabled]       = useState(false);
  const [gasVal,  setGasVal]              = useState(null);
  const [rainVal, setRainVal]             = useState(null);
  const [loading, setLoading]             = useState({});
  const [logs, setLogs]                   = useState([]);

  const addLog = (msg) => {
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  };

  // Poll gas + rain mỗi 5 giây
  useEffect(() => {
    const poll = async () => {
      try {
        const [gas, rain] = await Promise.all([
          getFeedValue('gas'),
          getFeedValue('rain'),
        ]);
        if (gas  !== null) setGasVal(parseInt(gas));
        if (rain !== null) setRainVal(parseInt(rain));
      } catch (_) {}
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  const setLoading_ = (key, val) => setLoading(prev => ({ ...prev, [key]: val }));

  const handleLedRelease = async (val) => {
    const v = Math.round(val);
    try {
      setLoading_('led', true);
      await publishFeed('lb1', v);
      addLog(`Đèn LED: ${v}%`);
    } catch (e) { Alert.alert('Lỗi', e.message); }
    finally { setLoading_('led', false); }
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

  const tempNum   = parseFloat(sensorData.temperature);
  const tempColor = isNaN(tempNum) ? '#888' : tempNum > 35 ? '#ff6b6b' : tempNum > 28 ? '#ffaa44' : '#4ade80';
  const gas       = getGasStatus(gasVal);
  const rain      = getRainStatus(rainVal);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />

      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Smart Home</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <View style={[s.dot, { backgroundColor: connected ? '#4ade80' : '#f87171' }]} />
            <Text style={s.headerSub}>{connected ? 'Đang kết nối' : 'Đang kết nối lại...'}</Text>
          </View>
        </View>
        <View style={s.aioTag}>
          <Text style={s.aioText}>io.adafruit.com</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Cảm biến môi trường */}
        <Text style={s.sectionLabel}>CẢM BIẾN MÔI TRƯỜNG</Text>
        <View style={s.sensorGrid}>
          <SensorCard icon="🌡️" value={`${sensorData.temperature}°C`} label="Nhiệt độ"  color={tempColor} />
          <SensorCard icon="💧" value={`${sensorData.humidity}%`}      label="Độ ẩm"     color="#66ccff" />
          <SensorCard icon="☀️" value={`${sensorData.themis}%`}        label="Ánh sáng"  color="#ffdd44" />
        </View>

        {/* Cảm biến an toàn */}
        <Text style={s.sectionLabel}>CẢM BIẾN AN TOÀN</Text>
        <View style={s.safetyRow}>

          {/* Gas */}
          <View style={[s.safetyCard, { backgroundColor: gas.bg, borderColor: gas.color + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 22 }}>{gas.icon}</Text>
              <Text style={[s.safetyTitle, { marginLeft: 8 }]}>Khí Gas</Text>
            </View>
            <Text style={[s.safetyVal, { color: gas.color }]}>{gas.label}</Text>
            <Text style={s.safetyRaw}>{gasVal !== null ? `ADC: ${gasVal}` : 'Đang đọc...'}</Text>
            {gasVal !== null && (
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.min(100, (gasVal / 4095) * 100)}%`, backgroundColor: gas.color }]} />
              </View>
            )}
          </View>

          {/* Rain */}
          <View style={[s.safetyCard, { backgroundColor: rain.bg, borderColor: rain.color + '55' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 22 }}>{rain.icon}</Text>
              <Text style={[s.safetyTitle, { marginLeft: 8 }]}>Mưa</Text>
            </View>
            <Text style={[s.safetyVal, { color: rain.color }]}>{rain.label}</Text>
            <Text style={s.safetyRaw}>{rainVal !== null ? `ADC: ${rainVal}` : 'Đang đọc...'}</Text>
            {rainVal !== null && (
              <View style={s.barBg}>
                <View style={[s.barFill, { width: `${Math.min(100, ((4095 - rainVal) / 4095) * 100)}%`, backgroundColor: rain.color }]} />
              </View>
            )}
          </View>

        </View>

        {/* Controls */}
        <Text style={s.sectionLabel}>ĐIỀU KHIỂN</Text>

        <ControlCard title="Đèn LED" sub={`Độ sáng: ${ledBrightness}%`} loading={loading.led}>
          <Slider value={ledBrightness} minimumValue={0} maximumValue={100} color="#6366f1"
            onValueChange={v => setLedBrightness(Math.round(v))}
            onSlidingComplete={handleLedRelease} />
        </ControlCard>

        <ControlCard title="RGB NeoPixel" sub={`Độ sáng: ${rgbBrightness}%`} loading={loading.rgb}>
          <Slider value={rgbBrightness} minimumValue={1} maximumValue={100} color="#a78bfa"
            onValueChange={v => setRgbBrightness(Math.round(v))}
            onSlidingComplete={handleRgbRelease} />
        </ControlCard>

        <ControlCard title="Cửa (Servo)" sub={`Trạng thái: ${doorStatus === 'OPEN' ? 'Đang mở' : 'Đang đóng'}`} loading={loading.door}>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
            <TouchableOpacity style={[s.doorBtn, doorStatus === 'OPEN' && s.doorBtnActiveOpen]} onPress={() => handleDoor('OPEN')}>
              <Text style={[s.doorBtnText, { color: '#4ade80' }]}>🔓 Mở cửa</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.doorBtn, doorStatus === 'CLOSE' && s.doorBtnActiveClose]} onPress={() => handleDoor('CLOSE')}>
              <Text style={[s.doorBtnText, { color: '#f87171' }]}>🔒 Đóng cửa</Text>
            </TouchableOpacity>
          </View>
        </ControlCard>

        <ControlCard title="Chế độ PIR" sub="Phát hiện chuyển động + còi">
          <Switch value={pirEnabled} onValueChange={handlePir}
            trackColor={{ false: '#333355', true: '#6366f1' }} thumbColor="#fff" />
        </ControlCard>

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
  safe:               { flex: 1, backgroundColor: '#0f0f1a' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 12, backgroundColor: '#0f0f1a', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle:        { color: '#e0e0ff', fontSize: 18, fontWeight: '500' },
  headerSub:          { color: '#6666aa', fontSize: 11, marginLeft: 6 },
  dot:                { width: 6, height: 6, borderRadius: 3 },
  aioTag:             { backgroundColor: '#1a2a3a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#2a4a6a' },
  aioText:            { color: '#66aaff', fontSize: 10 },
  scroll:             { flex: 1 },
  sectionLabel:       { color: '#4444aa', fontSize: 10, letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  sensorGrid:         { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  sensorCard:         { flex: 1, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#2a2a5a' },
  sensorVal:          { fontSize: 18, fontWeight: '500', marginTop: 4 },
  sensorLabel:        { color: '#5555aa', fontSize: 9, marginTop: 2 },
  safetyRow:          { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  safetyCard:         { flex: 1, borderRadius: 12, padding: 12, borderWidth: 1 },
  safetyTitle:        { color: '#8888cc', fontSize: 11 },
  safetyVal:          { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  safetyRaw:          { color: '#4444aa', fontSize: 10, marginBottom: 6 },
  barBg:              { height: 4, backgroundColor: '#2a2a5a', borderRadius: 2 },
  barFill:            { height: 4, borderRadius: 2 },
  controlCard:        { marginHorizontal: 12, marginBottom: 10, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a5a' },
  controlTitle:       { color: '#c0c0e8', fontSize: 14, fontWeight: '500' },
  controlSub:         { color: '#4444aa', fontSize: 11, marginTop: 2 },
  doorBtn:            { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#1a1a3e', borderWidth: 1, borderColor: '#3a3a6a' },
  doorBtnActiveOpen:  { backgroundColor: '#1a3a1a', borderColor: '#2d6a2d' },
  doorBtnActiveClose: { backgroundColor: '#3a1a1a', borderColor: '#6a2d2d' },
  doorBtnText:        { fontSize: 13, fontWeight: '500' },
  logCard:            { marginHorizontal: 12, backgroundColor: '#0d0d20', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2a2a4a' },
  logText:            { color: '#4444aa', fontSize: 11, marginBottom: 4, fontFamily: 'monospace' },
});