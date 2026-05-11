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
const QA_CARD_W = (SCREEN_W - Spacing.xl * 2 - Spacing.md) / 2;

// ── constants ────────────────────────────────────────────────────
const SENSOR_STRIP = [
  { key: 'temperature', label: 'Temp',     unit: '°C', icon: 'thermometer-outline', color: Colors.data.temperature },
  { key: 'humidity',    label: 'Humidity', unit: '%',  icon: 'water-outline',       color: Colors.data.humidity    },
  { key: 'themis',      label: 'Lux',      unit: '',   icon: 'sunny-outline',       color: Colors.data.light       },
];

const TOGGLE_KEYS = ['lb1', 'pir', 'rgb'];
const DEVICE_META = {
  lb1:  { label: 'Lights',     subLabel: 'Living room', icon: 'bulb-outline'          },
  pir:  { label: 'Motion',     subLabel: 'Front door',  icon: 'eye-outline'           },
  rgb:  { label: 'RGB Strip',  subLabel: 'Living room', icon: 'color-palette-outline' },
  door: { label: 'Front Door', subLabel: 'Servo lock',  icon: 'lock-closed-outline'   },
};

// ── helpers ──────────────────────────────────────────────────────
function parseBool(val) {
  const v = String(val ?? '').toUpperCase();
  return v === 'ON' || v === '1' || v === 'TRUE' || v === 'OPEN';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
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
    if (n < 10)  return { text: 'Dark', color: Colors.warning };
    if (n > 800) return { text: 'Bright', color: Colors.warning };
    return { text: 'OK', color: Colors.success };
  }
  return { text: 'OK', color: Colors.success };
}

// ── Toggle ───────────────────────────────────────────────────────
function Toggle({ value, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[s.toggle, value ? s.toggleOn : s.toggleOff]}
    >
      <View style={[s.toggleKnob, { left: value ? 21 : 3 }]} />
    </TouchableOpacity>
  );
}

