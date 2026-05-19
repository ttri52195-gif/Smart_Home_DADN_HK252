import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listSensors, getSensorData } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - Spacing.xl * 2;
const CHART_H = 160;

const SENSOR_META = {
  temperature: { icon: 'thermometer-outline', color: Colors.data.temperature, unit: '°C' },
  humidity:    { icon: 'water-outline',       color: Colors.data.humidity,    unit: '%'  },
  rain:        { icon: 'rainy-outline',       color: Colors.data.light,       unit: ''   },
  gas:         { icon: 'flame-outline',       color: Colors.error,            unit: ''   },
  themis:      { icon: 'sunny-outline',       color: Colors.data.light,       unit: '%'  },
};
const DEFAULT_META = { icon: 'analytics-outline', color: Colors.text.body, unit: '' };

const TIME_RANGES = [
  { label: '5 min',  ms: 5  * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '1 day',  ms: 24 * 60 * 60 * 1000 },
];

function toApiTime(date) {
  return date.toISOString().slice(0, 19);
}

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

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

// ── Screen ────────────────────────────────────────────────────────
export default function ChartScreen() {
  const { token } = useAuth();
  const [sensors,   setSensors]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [timeRange, setTimeRange] = useState(TIME_RANGES[0]);
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    listSensors()
      .then(res => {
        const list = res.sensors ?? [];
        setSensors(list);
        if (list.length > 0 && !selected) setSelected(list[0].feed_key);
      })
      .catch(e => console.warn('listSensors failed:', e.message));
  }, []);

  const fetchData = useCallback(async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const end   = new Date();
      const start = new Date(end.getTime() - timeRange.ms);
      const res   = await getSensorData(token, selected, toApiTime(start), toApiTime(end));
      const rows = Array.isArray(res) ? res : (res?.data ?? []);
      const normalized = rows
        .map(d => ({ value: parseFloat(d.value), time: new Date(d.timestamp ?? d.created_at ?? d.time) }))
        .filter(d => !isNaN(d.value) && !isNaN(d.time));
      setData(normalized);
    } catch (e) {
      console.warn('getSensorData failed:', e.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [token, selected, timeRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const meta   = SENSOR_META[selected] ?? DEFAULT_META;
  const sensor = sensors.find(s => s.feed_key === selected);

  const values = data.map(d => d.value).filter(v => !isNaN(v));
  const stats  = values.length ? {
    current: values[values.length - 1].toFixed(1),
    min:     Math.min(...values).toFixed(1),
    max:     Math.max(...values).toFixed(1),
    avg:     (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
  } : null;

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Charts</Text>
          <Text style={s.headerDate}>{formatDate()}</Text>
        </View>
        <TouchableOpacity onPress={fetchData} style={s.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color={Colors.primary.default} />
        </TouchableOpacity>
      </View>

      {/* ── Sensor chips ───────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={s.chipRow}
      >
        {sensors.map(sensor => {
          const m   = SENSOR_META[sensor.feed_key] ?? DEFAULT_META;
          const active = selected === sensor.feed_key;
          return (
            <TouchableOpacity
              key={sensor.feed_key}
              style={[s.chip, active && s.chipActiveSensor]}
              onPress={() => setSelected(sensor.feed_key)}
            >
              <Ionicons
                name={m.icon}
                size={14}
                color={active ? Colors.text.onGold : Colors.text.caption}
              />
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {sensor.name ?? sensor.feed_key}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Time range chips ───────────────────────────── */}
      <View style={s.timeRow}>
        {TIME_RANGES.map(range => {
          const active = timeRange === range;
          return (
            <TouchableOpacity
              key={range.label}
              style={[s.chip, active && s.chipActiveTime]}
              onPress={() => setTimeRange(range)}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{range.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ────────────────────────────────────── */}
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Stats row */}
        {stats && (
          <View style={s.statsRow}>
            {[
              { label: 'Current', value: `${stats.current}${meta.unit}` },
              { label: 'Min',     value: `${stats.min}${meta.unit}`     },
              { label: 'Max',     value: `${stats.max}${meta.unit}`     },
              { label: 'Avg',     value: `${stats.avg}${meta.unit}`     },
            ].map(stat => (
              <View key={stat.label} style={s.statCard}>
                <Text style={[s.statValue, { color: meta.color }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Chart */}
        <View style={s.chartCard}>
          <Text style={s.chartTitle}>
            {sensor?.name ?? selected} — last {timeRange.label}
            {data.length > 0 ? ` (${data.length} pts)` : ''}
          </Text>
          {loading
            ? <View style={{ height: CHART_H + 30, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={meta.color} />
              </View>
            : <LineChart data={data} color={meta.color} />
          }
        </View>

        {/* Raw data table */}
        {data.length > 0 && (
          <View style={s.tableCard}>
            <Text style={s.tableTitle}>Recent readings</Text>
            {data.slice(-8).reverse().map((pt, i) => (
              <View key={i} style={[s.tableRow, i > 0 && s.tableRowBorder]}>
                <Text style={[s.tableVal, { color: meta.color }]}>
                  {pt.value.toFixed(2)}{meta.unit}
                </Text>
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
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
  },
  headerTitle: { fontSize: 26, color: Colors.text.title, fontWeight: Typography.weight.bold },
  headerDate:  { color: Colors.text.caption, fontSize: Typography.size.sm, marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  chipRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.md,
    gap:               Spacing.sm,
  },
  timeRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.sm,
    marginBottom:      Spacing.md,
  },
  chip: {
    alignSelf:         'flex-start',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               4,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.card,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  chipActiveSensor: { backgroundColor: Colors.primary.default, borderColor: Colors.primary.default },
  chipActiveTime:   { backgroundColor: Colors.surface.elevated, borderColor: Colors.text.caption },
  chipText:         { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  chipTextActive:   { color: Colors.text.onGold },

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
    fontSize:          Typography.size.xs,
    color:             Colors.text.caption,
    fontWeight:        Typography.weight.semibold,
    letterSpacing:     1,
    textTransform:     'uppercase',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.elevated,
  },
  tableRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    alignItems:        'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
  },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface.elevated },
  tableVal:  { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },
  tableTime: { fontSize: Typography.size.xs, color: Colors.text.caption },
});
