import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listSensors, listDevices, setDeviceState } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── constants ────────────────────────────────────────────────────
const SENSOR_KEYS = ['temperature', 'humidity', 'gas', 'rain'];
const SENSOR_META = {
  temperature: { label: 'Temperature', unit: '°C', icon: 'thermometer-outline', color: Colors.data.temperature },
  humidity:    { label: 'Humidity',    unit: '%',  icon: 'water-outline',        color: Colors.data.humidity },
  gas:         { label: 'Gas',         unit: '',   icon: 'warning-outline',      color: Colors.data.gas },
  rain:        { label: 'Rain',        unit: '',   icon: 'rainy-outline',         color: Colors.data.rain },
};
const TOGGLE_DEVICES = ['lb1', 'pir', 'rgb'];
const DEVICE_META = {
  lb1:  { label: 'Light',       icon: 'bulb-outline'          },
  pir:  { label: 'Motion Det.', icon: 'eye-outline'           },
  rgb:  { label: 'RGB Strip',   icon: 'color-palette-outline' },
  door: { label: 'Door',        icon: 'key-outline'           },
};

function parseBool(val) {
  const s = String(val ?? '').toUpperCase();
  return s === 'ON' || s === '1' || s === 'TRUE' || s === 'OPEN';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fmtDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

// ── component ────────────────────────────────────────────────────
export default function HomeScreen() {
  const { token, user, signOut } = useAuth();

  const [sensors,    setSensors]    = useState({});
  const [devices,    setDevices]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdLoading, setCmdLoading] = useState({});
  const [logs,       setLogs]       = useState([]);

  const pollRef = useRef(null);

  function addLog(msg) {
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs(prev => [`${ts}  ${msg}`, ...prev].slice(0, 8));
  }

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([listSensors(), listDevices()]);

      const sm = {};
      (sRes.sensors ?? []).forEach(s => { sm[s.key] = s.last_value ?? s.value ?? null; });
      setSensors(sm);

      const dm = {};
      (dRes.devices ?? []).forEach(d => { dm[d.key] = d.last_value ?? d.value ?? null; });
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
      addLog(`${DEVICE_META[key]?.label ?? key} → ${next}`);
    } catch (e) {
      addLog(`⚠ ${e.message}`);
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleDoor(state) {
    setCmdLoading(p => ({ ...p, door: true }));
    try {
      await setDeviceState('door', state, token);
      setDevices(p => ({ ...p, door: state }));
      addLog(`Door → ${state}`);
    } catch (e) {
      addLog(`⚠ ${e.message}`);
    } finally {
      setCmdLoading(p => ({ ...p, door: false }));
    }
  }

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
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{greeting()}, {user?.username} 👋</Text>
          <Text style={s.date}>{fmtDate()}</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={s.signOutBtn}>
          <Text style={s.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={Colors.primary.default}
          />
        }
      >
        {/* ── Sensors ─────────────────────────────────── */}
        <Text style={s.sectionTitle}>Environment</Text>
        <View style={s.grid}>
          {SENSOR_KEYS.map(key => {
            const meta = SENSOR_META[key];
            const raw  = sensors[key];
            const num  = parseFloat(raw);
            const display = (raw !== null && raw !== undefined && !isNaN(num))
              ? `${num.toFixed(1)}${meta.unit}`
              : '—';
            return (
              <View key={key} style={s.sensorCard}>
                <Ionicons name={meta.icon} size={24} color={meta.color} style={{ marginBottom: Spacing.sm }} />
                <Text style={[s.sensorValue, { color: meta.color }]}>{display}</Text>
                <Text style={s.sensorLabel}>{meta.label}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Toggle devices ───────────────────────────── */}
        <Text style={s.sectionTitle}>Quick Controls</Text>
        <View style={s.grid}>
          {TOGGLE_DEVICES.map(key => {
            const isOn = parseBool(devices[key]);
            const meta = DEVICE_META[key];
            return (
              <TouchableOpacity
                key={key}
                style={[s.deviceCard, isOn && s.deviceCardOn]}
                onPress={() => handleToggle(key)}
                disabled={!!cmdLoading[key]}
                activeOpacity={0.8}
              >
                {cmdLoading[key]
                  ? <ActivityIndicator color={Colors.primary.default} />
                  : <>
                      <Ionicons name={meta.icon} size={26} color={isOn ? Colors.primary.default : Colors.text.caption} style={{ marginBottom: Spacing.sm }} />
                      <Text style={[s.deviceLabel, isOn && s.deviceLabelOn]}>{meta.label}</Text>
                      <View style={[s.pill, { backgroundColor: isOn ? Colors.state.on : Colors.state.off }]}>
                        <Text style={s.pillText}>{isOn ? 'ON' : 'OFF'}</Text>
                      </View>
                    </>
                }
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Door ─────────────────────────────────────── */}
        <View style={s.doorCard}>
          <View style={s.doorLeft}>
            <Ionicons name={DEVICE_META.door.icon} size={24} color={Colors.text.caption} style={{ marginRight: Spacing.sm }} />
            <View>
              <Text style={s.deviceLabel}>Front Door</Text>
              <Text style={s.doorStatus}>
                {devices.door ? String(devices.door).toUpperCase() : '—'}
              </Text>
            </View>
          </View>
          {cmdLoading.door
            ? <ActivityIndicator color={Colors.primary.default} />
            : <View style={s.doorButtons}>
                <TouchableOpacity
                  style={[s.doorBtn, devices.door === 'OPEN' && s.doorBtnActive]}
                  onPress={() => handleDoor('OPEN')}
                >
                  <Text style={[s.doorBtnText, devices.door === 'OPEN' && { color: Colors.text.onGold }]}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.doorBtn, devices.door !== 'OPEN' && s.doorBtnActive]}
                  onPress={() => handleDoor('CLOSE')}
                >
                  <Text style={[s.doorBtnText, devices.door !== 'OPEN' && { color: Colors.text.onGold }]}>Close</Text>
                </TouchableOpacity>
              </View>
          }
        </View>

        {/* ── Activity log ─────────────────────────────── */}
        {logs.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Activity</Text>
            <View style={s.logCard}>
              {logs.map((l, i) => (
                <Text key={i} style={[s.logEntry, i > 0 && s.logBorder]}>{l}</Text>
              ))}
            </View>
          </>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.text.body, marginTop: Spacing.lg, fontSize: Typography.size.md },

  header: {
    flexDirection:    'row',
    justifyContent:   'space-between',
    alignItems:       'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    backgroundColor:  Colors.surface.overlay,
  },
  greeting: { fontSize: Typography.size.lg, color: Colors.text.title, fontWeight: Typography.weight.semibold },
  date:     { fontSize: Typography.size.sm, color: Colors.text.caption, marginTop: 2 },
  signOutBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  signOutText: { color: Colors.text.caption, fontSize: Typography.size.xs },

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

  // 2-col grid
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    paddingHorizontal: Spacing.lg,
    gap:            Spacing.md,
  },

  // Sensor card
  sensorCard: {
    flex:            1,
    minWidth:        '44%',
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.surface.elevated,
  },
  sensorValue: { fontSize: Typography.size.xl, fontWeight: Typography.weight.bold },
  sensorLabel: { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },

  // Device toggle card
  deviceCard: {
    flex:            1,
    minWidth:        '44%',
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
    borderWidth:     1.5,
    borderColor:     Colors.surface.elevated,
  },
  deviceCardOn: {
    borderColor:     Colors.primary.default,
    backgroundColor: '#52441620', // primary.darker at ~12% opacity
  },
  deviceLabel:   { fontSize: Typography.size.sm, color: Colors.text.body, marginBottom: Spacing.md },
  deviceLabelOn: { color: Colors.primary.subtle },

  pill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
  },
  pillText: { color: Colors.text.onGold, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  // Door card
  doorCard: {
    flexDirection:    'row',
    alignItems:       'center',
    marginHorizontal: Spacing.xl,
    marginTop:        Spacing.md,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    padding:          Spacing.lg,
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
  },
  doorLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  doorStatus: { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },
  doorButtons: { flexDirection: 'row', gap: Spacing.sm },
  doorBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  doorBtnActive: { backgroundColor: Colors.primary.default, borderColor: Colors.primary.default },
  doorBtnText:   { color: Colors.text.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },

  // Log
  logCard: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
    borderWidth:      1,
    borderColor:      Colors.surface.elevated,
  },
  logEntry:  { color: Colors.text.caption, fontSize: Typography.size.xs, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  logBorder: { borderTopWidth: 1, borderTopColor: Colors.surface.elevated },
});