// ── screen ───────────────────────────────────────────────────────
export default function HomeScreen() {
  const { token, user } = useAuth();

  const [sensors, setSensors] = useState({});
  const [devices, setDevices] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdLoading, setCmdLoading] = useState({});
  const [logs, setLogs] = useState([]);

  const pollRef = useRef(null);

  const firstName    = (user?.username ?? 'You').split(' ')[0];
  const avatarLetter = (user?.username ?? 'U')[0].toUpperCase();

  function addLog(msg, type = 'info') {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [{ ts, msg, type }, ...prev].slice(0, 6));
  }

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([listSensors(), listDevices()]);
      const sm = {};
      (sRes.data?.sensors ?? []).forEach(s => { sm[s.feed_key] = s.current_value ?? null; });
      setSensors(sm);
      const dm = {};
      (dRes.devices ?? []).forEach((d) => {
        dm[d.key] = d.last_value ?? d.value ?? null;
      });
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
    setCmdLoading((p) => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, next, token);
      setDevices(p => ({ ...p, [key]: next }));
      addLog(`${DEVICE_META[key]?.label} turned ${next}`, next === 'ON' ? 'ok' : 'info');
    } catch (e) {
      addLog(`${DEVICE_META[key]?.label} failed`, 'warn');
    } finally {
      setCmdLoading((p) => ({ ...p, [key]: false }));
    }
  }

  async function handleDoor() {
    const isOpen = parseBool(devices.door);
    const next   = isOpen ? 'CLOSE' : 'OPEN';
    setCmdLoading(p => ({ ...p, door: true }));
    try {
      await setDeviceState('door', next, token);
      setDevices(p => ({ ...p, door: next }));
      addLog(`Door ${next === 'OPEN' ? 'unlocked' : 'locked'}`, next === 'OPEN' ? 'warn' : 'ok');
    } catch (e) {
      addLog('Door command failed', 'warn');
    } finally {
      setCmdLoading((p) => ({ ...p, door: false }));
    }
  }

  const activeCount = TOGGLE_KEYS.filter(k => parseBool(devices[k])).length;

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

  const doorIsOpen = parseBool(devices.door);

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Nav header ─────────────────────────────────── */}
      <View style={s.navHeader}>
        <Text style={s.navTitle}>My Home</Text>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{avatarLetter}</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchAll();
            }}
            tintColor={Colors.primary.default}
          />
        }
      >

        {/* ── Greeting ────────────────────────────────── */}
        <View style={s.greetingBlock}>
          <Text style={s.greetingHi}>{greeting()}, {firstName} ☀️</Text>
          <Text style={s.greetingSub}>
            {activeCount} device{activeCount !== 1 ? 's' : ''} active • All systems normal
          </Text>
        </View>

        {/* ── Env strip ───────────────────────────────── */}
        <View style={s.envStrip}>
          {SENSOR_STRIP.map(({ key, label, unit, icon, color }) => {
            const raw     = sensors[key];
            const num     = parseFloat(raw);
            const display = raw != null && !isNaN(num) ? `${Math.round(num)}${unit}` : '—';
            const status  = sensorStatus(key, raw);
            return (
              <View key={key} style={s.envTile}>
                <Ionicons name={icon} size={18} color={color} />
                <Text style={[s.envVal, { color }]}>{display}</Text>
                <Text style={s.envLabel}>{label}</Text>
                {status && <Text style={[s.envStatus, { color: status.color }]}>{status.text}</Text>}
              </View>
            );
          })}
        </View>

        {/* ── Quick Controls ───────────────────────────── */}
        <Text style={s.sh}>Quick Controls</Text>
        <View style={s.qaGrid}>

          {TOGGLE_KEYS.map(key => {
            const isOn = parseBool(devices[key]);
            const meta = DEVICE_META[key];
            return (
              <TouchableOpacity
                key={key}
                style={[s.qaCard, isOn && s.qaCardOn]}
                onPress={() => handleToggle(key)}
                disabled={!!cmdLoading[key]}
                activeOpacity={0.85}
              >
                {isOn && <View style={s.qaTopBar} />}
                <Ionicons
                  name={meta.icon}
                  size={26}
                  color={isOn ? Colors.primary.default : Colors.text.caption}
                  style={{ marginBottom: Spacing.sm }}
                />
                <Text style={s.qaName}>{meta.label}</Text>
                <Text style={s.qaSub}>{meta.subLabel}</Text>
                <View style={s.qaTogRow}>
                  {cmdLoading[key]
                    ? <ActivityIndicator size="small" color={Colors.primary.default} />
                    : <>
                        <Text style={isOn ? s.stateOn : s.stateOff}>{isOn ? 'ON' : 'OFF'}</Text>
                        <Toggle value={isOn} onPress={() => handleToggle(key)} />
                      </>
                  }
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Door card */}
          <TouchableOpacity
            style={[s.qaCard, doorIsOpen ? s.qaCardWarn : s.qaCardSecure]}
            onPress={handleDoor}
            disabled={!!cmdLoading.door}
            activeOpacity={0.85}
          >
            {!doorIsOpen && <View style={[s.qaTopBar, { backgroundColor: Colors.success }]} />}
            <Ionicons
              name={doorIsOpen ? 'lock-open-outline' : 'lock-closed-outline'}
              size={26}
              color={doorIsOpen ? Colors.warning : Colors.success}
              style={{ marginBottom: Spacing.sm }}
            />
            <Text style={s.qaName}>{DEVICE_META.door.label}</Text>
            <Text style={s.qaSub}>{doorIsOpen ? 'Unlocked' : 'Servo locked'}</Text>
            <View style={s.qaTogRow}>
              {cmdLoading.door
                ? <ActivityIndicator size="small" color={Colors.primary.default} />
                : <>
                    <Text style={[s.stateOn, { color: doorIsOpen ? Colors.warning : Colors.success }]}>
                      {doorIsOpen ? 'OPEN' : 'LOCKED'}
                    </Text>
                    <Text style={s.pinHint}>PIN ›</Text>
                  </>
              }
            </View>
          </TouchableOpacity>

        </View>

        {/* ── Recent Activity ──────────────────────────── */}
        {logs.length > 0 && (
          <>
            <Text style={s.sh}>Recent Activity</Text>
            <View style={s.actList}>
              {logs.map((log, i) => {
                const dotBg  = log.type === 'ok'   ? 'rgba(39,174,96,0.15)'
                             : log.type === 'warn' ? 'rgba(245,158,11,0.15)'
                             :                       'rgba(47,128,237,0.15)';
                const clr    = log.type === 'ok'   ? Colors.success
                             : log.type === 'warn' ? Colors.warning
                             :                       Colors.info;
                const ico    = log.type === 'ok'   ? 'checkmark-circle-outline'
                             : log.type === 'warn' ? 'warning-outline'
                             :                       'information-circle-outline';
                return (
                  <View key={i} style={[s.actItem, i > 0 && s.actBorder]}>
                    <View style={[s.actDot, { backgroundColor: dotBg }]}>
                      <Ionicons name={ico} size={14} color={clr} />
                    </View>
                    <Text style={s.actText}>{log.msg}</Text>
                    <Text style={s.actTime}>{log.ts}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.surface.base },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.body, marginTop: Spacing.lg, fontSize: Typography.size.md },

  // Nav header
  navHeader: {
    backgroundColor:   Colors.surface.overlay,
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    borderBottomWidth: 0.5,
    borderBottomColor: '#25282b',
  },
  navTitle:   { color: Colors.text.title, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary.default,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.text.onGold, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // Greeting
  greetingBlock: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, marginBottom: Spacing.md },
  greetingHi:    { color: Colors.text.title,   fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, marginBottom: 2 },
  greetingSub:   { color: Colors.text.caption, fontSize: Typography.size.sm },

  // Env strip
  envStrip: {
    flexDirection: 'row', gap: Spacing.md,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
  },
  envTile: {
    flex: 1, backgroundColor: Colors.surface.card,
    borderRadius: Radius.lg, padding: Spacing.lg,
    alignItems: 'center', gap: 3,
  },
  envVal:    { fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold, lineHeight: 26 },
  envLabel:  { fontSize: 9, color: Colors.text.caption },
  envStatus: { fontSize: 9, fontWeight: Typography.weight.bold, marginTop: 1 },

  // Section header
  sh: {
    color: Colors.text.caption, fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold, letterSpacing: 1,
    textTransform: 'uppercase',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg, marginBottom: Spacing.md,
  },

  // Quick Control grid
  qaGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: Spacing.md, marginHorizontal: Spacing.xl,
  },
  qaCard: {
    width: QA_CARD_W,
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 110,
    overflow: 'hidden',
  },
  qaCardOn:     { borderColor: 'rgba(228,181,24,0.35)' },
  qaCardSecure: { borderColor: 'rgba(39,174,96,0.25)'  },
  qaCardWarn:   { borderColor: 'rgba(245,158,11,0.25)' },
  qaTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: Colors.primary.default,
  },
  qaName:   { color: Colors.text.title,   fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  qaSub:    { color: Colors.text.caption, fontSize: Typography.size.xs, marginTop: 1 },
  qaTogRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.md },
  stateOn:  { color: Colors.primary.default, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  stateOff: { color: Colors.text.caption,    fontSize: Typography.size.xs },
  pinHint:  { color: Colors.text.caption,    fontSize: Typography.size.sm },

  // Toggle
  toggle: { width: 42, height: 24, borderRadius: 12, position: 'relative' },
  toggleOn:   { backgroundColor: Colors.primary.default  },
  toggleOff:  { backgroundColor: Colors.surface.elevated },
  toggleKnob: {
    position: 'absolute', width: 18, height: 18,
    borderRadius: 9, backgroundColor: '#fff', top: 3,
    shadowColor: '#000', shadowOpacity: 0.3,
    shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },

  // Activity list
  actList: {
    marginHorizontal:  Spacing.xl,
    backgroundColor:   Colors.surface.card,
    borderRadius:      Radius.lg,
    overflow:          'hidden',
  },
  actItem:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  actBorder: { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  actDot: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  actText: { flex: 1, color: Colors.text.body, fontSize: Typography.size.sm, lineHeight: 16 },
  actTime: { color: Colors.text.caption, fontSize: Typography.size.xs },
});
