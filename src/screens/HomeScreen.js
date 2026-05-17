import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listSensors, listDevices, setDeviceState } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.xl * 2 - Spacing.md) / 2;

const SENSOR_STRIP = [
  { key: 'temperature', label: 'Temp',     unit: '°C', icon: 'thermometer-outline', color: Colors.data.temperature },
  { key: 'humidity',    label: 'Humidity', unit: '%',  icon: 'water-outline',       color: Colors.data.humidity    },
  { key: 'themis',      label: 'Lux',      unit: '',   icon: 'sunny-outline',       color: Colors.data.light       },
];

const QUICK_CARDS = [
  {
    key:         'lb1',
    label:       'Lights',
    room:        'Living room',
    icon:        'bulb-outline',
    iconActive:  'bulb',
    activeColor: Colors.primary.default,
    borderColor: 'rgba(228,181,24,0.55)',
    toggleColor: Colors.success,
  },
  {
    key:         'door',
    label:       'Front Door Lock',
    room:        'Garden',
    icon:        'lock-closed-outline',
    iconActive:  'lock-closed',
    isDoor:      true,
    activeColor: Colors.success,
    borderColor: 'rgba(39,174,96,0.45)',
    toggleColor: Colors.success,
  },
  {
    key:         'pir',
    label:       'Fan',
    room:        'Living room',
    icon:        'aperture-outline',
    iconActive:  'aperture',
    isAuto:      true,
    activeColor: Colors.state.auto,
    borderColor: 'rgba(139,92,246,0.55)',
    toggleColor: Colors.state.auto,
  },
  {
    key:         'rgb',
    label:       'Curtains',
    room:        'Living room',
    icon:        'reorder-three-outline',
    iconActive:  'reorder-three',
    activeColor: Colors.success,
    borderColor: 'rgba(39,174,96,0.3)',
    toggleColor: Colors.success,
  },
];

