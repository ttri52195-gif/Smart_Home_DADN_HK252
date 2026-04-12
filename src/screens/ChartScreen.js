import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { getFeedHistory } from '../services/adafruitIO';

const W = Dimensions.get('window').width - 48;

const FEEDS = [
  { key: 'temperature', label: 'Nhiệt độ', unit: '°C', color: '#ff8888', icon: '🌡️' },
  { key: 'humidity',    label: 'Độ ẩm',    unit: '%',  color: '#66ccff', icon: '💧' },
  { key: 'themis',      label: 'Ánh sáng', unit: '%',  color: '#ffdd44', icon: '☀️' },
];

const REFRESH_INTERVAL = 5000; // 5 giây

function LineChart({ data, color }) {
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
  const ticks = [minV, (minV + maxV) / 2, maxV];

  const fmt = (d) => {
    if (!d?.time) return '';
    return d.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ width: W, height: H + 8 }}>
      {ticks.map((t, i) => (
        <Text key={i} style={{
          position: 'absolute', left: 0, top: toY(t) - 6,
          width: PAD.left - 4, fontSize: 9, color: '#4444aa', textAlign: 'right',
        }}>
          {t.toFixed(1)}
        </Text>
      ))}
      {ticks.map((t, i) => (
        <View key={i} style={{
          position: 'absolute', left: PAD.left, top: toY(t),
          width: cW, height: 0.5, backgroundColor: '#2a2a5a',
        }} />
      ))}
      {data.slice(0, -1).map((d, i) => {
        const x1 = toX(i), y1 = toY(d.value);
        const x2 = toX(i + 1), y2 = toY(data[i + 1].value);
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        return (
          <View key={i} style={{
            position: 'absolute', left: x1, top: y1,
            width: len, height: 2, backgroundColor: color,
            borderRadius: 1, opacity: 0.85,
            transform: [{ rotate: `${angle}deg` }, { translateY: -1 }],
            transformOrigin: '0 0',
          }} />
        );
      })}
      {data.map((d, i) => (
        <View key={i} style={{
          position: 'absolute', left: toX(i) - 3, top: toY(d.value) - 3,
          width: 6, height: 6, borderRadius: 3, backgroundColor: color,
        }} />
      ))}
      {[0, Math.floor((data.length - 1) / 2), data.length - 1].map((idx) => (
        <Text key={idx} style={{
          position: 'absolute', left: toX(idx) - 18, top: H - 16,
          width: 36, fontSize: 8, color: '#4444aa', textAlign: 'center',
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
  const [lastUpdated, setLastUpdated] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  const intervalRef = useRef(null);
  const countdownRef = useRef(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const feed = FEEDS.find(f => f.key === selected);

  const loadData = useCallback(async (key, showLoading = false) => {
    if (showLoading) setLoading(true);
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
            avg: (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1),
            last: vals[vals.length - 1].toFixed(1),
          },
        }));
      }
      if (key === selectedRef.current) {
        setLastUpdated(new Date());
        setCountdown(REFRESH_INTERVAL / 1000);
      }
    } catch {
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Auto-refresh mỗi 5 giây
  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    intervalRef.current = setInterval(() => {
      loadData(selectedRef.current);
    }, REFRESH_INTERVAL);

    countdownRef.current = setInterval(() => {
      setCountdown(c => (c <= 1 ? REFRESH_INTERVAL / 1000 : c - 1));
    }, 1000);
  }, [loadData]);

  useEffect(() => {
    loadData(selected, true);
    startAutoRefresh();
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(countdownRef.current);
    };
  }, [selected]);

  const handleManualRefresh = () => {
    setCountdown(REFRESH_INTERVAL / 1000);
    loadData(selected, true);
    startAutoRefresh();
  };

  const st = stats[selected];
  const fmt = (d) => d?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />

      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Biểu đồ lịch sử</Text>
          {lastUpdated && (
            <Text style={s.headerSub}>Cập nhật lúc {fmt(lastUpdated)}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          {/* Countdown ring */}
          <View style={s.countdownBadge}>
            <Text style={s.countdownTxt}>↻ {countdown}s</Text>
          </View>
          <TouchableOpacity style={s.refreshBtn} onPress={handleManualRefresh} disabled={loading}>
            {loading
              ? <ActivityIndicator size="small" color="#6366f1" />
              : <Text style={s.refreshTxt}>Làm mới ngay</Text>
            }
          </TouchableOpacity>
        </View>
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
              { label: 'Hiện tại',   val: `${st.last}${feed.unit}` },
              { label: 'Thấp nhất',  val: `${st.min}${feed.unit}` },
              { label: 'Cao nhất',   val: `${st.max}${feed.unit}` },
              { label: 'Trung bình', val: `${st.avg}${feed.unit}` },
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.chartTitle}>{feed.icon} {feed.label} — 30 điểm gần nhất</Text>
            {loading && <ActivityIndicator size="small" color={feed.color} />}
          </View>
          <LineChart data={history[selected]} color={feed.color} unit={feed.unit} />
        </View>

        {/* Raw data table */}
        {history[selected]?.length > 0 && (
          <View style={s.tableCard}>
            <Text style={s.tableTitle}>Dữ liệu gần đây</Text>
            {history[selected].slice(-8).reverse().map((d, i) => (
              <View key={i} style={[s.tableRow, i === 0 && { borderLeftWidth: 2, borderLeftColor: feed.color, paddingLeft: 8 }]}>
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
  safe:           { flex: 1, backgroundColor: '#0f0f1a' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle:    { color: '#e0e0ff', fontSize: 18, fontWeight: '500' },
  headerSub:      { color: '#4444aa', fontSize: 10, marginTop: 2 },
  countdownBadge: { backgroundColor: '#1a1a3e', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: '#2a2a6a' },
  countdownTxt:   { color: '#6366f1', fontSize: 11 },
  refreshBtn:     { backgroundColor: '#1a1a3e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a6a', minWidth: 90, alignItems: 'center' },
  refreshTxt:     { color: '#6366f1', fontSize: 11 },
  tabRow:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#222', marginBottom: 8 },
  tab:            { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabTxt:         { color: '#4444aa', fontSize: 11 },
  statRow:        { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard:       { flex: 1, backgroundColor: '#1a1a3e', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#2a2a5a', alignItems: 'center' },
  statVal:        { color: '#e0e0ff', fontSize: 13, fontWeight: '500' },
  statLabel:      { color: '#4444aa', fontSize: 9, marginTop: 2 },
  chartCard:      { marginHorizontal: 12, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2a5a', marginBottom: 12 },
  chartTitle:     { color: '#8888cc', fontSize: 11 },
  tableCard:      { marginHorizontal: 12, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a5a' },
  tableTitle:     { color: '#8888cc', fontSize: 11, marginBottom: 8 },
  tableRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#2a2a5a' },
  tableTime:      { color: '#4444aa', fontSize: 12, fontFamily: 'monospace' },
  tableVal:       { fontSize: 13, fontWeight: '500' },
});