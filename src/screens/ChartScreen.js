import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getFeedHistory } from '../services/adafruitIO';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.xl * 2;
const CHART_H = 160;

const FEEDS = [
  { key: 'temperature', label: 'Temperature', unit: '°C', color: Colors.data.temperature, icon: 'thermometer-outline' },
  { key: 'humidity',    label: 'Humidity',    unit: '%',  color: Colors.data.humidity,    icon: 'water-outline'       },
  { key: 'themis',      label: 'Light',       unit: '%',  color: Colors.data.light,       icon: 'sunny-outline'       },
];

const REFRESH_INTERVAL = 30; // seconds

// ── Minimal line chart (pure RN, no SVG library) ─────────────────
function LineChart({ data, color }) {
  if (!data || data.length < 2) {
    return (
      <View style={[chart.wrap, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: Colors.text.caption, fontSize: Typography.size.sm }}>No data</Text>
      </View>
    );
  }

  const values = data.map(d => d.value);
  const min    = Math.min(...values);
  const max    = Math.max(...values);
  const range  = max - min || 1;

  const toY = v => CHART_H - ((v - min) / range) * (CHART_H - 20) - 10;
  const toX = i => (i / (data.length - 1)) * (CHART_W - 32);

  const tickLabels = [max, (max + min) / 2, min].map(v => v.toFixed(1));

  const firstTime = data[0].time;
  const lastTime  = data[data.length - 1].time;
  const midTime   = data[Math.floor(data.length / 2)].time;
  const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={chart.wrap}>
      {/* Y-axis labels */}
      <View style={chart.yAxis}>
        {tickLabels.map((t, i) => (
          <Text key={i} style={chart.yLabel}>{t}</Text>
        ))}
      </View>

      {/* Plot area */}
      <View style={chart.plotArea}>
        {/* Grid lines */}
        {[0, 0.5, 1].map(f => (
          <View key={f} style={[chart.gridLine, { top: f * (CHART_H - 20) }]} />
        ))}

        {/* Line segments */}
        {data.slice(0, -1).map((pt, i) => {
          const x1 = toX(i);       const y1 = toY(pt.value);
          const x2 = toX(i + 1);   const y2 = toY(data[i + 1].value);
          const dx = x2 - x1;      const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);
          return (
            <View
              key={i}
              style={{
                position:   'absolute',
                left:       x1,
                top:        y1,
                width:      len,
                height:     2,
                backgroundColor: color,
                opacity:    0.85,
                transform:  [{ rotate: `${angle}deg` }],
                transformOrigin: 'left center',
              }}
            />
          );
        })}

        {/* Data points */}
        {data.map((pt, i) => (
          <View
            key={i}
            style={[chart.dot, { left: toX(i) - 3, top: toY(pt.value) - 3, backgroundColor: color }]}
          />
        ))}
      </View>

      {/* X-axis time labels */}
      <View style={chart.xAxis}>
        <Text style={chart.xLabel}>{fmt(firstTime)}</Text>
        <Text style={chart.xLabel}>{fmt(midTime)}</Text>
        <Text style={chart.xLabel}>{fmt(lastTime)}</Text>
      </View>
    </View>
  );
}

