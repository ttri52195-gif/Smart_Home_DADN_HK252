import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { getFeedHistory } from '../services/adafruitIO';

const W = Dimensions.get('window').width - 48; // chart width

const FEEDS = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#ff8888', icon: '🌡️' },
  { key: 'humidity',    label: 'Độ ẩm',    unit: '%',  color: '#66ccff', icon: '💧' },
  { key: 'themis',      label: 'Ánh sáng', unit: '%',  color: '#ffdd44', icon: '☀️' },
];

// Vẽ biểu đồ đường bằng SVG (View + absolute positioned Views)
function LineChart({ data, color, unit }) {
  const H = 120;
  const PAD = { top: 8, bottom: 24, left: 36, right: 8 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  if (!data || data.length < 2) {
    return (
      <View style={{ height: H, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#4444aa', fontSize: 12 }}>Chưa có dữ liệu</Text>
      </View>
    );
  }

  const vals  = data.map(d => d.value);
  const minV  = Math.min(...vals);
  const maxV  = Math.max(...vals);
  const range = maxV - minV || 1;

  const toX = (i) => PAD.left + (i / (data.length - 1)) * cW;
  const toY = (v) => PAD.top + cH - ((v - minV) / range) * cH;

  // Build polyline points
  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ');

  // Y-axis labels (3 ticks)
  const ticks = [minV, (minV + maxV) / 2, maxV];

  // X-axis labels (first, mid, last)
  const fmt = (d) => {
    if (!d?.time) return '';
    return d.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ width: W, height: H + 8 }}>
      {/* Y-axis ticks */}
      {ticks.map((t, i) => (
        <Text key={i} style={{
          position: 'absolute',
          left: 0,
          top: toY(t) - 6,
          width: PAD.left - 4,
          fontSize: 9,
          color: '#4444aa',
          textAlign: 'right',
        }}>
          {t.toFixed(1)}
        </Text>
      ))}

      {/* Grid lines */}
      {ticks.map((t, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: PAD.left,
          top: toY(t),
          width: cW,
          height: 0.5,
          backgroundColor: '#2a2a5a',
        }} />
      ))}

      {/* Line segments */}
      {data.slice(0, -1).map((d, i) => {
        const x1 = toX(i),   y1 = toY(d.value);
        const x2 = toX(i+1), y2 = toY(data[i+1].value);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute',
            left: x1,
            top: y1,
            width: len,
            height: 2,
            backgroundColor: color,
            borderRadius: 1,
            opacity: 0.85,
            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
            transformOrigin: '0 0',
          }} />
        );
      })}

      {/* Dots at each point */}
      {data.map((d, i) => (
        <View key={i} style={{
          position: 'absolute',
          left: toX(i) - 3,
          top: toY(d.value) - 3,
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: color,
        }} />
      ))}

      {/* X-axis labels */}
      {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((idx) => (
        <Text key={idx} style={{
          position: 'absolute',
          left: toX(idx) - 18,
          top: H - 16,
          width: 36,
          fontSize: 8,
          color: '#4444aa',
          textAlign: 'center',
        }}>
          {fmt(data[idx])}
        </Text>
      ))}
    </View>
  );
}

export default function ChartScreen() {
  const [selected, setSelected] = useState('temperature');
  const [history,  setHistory]  = useState({});
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState({});

  const feed = FEEDS.find(f => f.key === selected);

  const load = useCallback(async (key) => {
    if (history[key]) return; // cache
    setLoading(true);
    try {
      const data = await getFeedHistory(key, 30);
      setHistory(p => ({ ...p, [key]: data }));
      if (data.length) {
        const vals = data.map(d => d.value);
        setStats(p => ({
          ...p,
          [key]: {
            min:  Math.min(...vals).toFixed(1),
            max:  Math.max(...vals).toFixed(1),
            avg: (vals.reduce((a,b) => a+b, 0) / vals.length).toFixed(1),
            last: vals[vals.length - 1].toFixed(1),
          }
        }));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [history]);

  useEffect(() => { load(selected); }, [selected]);

  const st = stats[selected];

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Biểu đồ lịch sử</Text>
        <TouchableOpacity style={s.refreshBtn}
          onPress={() => { setHistory(p => ({ ...p, [selected]: undefined })); load(selected); }}>
          <Text style={s.refreshTxt}>↻ Làm mới</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Tab chọn feed */}
        <View style={s.tabRow}>
          {FEEDS.map(f => (
            <TouchableOpacity key={f.key} activeOpacity={0.7}
              style={[s.tab, selected === f.key && { borderBottomColor: f.color, borderBottomWidth: 2 }]}
              onPress={() => setSelected(f.key)}>
              <Text style={[s.tabTxt, selected === f.key && { color: f.color }]}>
                {f.icon} {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stat cards */}
        {st && (
          <View style={s.statRow}>
            {[
              { label: 'Hiện tại', val: `${st.last}${feed.unit}` },
              { label: 'Thấp nhất', val: `${st.min}${feed.unit}` },
              { label: 'Cao nhất',  val: `${st.max}${feed.unit}` },
              { label: 'Trung bình',val: `${st.avg}${feed.unit}` },
            ].map(item => (
              <View key={item.label} style={s.statCard}>
                <Text style={s.statVal}>{item.val}</Text>
                <Text style={s.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>{feed.icon} {feed.label} — 30 điểm gần nhất</Text>
          {loading
            ? <ActivityIndicator color={feed.color} style={{ marginTop: 40 }} />
            : <LineChart data={history[selected]} color={feed.color} unit={feed.unit} />
          }
        </View>

        {/* Raw data table */}
        {history[selected]?.length > 0 && (
          <View style={s.tableCard}>
            <Text style={s.tableTitle}>Dữ liệu gần đây</Text>
            {history[selected].slice(-8).reverse().map((d, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableTime}>
                  {d.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
                <Text style={[s.tableVal, { color: feed.color }]}>
                  {d.value.toFixed(1)}{feed.unit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f0f1a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#e0e0ff', fontSize: 18, fontWeight: '500' },
  refreshBtn:  { backgroundColor: '#1a1a3e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a6a' },
  refreshTxt:  { color: '#6366f1', fontSize: 12 },
  tabRow:      { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 8 },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:      { color: '#4444aa', fontSize: 11 },
  statRow:     { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard:    { flex: 1, backgroundColor: '#1a1a3e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a5a', alignItems: 'center' },
  statVal:     { color: '#e0e0ff', fontSize: 13, fontWeight: '500' },
  statLabel:   { color: '#4444aa', fontSize: 9, marginTop: 2 },
  chartCard:   { marginHorizontal: 12, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a5a', marginBottom: 12 },
  chartTitle:  { color: '#8888cc', fontSize: 11, marginBottom: 12 },
  tableCard:   { marginHorizontal: 12, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a5a' },
  tableTitle:  { color: '#8888cc', fontSize: 11, marginBottom: 8 },
  tableRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#2a2a5a' },
  tableTime:   { color: '#4444aa', fontSize: 12, fontFamily: 'monospace' },
  tableVal:    { fontSize: 13, fontWeight: '500' },
});
