import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listSensors, listAlerts } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Threshold rules per sensor key — ordered most-severe first
const THRESHOLDS = {
  temperature: [
    {
      level: 'danger',
      title: 'Fire / Overheat detected',
      body:  v => `Kitchen sensor: ${v}°C • Threshold exceeded at 60°C. Possible fire risk`,
      action: 'Emergency',
      check:  v => v >= 35,
    },
    {
      level: 'warn',
      title: 'Temperature Alert',
      body:  v => `Living room: ${v}°C — exceeded your 30°C max threshold`,
      action: 'Turn FAN ON',
      check:  v => v >= 30,
    },
  ],
  humidity: [
    {
      level: 'danger',
      title: 'Humidity Critical',
      body:  v => `Sensor: ${v}% — extremely high humidity detected`,
      action: 'Emergency',
      check:  v => v >= 90,
    },
    {
      level: 'warn',
      title: 'Humidity Alert',
      body:  v => `Sensor: ${v}% — outside comfortable range`,
      action: 'Adjust HVAC',
      check:  v => v >= 80 || v <= 30,
    },
  ],
  gas: [
    {
      level: 'danger',
      title: 'Dangerous Gas Detected',
      body:  v => `Gas sensor: ${v} — immediate ventilation required`,
      action: 'Emergency',
      check:  v => v > 800,
    },
    {
      level: 'warn',
      title: 'Gas Level Alert',
      body:  v => `Gas sensor: ${v} — elevated levels detected`,
      action: 'Ventilate',
      check:  v => v > 500,
    },
  ],
};

// Always-visible informational cards (non-sensor)
const STATIC_INFO = [
  {
    id:    'temp_bedroom',
    level: 'info',
    title: 'Temperature Alert',
    body:  'Temperature in bedroom is below the set threshold. Consider adjusting the thermostat.',
    time:  () => new Date(Date.now() - 60 * 60 * 1000),
  },
  {
    id:    'away_mode',
    level: 'info',
    title: 'Away mode is ON',
    body:  'Temperature in bedroom is below the set threshold. Consider adjusting the thermostat.',
    time:  () => new Date(Date.now() - 60 * 60 * 1000),
  },
];

const CARD_THEME = {
  danger: { bg: '#5C0A0A', border: '#8B0000' },
  warn:   { bg: '#3D1F00', border: '#7B3F00' },
  info:   { bg: '#0D2B1A', border: '#14532D' },
};

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function formatAge(date) {
  if (!date) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)   return 'Now';
  if (secs < 3600) return `${Math.floor(secs / 60)} min`;
  return `${Math.floor(secs / 3600)} hour`;
}

export default function AlertScreen() {
  const [values,       setValues]       = useState({});
  const [serverAlerts, setServerAlerts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [dismissed,    setDismissed]    = useState({});

  const analyze = useCallback(async () => {
    try {
      const [sensorsRes, alertsRes] = await Promise.allSettled([
        listSensors(),
        listAlerts(),
      ]);

      if (sensorsRes.status === 'fulfilled') {
        const vm = {};
        (sensorsRes.value.sensors ?? []).forEach(s => {
          vm[s.feed_key ?? s.key] = s.current_value ?? s.last_value ?? null;
        });
        setValues(vm);
      } else {
        console.warn('listSensors failed:', sensorsRes.reason?.message);
      }

      if (alertsRes.status === 'fulfilled') {
        setServerAlerts(Array.isArray(alertsRes.value) ? alertsRes.value : []);
      } else {
        console.warn('listAlerts failed:', alertsRes.reason?.message);
      }

      setFetchedAt(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { analyze(); }, [analyze]);

  // Backend alerts take priority; client-side thresholds fill gaps
  const backendCards = serverAlerts.map(a => ({
    id:     `srv-${a.id}`,
    level:  a.level ?? 'warn',
    title:  a.message ?? 'Alert',
    body:   `${a.sensor_key}: ${a.value}`,
    action: null,
    time:   new Date(a.created_at),
  }));

  const coveredKeys = new Set(serverAlerts.map(a => a.sensor_key));
  const fallbackCards = [];
  Object.entries(values).forEach(([key, raw]) => {
    if (coveredKeys.has(key)) return;
    const rules = THRESHOLDS[key];
    if (!rules) return;
    const num = parseFloat(raw);
    if (isNaN(num)) return;
    const rule = rules.find(r => r.check(num));
    if (rule) {
      fallbackCards.push({
        id:     key,
        level:  rule.level,
        title:  rule.title,
        body:   rule.body(num.toFixed(1)),
        action: rule.action,
        time:   fetchedAt,
      });
    }
  });

  const dynamicCards = [...backendCards, ...fallbackCards].filter(c => !dismissed[c.id]);
  const allCards = [...dynamicCards, ...STATIC_INFO.map(c => ({ ...c, time: c.time() }))];

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary.default} />
        </View>
      </SafeAreaView>
    );
  }

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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); analyze(); }}
            tintColor={Colors.primary.default}
          />
        }
      >
        {allCards.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
            <Text style={s.emptyText}>All systems normal</Text>
          </View>
        )}

        {allCards.map(card => {
          const theme = CARD_THEME[card.level] ?? CARD_THEME.info;
          return (
            <View
              key={card.id}
              style={[s.card, { backgroundColor: theme.bg, borderColor: theme.border }]}
            >
              {/* Title row */}
              <View style={s.cardTop}>
                <Text style={s.cardTitle}>{card.title}</Text>
                <Text style={s.cardTime}>{formatAge(card.time)}</Text>
              </View>

              {/* Body */}
              <Text style={s.cardBody}>{card.body}</Text>

              {/* Action buttons — only for danger / warn */}
              {(card.level === 'danger' || card.level === 'warn') && (
                <View style={s.cardActions}>
                  {card.action && (
                    <TouchableOpacity
                      style={[
                        s.actionBtn,
                        card.level === 'danger' ? s.actionDanger : s.actionWarn,
                      ]}
                    >
                      <Text style={s.actionText}>{card.action}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={s.dismissBtn}
                    onPress={() => setDismissed(p => ({ ...p, [card.id]: true }))}
                  >
                    <Text style={s.dismissText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
  },
  title: { color: Colors.text.title,   fontSize: 26, fontWeight: Typography.weight.bold },
  date:  { color: Colors.text.caption, fontSize: Typography.size.sm, marginTop: 2 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary.brand,
    alignItems: 'center', justifyContent: 'center',
  },

  list: {
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.xxxl + 20,
    gap:               Spacing.lg,
    paddingTop:        Spacing.sm,
  },

  card: {
    borderRadius: Radius.lg,
    borderWidth:  1.5,
    padding:      Spacing.xl,
  },
  cardTop: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'flex-start',
    marginBottom:   Spacing.sm,
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
  },
  cardBody: {
    color:      Colors.text.body,
    fontSize:   Typography.size.sm,
    lineHeight: 18,
  },

  cardActions: {
    flexDirection: 'row',
    gap:           Spacing.md,
    marginTop:     Spacing.lg,
    flexWrap:      'wrap',
  },
  actionBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
  },
  actionDanger: { backgroundColor: '#E57373' },
  actionWarn:   { backgroundColor: Colors.primary.default },
  actionText:   { color: Colors.text.onGold, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  dismissBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    backgroundColor:   '#6B0000',
  },
  dismissText: { color: Colors.text.title, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  emptyCard: {
    alignItems: 'center',
    padding:    Spacing.xxl,
    gap:        Spacing.lg,
  },
  emptyText: { color: Colors.text.body, fontSize: Typography.size.md },
});