const chart = StyleSheet.create({
  wrap:     { marginTop: Spacing.md },
  yAxis: {
    position: 'absolute',
    left: 0, top: 0,
    height: CHART_H,
    width: 32,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  yLabel:   { color: Colors.text.caption, fontSize: 9, textAlign: 'right' },
  plotArea: { marginLeft: 36, height: CHART_H, position: 'relative', overflow: 'hidden' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: Colors.surface.elevated },
  dot:      { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  xAxis:    { marginLeft: 36, flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  xLabel:   { color: Colors.text.caption, fontSize: 9 },
});

// ── Screen ────────────────────────────────────────────────────────
export default function ChartScreen() {
  const [selected,    setSelected]    = useState(FEEDS[0].key);
  const [history,     setHistory]     = useState({});
  const [loading,     setLoading]     = useState(true);
  const [countdown,   setCountdown]   = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(null);

  const feed = FEEDS.find(f => f.key === selected);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFeedHistory(selected, 30);
      setHistory(prev => ({ ...prev, [selected]: data }));
    } catch (e) {
      console.warn(e.message);
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, [selected]);

  useEffect(() => {
    fetchHistory();
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { fetchHistory(); return REFRESH_INTERVAL; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(countdownRef.current);
  }, [fetchHistory]);

  const data = history[selected] ?? [];

  // Statistics
  const values = data.map(d => d.value).filter(v => !isNaN(v));
  const stats = values.length
    ? {
        current: values[values.length - 1].toFixed(1),
        min:     Math.min(...values).toFixed(1),
        max:     Math.max(...values).toFixed(1),
        avg:     (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
      }
    : null;

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Charts</Text>
        <TouchableOpacity onPress={fetchHistory} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻ {countdown}s</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Feed selector */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {FEEDS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[s.tab, selected === f.key && s.tabActive]}
              onPress={() => setSelected(f.key)}
              activeOpacity={0.8}
            >
              <Ionicons name={f.icon} size={16} color={selected === f.key ? Colors.text.onGold : Colors.text.caption} />
              <Text style={[s.tabLabel, selected === f.key && { color: Colors.text.onGold }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Stats row */}
        {stats && (
          <View style={s.statsRow}>
            {[
              { label: 'Current', value: `${stats.current}${feed.unit}` },
              { label: 'Min',     value: `${stats.min}${feed.unit}` },
              { label: 'Max',     value: `${stats.max}${feed.unit}` },
              { label: 'Avg',     value: `${stats.avg}${feed.unit}` },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statValue, { color: feed.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>{feed.label} — last {data.length} readings</Text>
          {loading
            ? <View style={{ height: CHART_H + 30, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={feed.color} />
              </View>
            : <LineChart data={data} color={feed.color} />
          }
        </View>

        {/* Raw data table */}
        {data.length > 0 && (
          <View style={s.tableCard}>
            <Text style={s.tableTitle}>Recent readings</Text>
            {data.slice(-8).reverse().map((pt, i) => (
              <View key={i} style={[s.tableRow, i > 0 && s.tableRowBorder]}>
                <Text style={[s.tableVal, { color: feed.color }]}>{pt.value.toFixed(2)}{feed.unit}</Text>
                <Text style={s.tableTime}>
                  {pt.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.base },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    backgroundColor:  Colors.surface.overlay,
  },
  headerTitle: { flex: 1, fontSize: Typography.size.xl, color: Colors.text.title, fontWeight: Typography.weight.bold },
  refreshBtn:  { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface.elevated },
  refreshText: { color: Colors.primary.default, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  tabs: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, gap: Spacing.md },
  tab: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.card,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
    gap:               Spacing.sm,
  },
  tabActive:  { backgroundColor: Colors.primary.default, borderColor: Colors.primary.default },
  tabLabel:   { fontSize: Typography.size.sm, color: Colors.text.body, fontWeight: Typography.weight.medium },

  statsRow: {
    flexDirection:    'row',
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.md,
    marginBottom:      Spacing.md,
  },
  statCard: {
    flex:            1,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.md,
    padding:         Spacing.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.surface.elevated,
  },
  statValue: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  statLabel: { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },

  chartCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    padding:          Spacing.lg,
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
    marginBottom:     Spacing.lg,
  },
  chartTitle: { fontSize: Typography.size.sm, color: Colors.text.caption, marginBottom: Spacing.md },

  tableCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
    marginBottom:     Spacing.lg,
  },
  tableTitle: {
    fontSize:        Typography.size.xs,
    color:           Colors.text.caption,
    fontWeight:      Typography.weight.semibold,
    letterSpacing:   1,
    textTransform:   'uppercase',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.elevated,
  },
  tableRow: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface.elevated },
  tableVal:  { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  tableTime: { fontSize: Typography.size.xs, color: Colors.text.caption },
});
