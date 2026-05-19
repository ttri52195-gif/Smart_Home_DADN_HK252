import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listAlerts } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const TIME_OPTIONS = [
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '1 day',  ms: 24 * 60 * 60 * 1000 },
];

const TYPE_OPTIONS = [
  { key: 'All',              label: 'All'         },
  { key: 'GAS_LEAK',         label: 'Gas Leak'    },
  { key: 'MOTION_DETECTED',  label: 'Motion'      },
  { key: 'DOOR_FORCED_OPEN', label: 'Door Forced' },
];

const ALERT_META = {
  GAS_LEAK:         { icon: 'flame-outline',     level: 'danger' },
  MOTION_DETECTED:  { icon: 'aperture-outline',  level: 'warn'   },
  DOOR_FORCED_OPEN: { icon: 'lock-open-outline', level: 'danger' },
};

const CARD_THEME = {
  danger: { bg: '#5C0A0A', border: '#8B0000' },
  warn:   { bg: '#3D1F00', border: '#7B3F00' },
  info:   { bg: '#0D2B1A', border: '#14532D' },
};

function formatAlertType(type) {
  if (!type) return 'Alert';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatAge(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)   return 'Now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hr ago`;
  return `${Math.floor(secs / 86400)} d ago`;
}

export default function AlertScreen() {
  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed,  setDismissed]  = useState({});
  const [timeFilter, setTimeFilter] = useState(TIME_OPTIONS[1]);
  const [typeFilter, setTypeFilter] = useState('All');

  const fetchAlerts = useCallback(async () => {
    try {
      const since = new Date(Date.now() - timeFilter.ms).toISOString();
      const res   = await listAlerts(since);
      setAlerts(Array.isArray(res) ? res : []);
    } catch (e) {
      console.warn('listAlerts failed:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
  }, [fetchAlerts]);

  // Real fields: type, msg, title, timestamp, feed_key (no id, no level)
  const visibleCards = alerts
    .filter(a => typeFilter === 'All' || a.type === typeFilter)
    .filter(a => !dismissed[`${a.feed_key}-${a.timestamp}`]);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Alerts</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity style={s.avatar}>
          <Ionicons name="person" size={18} color={Colors.text.title} />
        </TouchableOpacity>
      </View>

      {/* ── Time filter ────────────────────────────────── */}
      <View style={s.filterRow}>
        {TIME_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.label}
            style={[s.chip, timeFilter === opt && s.chipActiveTime]}
            onPress={() => setTimeFilter(opt)}
          >
            <Text style={[s.chipText, timeFilter === opt && s.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Type filter ────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={s.typeRow}
      >
        {TYPE_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            style={[s.chip, typeFilter === opt.key && s.chipActiveType]}
            onPress={() => setTypeFilter(opt.key)}
          >
            {opt.key !== 'All' && ALERT_META[opt.key] && (
              <Ionicons
                name={ALERT_META[opt.key].icon}
                size={12}
                color={typeFilter === opt.key ? Colors.text.onGold : Colors.text.caption}
              />
            )}
            <Text style={[s.chipText, typeFilter === opt.key && s.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Alert list ─────────────────────────────────── */}
      <View style={{ flex: 1 }}>
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary.default} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchAlerts(); }}
              tintColor={Colors.primary.default}
            />
          }
        >
          {visibleCards.length === 0 && (
            <View style={s.emptyCard}>
              <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
              <Text style={s.emptyText}>No alerts in this period</Text>
            </View>
          )}

          {visibleCards.map(alert => {
            const cardKey = `${alert.feed_key}-${alert.timestamp}`;
            const meta    = ALERT_META[alert.type] ?? { icon: 'warning-outline', level: 'warn' };
            const theme   = CARD_THEME[meta.level] ?? CARD_THEME.warn;

            return (
              <View
                key={cardKey}
                style={[s.card, { backgroundColor: theme.bg, borderColor: theme.border }]}
              >
                {/* Title row */}
                <View style={s.cardTop}>
                  <Ionicons name={meta.icon} size={16} color={Colors.text.title} style={{ marginRight: Spacing.sm, marginTop: 2 }} />
                  <Text style={s.cardTitle}>{formatAlertType(alert.type)}</Text>
                  <Text style={s.cardTime}>{formatAge(new Date(alert.timestamp))}</Text>
                </View>

                {/* Body */}
                {!!alert.msg && (
                  <Text style={s.cardBody}>{alert.msg}</Text>
                )}

                {/* Dismiss */}
                <View style={s.cardActions}>
                  <TouchableOpacity
                    style={s.dismissBtn}
                    onPress={() => setDismissed(p => ({ ...p, [cardKey]: true }))}
                  >
                    <Text style={s.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.surface.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
  },
  title:  { color: Colors.text.title,   fontSize: 26, fontWeight: Typography.weight.bold },
  date:   { color: Colors.text.caption, fontSize: Typography.size.sm, marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  filterRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.sm,
    marginBottom:      Spacing.sm,
  },
  typeRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.sm,
    paddingBottom:     Spacing.lg,
  },
  chip: {
    alignSelf:         'flex-start',
    flexDirection:     'row',
    alignItems:        'center',
    gap:               3,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.card,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  chipActiveTime: { backgroundColor: Colors.surface.elevated, borderColor: Colors.text.caption },
  chipActiveType: { backgroundColor: Colors.primary.default,  borderColor: Colors.primary.default },
  chipText:       { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  chipTextActive: { color: Colors.text.onGold },

  list: {
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.lg,
    paddingTop:        Spacing.sm,
  },

  card: {
    borderRadius: Radius.lg,
    borderWidth:  1.5,
    padding:      Spacing.xl,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    marginBottom:  Spacing.sm,
  },
  cardTitle: {
    flex:       1,
    color:      Colors.text.title,
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  cardTime: {
    color:      Colors.text.caption,
    fontSize:   Typography.size.xs,
    marginLeft: Spacing.md,
    marginTop:  2,
  },
  cardBody: {
    color:      Colors.text.body,
    fontSize:   Typography.size.sm,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop:     Spacing.md,
  },
  dismissBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  dismissText: { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap:        Spacing.lg,
  },
  emptyText: { color: Colors.text.body, fontSize: Typography.size.md },
});
