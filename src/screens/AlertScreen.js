import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listSensors } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Threshold rules ────────────────────────────────────────────────
const THRESHOLDS = {
  temperature: [
    { level: 'danger', msg: 'Extreme heat',    check: v => v >= 35 },
    { level: 'warn',   msg: 'High temperature', check: v => v >= 30 },
    { level: 'ok',     msg: 'Normal',           check: () => true },
  ],
  humidity: [
    { level: 'danger', msg: 'Very humid',       check: v => v >= 90 },
    { level: 'warn',   msg: 'High humidity',    check: v => v >= 80 },
    { level: 'warn',   msg: 'Low humidity',     check: v => v <= 30 },
    { level: 'ok',     msg: 'Normal',           check: () => true },
  ],
  gas: [
    { level: 'danger', msg: 'Dangerous gas',    check: v => v > 800 },
    { level: 'warn',   msg: 'Elevated gas',     check: v => v > 500 },
    { level: 'ok',     msg: 'Air quality OK',   check: () => true },
  ],
  rain: [
    { level: 'warn',   msg: 'Heavy rain',       check: v => v > 600 },
    { level: 'warn',   msg: 'Rain detected',    check: v => v > 200 },
    { level: 'ok',     msg: 'Dry',              check: () => true },
  ],
  themis: [
    { level: 'danger', msg: 'Very dark',        check: v => v <= 10 },
    { level: 'warn',   msg: 'Low light',        check: v => v <= 20 },
    { level: 'ok',     msg: 'Light OK',         check: () => true },
  ],
};

const SENSOR_META = {
  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer-outline', color: Colors.data.temperature },
  humidity:    { label: 'Humidity',    unit: '%',  icon: 'water-outline',        color: Colors.data.humidity },
  gas:         { label: 'Gas',         unit: '',   icon: 'warning-outline',      color: Colors.data.gas },
  rain:        { label: 'Rain',        unit: '',   icon: 'rainy-outline',         color: Colors.data.rain },
  themis:      { label: 'Light',       unit: '%',  icon: 'sunny-outline',         color: Colors.data.light },
};

const LEVEL_STYLE = {
  ok:     { bg: Colors.success + '18', border: Colors.success,       badge: Colors.success,       text: Colors.success },
  warn:   { bg: Colors.warning + '18', border: Colors.warning,       badge: Colors.warning,       text: Colors.warning },
  danger: { bg: Colors.error   + '18', border: Colors.error,         badge: Colors.error,         text: Colors.error   },
};

function getLevel(key, value) {
  const rules = THRESHOLDS[key] ?? [];
  const num   = parseFloat(value);
  if (isNaN(num)) return { level: 'ok', msg: 'No data' };
  return rules.find(r => r.check(num)) ?? { level: 'ok', msg: 'Normal' };
}