function parseBool(val) {
  const v = String(val ?? '').toUpperCase();
  return v === 'ON' || v === '1' || v === 'TRUE' || v === 'OPEN';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function sensorStatus(key, raw) {
  const n = parseFloat(raw);
  if (raw == null || isNaN(n)) return null;
  if (key === 'temperature') {
    if (n >= 35) return { text: 'Critical', color: Colors.error };
    if (n >= 30) return { text: 'Warn',     color: Colors.warning };
    return { text: 'Normal', color: Colors.success };
  }
  if (key === 'humidity') {
    if (n < 30 || n > 80) return { text: 'Warn',   color: Colors.warning };
    return { text: 'Normal', color: Colors.success };
  }
  if (key === 'themis') {
    if (n < 10)  return { text: 'Dark',   color: Colors.warning };
    if (n > 800) return { text: 'Bright', color: Colors.warning };
    return { text: 'OK', color: Colors.success };
  }
  return { text: 'OK', color: Colors.success };
}

function Toggle({ value, color = Colors.success, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[s.toggle, { backgroundColor: value ? color : Colors.surface.elevated }]}
    >
      <View style={[s.toggleKnob, { left: value ? 20 : 3 }]} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const { token, user } = useAuth();

  const [sensors,    setSensors]    = useState({});
  const [devices,    setDevices]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdLoading, setCmdLoading] = useState({});
  const [logs,       setLogs]       = useState([]);

  const pollRef = useRef(null);
  const avatarLetter = (user?.username ?? 'U')[0].toUpperCase();

  function addLog(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ ts, msg, type }, ...prev].slice(0, 6));
  }

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([listSensors(), listDevices()]);
      const sm = {};
      (sRes.sensors ?? []).forEach(s => { sm[s.feed_key] = s.current_value ?? null; });
      setSensors(sm);
      const dm = {};
      (dRes.devices ?? []).forEach(d => { dm[d.feed_key ?? d.key] = d.value ?? d.last_value ?? null; });
      setDevices(dm);
    } catch (e) {
      console.warn('Poll error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    pollRef.current = setInterval(fetchAll, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchAll]);

  async function handleToggle(key) {
    const next = parseBool(devices[key]) ? 'OFF' : 'ON';
    setCmdLoading(p => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, next, token);
      setDevices(p => ({ ...p, [key]: next }));
      const label = QUICK_CARDS.find(c => c.key === key)?.label ?? key;
      addLog(`${label} turned ${next}`, next === 'ON' ? 'ok' : 'info');
    } catch (e) {
      addLog('Command failed', 'warn');
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleDoor(next) {
    setCmdLoading(p => ({ ...p, door: true }));
    try {
      await setDeviceState('door', next, token);
      setDevices(p => ({ ...p, door: next }));
      addLog(`Door ${next === 'OPEN' ? 'unlocked' : 'locked'}`, next === 'OPEN' ? 'warn' : 'ok');
    } catch (e) {
      addLog('Door command failed', 'warn');
    } finally {
      setCmdLoading(p => ({ ...p, door: false }));
    }
  }

  const activeCount = QUICK_CARDS.filter(c => parseBool(devices[c.key])).length;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary.default} />
          <Text style={s.loadingText}>Connecting to home…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting()}</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity
          style={s.avatar}
          onPress={() => navigation?.navigate('AccountSettings')}
        >
          <Text style={s.avatarText}>{avatarLetter}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl + 20 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={Colors.primary.default}
          />
        }
      >

        {/* ── Sensor strip ───────────────────────────── */}
        <Text style={s.activeLabel}>{activeCount} device{activeCount !== 1 ? 's' : ''} active</Text>
        <View style={s.envStrip}>
          {SENSOR_STRIP.map(({ key, label, unit, icon, color }) => {
            const raw    = sensors[key];
            const num    = parseFloat(raw);
            const display = raw != null && !isNaN(num) ? `${Math.round(num)}${unit}` : '—';
            const status = sensorStatus(key, raw);
            return (
              <View key={key} style={s.envTile}>
                <Ionicons name={icon} size={20} color={color} />
                <Text style={[s.envVal, { color }]}>{display}</Text>
                <Text style={s.envLabel}>{label}</Text>
                {status && <Text style={[s.envStatus, { color: status.color }]}>{status.text}</Text>}
              </View>
            );
          })}
        </View>

        {/* ── Quick Control ──────────────────────────── */}
        <Text style={s.sectionTitle}>QUICK CONTROL</Text>
        <View style={s.grid}>
          {QUICK_CARDS.map(card => {
            const doorIsOpen = card.isDoor ? parseBool(devices['door']) : false;
            const isOn       = card.isDoor ? false : parseBool(devices[card.key]);
            const isActive   = card.isDoor ? !doorIsOpen : (card.isAuto ? true : isOn);
            const busy       = !!cmdLoading[card.key];

            const statusLabel = card.isDoor
              ? (doorIsOpen ? 'OPEN' : 'LOCKED')
              : card.isAuto ? 'AUTO'
              : isOn ? 'ON' : 'OFF';

            return (
              <TouchableOpacity
                key={card.key}
                style={[s.qaCard, { borderColor: isActive ? card.borderColor : 'transparent' }]}
                onPress={() => card.isDoor
                  ? handleDoor(doorIsOpen ? 'CLOSE' : 'OPEN')
                  : handleToggle(card.key)
                }
                disabled={busy}
                activeOpacity={0.85}
              >
                {isActive && (
                  <View style={[s.qaTopBar, {
                    backgroundColor: card.isDoor ? Colors.success
                      : card.isAuto ? Colors.state.auto
                      : Colors.primary.default,
                  }]} />
                )}

                <Ionicons
                  name={isActive ? card.iconActive : card.icon}
                  size={28}
                  color={isActive ? card.activeColor : Colors.text.caption}
                />
                <Text style={s.qaName}>{card.label}</Text>
                <Text style={s.qaSub}>{card.room}</Text>

                <View style={s.qaFill} />

                <View style={s.qaBottom}>
                  {busy ? (
                    <ActivityIndicator size="small" color={card.activeColor} />
                  ) : (
                    <>
                      <Text style={[s.qaStatus, { color: isActive ? card.activeColor : Colors.text.caption }]}>
                        {statusLabel}
                      </Text>
                      <Toggle
                        value={card.isDoor ? !doorIsOpen : (card.isAuto ? true : isOn)}
                        color={card.toggleColor}
                        onPress={() => card.isDoor
                          ? handleDoor(doorIsOpen ? 'CLOSE' : 'OPEN')
                          : handleToggle(card.key)
                        }
                      />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Recent Activity ─────────────────────────── */}
        <View style={s.actHeader}>
          <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
          <Ionicons name="time-outline" size={16} color={Colors.text.caption} />
        </View>
        <View style={s.actList}>
          {logs.length === 0 ? (
            <View style={s.actItem}>
              <Text style={s.actText}>No recent activity</Text>
            </View>
          ) : (
            logs.map((log, i) => {
              const clr = log.type === 'ok'   ? Colors.success
                        : log.type === 'warn' ? Colors.warning
                        :                       Colors.info;
              const ico = log.type === 'ok'   ? 'checkmark-circle-outline'
                        : log.type === 'warn' ? 'warning-outline'
                        :                       'information-circle-outline';
              return (
                <View key={i} style={[s.actItem, i > 0 && s.actBorder]}>
                  <Ionicons name={ico} size={16} color={clr} style={{ flexShrink: 0 }} />
                  <Text style={s.actText} numberOfLines={1}>{log.msg}</Text>
                  <Text style={s.actTime}>{log.ts}</Text>
                </View>
              );
            })
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.surface.base },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.body, marginTop: Spacing.lg, fontSize: Typography.size.md },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
  },
  greeting: {
    color:      Colors.text.title,
    fontSize:   26,
    fontWeight: Typography.weight.bold,
  },
  date: {
    color:     Colors.text.caption,
    fontSize:  Typography.size.sm,
    marginTop: 2,
  },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.primary.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    color:      Colors.text.title,
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.bold,
  },

  activeLabel: {
    color:             Colors.text.caption,
    fontSize:          Typography.size.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom:      Spacing.md,
    marginTop:         Spacing.xs,
  },

  envStrip: {
    flexDirection:    'row',
    gap:              Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xl,
  },
  envTile: {
    flex:            1,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
    gap:             4,
  },
  envVal:    { fontSize: 22, fontWeight: Typography.weight.bold, lineHeight: 28 },
  envLabel:  { fontSize: Typography.size.xs, color: Colors.text.caption },
  envStatus: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  sectionTitle: {
    color:             Colors.text.caption,
    fontSize:          Typography.size.xs,
    fontWeight:        Typography.weight.bold,
    letterSpacing:     1.5,
    textTransform:     'uppercase',
    paddingHorizontal: Spacing.xl,
    marginBottom:      Spacing.md,
  },

  grid: {
    flexDirection:    'row',
    flexWrap:         'wrap',
    gap:              Spacing.md,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xl,
  },
  qaCard: {
    width:           CARD_W,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    borderWidth:     1.5,
    borderColor:     'transparent',
    minHeight:       140,
    overflow:        'hidden',
  },
  qaTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
  },
  qaName:   { color: Colors.text.title,   fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginTop: Spacing.sm },
  qaSub:    { color: Colors.text.caption, fontSize: Typography.size.xs, marginTop: 2 },
  qaFill:   { flex: 1, minHeight: Spacing.md },
  qaBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  qaStatus: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  toggle: {
    width: 40, height: 22, borderRadius: 11,
    position: 'relative',
  },
  toggleKnob: {
    position:    'absolute',
    width: 16,   height: 16, borderRadius: 8,
    backgroundColor: '#fff',
    top: 3,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },

  actHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom:      Spacing.md,
  },
  actList: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
  },
  actItem:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  actBorder: { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  actText:   { flex: 1, color: Colors.text.body, fontSize: Typography.size.sm },
  actTime:   { color: Colors.text.caption, fontSize: Typography.size.xs },
});