// ── Component ─────────────────────────────────────────────────────
export default function AlertScreen() {
  const [values,     setValues]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const analyze = useCallback(async () => {
    try {
      const res = await listSensors();
      const vm  = {};
      (res.sensors ?? []).forEach(s => { vm[s.key] = s.last_value ?? s.value ?? null; });
      setValues(vm);
      setLastUpdate(new Date());
    } catch (e) {
      console.warn(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { analyze(); }, [analyze]);

  const onRefresh = () => { setRefreshing(true); analyze(); };

  // Build sensor status list + collect alerts
  const sensorKeys  = Object.keys(SENSOR_META);
  const alertItems  = sensorKeys
    .map(key => {
      const meta    = SENSOR_META[key];
      const raw     = values[key];
      const { level, msg } = getLevel(key, raw);
      return { key, meta, raw, level, msg };
    })
    .filter(item => item.level !== 'ok');

  const statusItems = sensorKeys.map(key => {
    const meta = SENSOR_META[key];
    const raw  = values[key];
    const { level, msg } = getLevel(key, raw);
    return { key, meta, raw, level, msg };
  });

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}><ActivityIndicator size="large" color={Colors.primary.default} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Alerts</Text>
        <TouchableOpacity onPress={onRefresh} style={s.refreshBtn}>
          <Text style={s.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.default} />}
      >
        {lastUpdate && (
          <Text style={s.lastUpdate}>
            Updated {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        )}

        {/* ── Current Status ─────────────────────────────── */}
        <Text style={s.sectionTitle}>Current Status</Text>
        <View style={s.statusGrid}>
          {statusItems.map(({ key, meta, raw, level, msg }) => {
            const ls  = LEVEL_STYLE[level];
            const num = parseFloat(raw);
            const display = isNaN(num) ? '—' : `${num.toFixed(1)}${meta.unit}`;
            return (
              <View key={key} style={[s.statusCard, { backgroundColor: ls.bg, borderColor: ls.border }]}>
                <Ionicons name={meta.icon} size={24} color={ls.text} style={{ marginBottom: Spacing.sm }} />
                <Text style={[s.statusValue, { color: ls.text }]}>{display}</Text>
                <Text style={s.statusLabel}>{meta.label}</Text>
                <View style={[s.levelBadge, { backgroundColor: ls.badge }]}>
                  <Text style={s.levelText}>{level.toUpperCase()}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Active Alerts ──────────────────────────────── */}
        <Text style={s.sectionTitle}>Active Alerts</Text>
        {alertItems.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.success} style={{ marginBottom: Spacing.md }} />
            <Text style={s.emptyText}>All sensors within normal range</Text>
          </View>
        ) : (
          <View style={s.alertList}>
            {alertItems.map(({ key, meta, raw, level, msg }) => {
              const ls  = LEVEL_STYLE[level];
              const num = parseFloat(raw);
              const display = isNaN(num) ? '—' : `${num.toFixed(1)}${meta.unit}`;
              return (
                <View key={key} style={[s.alertCard, { backgroundColor: ls.bg, borderLeftColor: ls.border }]}>
                  <View style={s.alertLeft}>
                    <Ionicons name={meta.icon} size={22} color={ls.text} />
                    <View>
                      <Text style={[s.alertMsg, { color: ls.text }]}>{msg}</Text>
                      <Text style={s.alertSub}>{meta.label} · {display}</Text>
                    </View>
                  </View>
                  <View style={[s.levelBadge, { backgroundColor: ls.badge }]}>
                    <Text style={s.levelText}>{level.toUpperCase()}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Threshold Reference ────────────────────────── */}
        <Text style={s.sectionTitle}>Threshold Reference</Text>
        <View style={s.refCard}>
          {[
            { label: 'Temperature', warn: '≥ 30 °C', danger: '≥ 35 °C' },
            { label: 'Humidity',    warn: '≥ 80 % or ≤ 30 %', danger: '≥ 90 %' },
            { label: 'Gas',         warn: '> 500',   danger: '> 800' },
            { label: 'Rain',        warn: '> 200',   danger: '> 600' },
            { label: 'Light',       warn: '≤ 20 %',  danger: '≤ 10 %' },
          ].map((row, i) => (
            <View key={row.label} style={[s.refRow, i > 0 && s.refRowBorder]}>
              <Text style={s.refLabel}>{row.label}</Text>
              <View style={s.refCols}>
                <Text style={[s.refVal, { color: Colors.warning }]}>⚠ {row.warn}</Text>
                <Text style={[s.refVal, { color: Colors.error   }]}>🔴 {row.danger}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    backgroundColor:  Colors.surface.overlay,
  },
  headerTitle: { flex: 1, fontSize: Typography.size.xl, color: Colors.text.title, fontWeight: Typography.weight.bold },
  refreshBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.elevated,
  },
  refreshText: { color: Colors.primary.default, fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  lastUpdate: {
    fontSize:        Typography.size.xs,
    color:           Colors.text.caption,
    textAlign:       'center',
    marginTop:       Spacing.md,
  },

  sectionTitle: {
    fontSize:      Typography.size.xs,
    color:         Colors.text.caption,
    fontWeight:    Typography.weight.semibold,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginLeft:    Spacing.xl,
    marginTop:     Spacing.xl,
    marginBottom:  Spacing.md,
  },

  // Status grid (2-col)
  statusGrid: {
    flexDirection:     'row',
    flexWrap:          'wrap',
    paddingHorizontal: Spacing.lg,
    gap:               Spacing.md,
    marginBottom:      Spacing.md,
  },
  statusCard: {
    flex:         1,
    minWidth:     '44%',
    borderRadius: Radius.lg,
    padding:      Spacing.lg,
    alignItems:   'center',
    borderWidth:  1.5,
  },
  statusValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  statusLabel: { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2, marginBottom: Spacing.sm },

  levelBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   2,
    borderRadius:      Radius.full,
  },
  levelText: { color: '#fff', fontSize: 9, fontWeight: Typography.weight.bold, letterSpacing: 0.5 },

  // Alert cards
  alertList: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  alertCard: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    padding:        Spacing.lg,
    borderLeftWidth: 4,
  },
  alertLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  alertMsg:  { fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  alertSub:  { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },

  // Empty state
  emptyCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    padding:          Spacing.xxl,
    alignItems:       'center',
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
  },
  emptyText: { color: Colors.text.body, fontSize: Typography.size.md },

  // Threshold reference
  refCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
  },
  refRow: { padding: Spacing.lg },
  refRowBorder: { borderTopWidth: 1, borderTopColor: Colors.surface.elevated },
  refLabel: { fontSize: Typography.size.sm, color: Colors.text.subtitle, fontWeight: Typography.weight.medium, marginBottom: Spacing.xs },
  refCols:  { flexDirection: 'row', gap: Spacing.xl },
  refVal:   { fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
});
