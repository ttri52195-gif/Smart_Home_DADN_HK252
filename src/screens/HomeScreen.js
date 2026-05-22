import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Dimensions, PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listSensors, listDevices, setDeviceState, getDeviceActivities } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.xl * 2 - Spacing.md) / 2;

const SENSOR_COLS     = 3;
const SENSOR_TILE_W   = (SCREEN_W - Spacing.xl * 2 - Spacing.md * (SENSOR_COLS - 1)) / SENSOR_COLS;

// Visual config only — icon + color per feed_key.
// name and unit come from the API response at runtime.
const SENSOR_META = {
  temperature: { icon: 'thermometer-outline', color: Colors.data.temperature },
  humidity:    { icon: 'water-outline',       color: Colors.data.humidity    },
  rain:        { icon: 'rainy-outline',       color: Colors.data.light       },
  gas:         { icon: 'flame-outline',       color: Colors.error            },
  themis:      { icon: 'sunny-outline',       color: Colors.data.light       },
};

// Visual config per device type — name comes from API at runtime.
const DEVICE_META = {
  LIGHT:  { icon: 'bulb-outline',          iconActive: 'bulb',          activeColor: Colors.primary.default, borderColor: 'rgba(228,181,24,0.55)', toggleColor: Colors.success       },
  DOOR:   { icon: 'lock-open-outline',     iconActive: 'lock-closed',   activeColor: Colors.success,         borderColor: 'rgba(39,174,96,0.45)',  toggleColor: Colors.success,  isDoor: true },
  MOTION: { icon: 'aperture-outline',      iconActive: 'aperture',      activeColor: Colors.state.auto,      borderColor: 'rgba(139,92,246,0.55)', toggleColor: Colors.state.auto    },
  RGB:    { icon: 'color-palette-outline', iconActive: 'color-palette', activeColor: Colors.primary.default, borderColor: 'rgba(228,181,24,0.55)', toggleColor: Colors.success       },
  DIMMER: { icon: 'sunny-outline',         iconActive: 'sunny',         activeColor: Colors.primary.default, borderColor: 'rgba(228,181,24,0.55)', toggleColor: Colors.success       },
};

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

function isNumericOn(value) {
  const n = parseFloat(value);
  return !isNaN(n) && n > 0;
}

function isDeviceActive(type, value) {
  if (type === 'DOOR')   return !parseBool(value);   // CLOSE (locked) = active
  if (type === 'RGB')    return isNumericOn(value) || parseBool(value);
  if (type === 'LIGHT' || type === 'DIMMER') return isNumericOn(value) || parseBool(value);
  return parseBool(value);
}

function deviceStatusLabel(type, value) {
  if (type === 'DOOR') return parseBool(value) ? 'OPEN' : 'LOCKED';
  const on = isNumericOn(value) || parseBool(value);
  return on ? 'ON' : 'OFF';
}

function chunkSensors(arr, size) {
  const rows = [];
  for (let i = 0; i < arr.length; i += size) rows.push(arr.slice(i, i + size));
  return rows;
}

function toApiTime(date) {
  return date.toISOString().slice(0, 19);
}

function formatAge(date) {
  if (!date || isNaN(date)) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const ONLINE_MS = 5 * 60 * 1000;
function isOnline(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  return !isNaN(d) && (Date.now() - d.getTime()) < ONLINE_MS;
}

function actIcon(type, value) {
  const v = String(value ?? '').toUpperCase();
  if (type === 'DOOR')   return v === 'OPEN' ? 'lock-open-outline' : 'lock-closed-outline';
  if (type === 'LIGHT' || type === 'DIMMER') return v === 'ON' ? 'bulb' : 'bulb-outline';
  if (type === 'RGB')    return 'color-palette-outline';
  if (type === 'MOTION') return 'aperture-outline';
  return 'radio-button-on-outline';
}

function actColor(type, value) {
  const v = String(value ?? '').toUpperCase();
  if (type === 'DOOR') return v === 'OPEN' ? Colors.warning : Colors.success;
  return (v === 'ON' || v === 'OPEN') ? Colors.success : Colors.text.caption;
}

const HS_THUMB_R = 8;

function HorizontalSlider({ value, color, onChange, style }) {
  const trackW = useRef(0);
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),
    onPanResponderGrant: (e) => {
      if (trackW.current > 0)
        onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current)) * 100));
    },
    onPanResponderMove: (e) => {
      if (trackW.current > 0)
        onChange(Math.round(Math.max(0, Math.min(1, e.nativeEvent.locationX / trackW.current)) * 100));
    },
  })).current;
  return (
    <View
      onLayout={e => { trackW.current = e.nativeEvent.layout.width; }}
      style={[hs.wrapper, style]}
      {...pan.panHandlers}
    >
      <View style={hs.track}>
        <View style={[hs.fill, { width: `${value}%`, backgroundColor: color }]} />
      </View>
      <View style={[hs.thumb, {
        left: `${value}%`,
        borderColor: color,
        transform: [{ translateX: -HS_THUMB_R }],
      }]} />
    </View>
  );
}

const hs = StyleSheet.create({
  wrapper: { height: HS_THUMB_R * 2, justifyContent: 'center' },
  track:   { height: 6, borderRadius: 3, backgroundColor: Colors.surface.elevated, overflow: 'hidden' },
  fill:    { height: '100%', borderRadius: 3 },
  thumb: {
    position: 'absolute',
    width: HS_THUMB_R * 2, height: HS_THUMB_R * 2, borderRadius: HS_THUMB_R,
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});

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

  const [sensorList, setSensorList] = useState([]);
  const [sensors,    setSensors]    = useState({});
  const [deviceList, setDeviceList] = useState([]);
  const [devices,    setDevices]    = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdLoading,  setCmdLoading]  = useState({});
  const [activities,  setActivities]  = useState([]);

  const pollRef = useRef(null);
  const avatarLetter = (user?.username ?? 'U')[0].toUpperCase();

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, dRes] = await Promise.all([listSensors(), listDevices()]);
      const list = sRes.sensors ?? [];
      setSensorList(list);
      const sm = {};
      list.forEach(s => { sm[s.feed_key] = s.current_value ?? null; });
      setSensors(sm);
      const dList = dRes.devices ?? [];
      setDeviceList(dList);
      const dm = {};
      dList.forEach(d => { dm[d.feed_key ?? d.key] = d.value ?? d.last_value ?? null; });
      setDevices(dm);
    } catch (e) {
      console.warn('Poll error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
      pollRef.current = setInterval(fetchAll, 10000);
      return () => clearInterval(pollRef.current);
    }, [fetchAll])
  );

  // Fetch device activity for last 5 min whenever device list refreshes
  useEffect(() => {
    if (!token || deviceList.length === 0) return;
    const end   = new Date();
    const start = new Date(end.getTime() - 5 * 60 * 1000);
    Promise.allSettled(
      deviceList.map(d => getDeviceActivities(token, d.feed_key, toApiTime(start), toApiTime(end)))
    ).then(results => {
      const merged = [];
      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return;
        const dev  = deviceList[i];
        const rows = Array.isArray(res.value) ? res.value : (res.value?.data ?? []);
        rows.forEach(pt => {
          const t = new Date(pt.timestamp ?? pt.created_at);
          if (!isNaN(t)) merged.push({ name: dev.name, type: dev.type, value: pt.value, time: t });
        });
      });
      merged.sort((a, b) => b.time - a.time);
      setActivities(merged.slice(0, 10));
    }).catch(() => {});
  }, [deviceList, token]);

  async function handleToggle(key) {
    const next = parseBool(devices[key]) ? 'OFF' : 'ON';
    setCmdLoading(p => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, next, token);
      setDevices(p => ({ ...p, [key]: next }));
    } catch (e) {
      console.warn(e.message);
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleDoor(key, next) {
    setCmdLoading(p => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, next, token);
      setDevices(p => ({ ...p, [key]: next }));
    } catch (e) {
      console.warn(e.message);
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleSlider(key, val) {
    setDevices(p => ({ ...p, [key]: String(val) }));
    try {
      await setDeviceState(key, String(val), token);
    } catch (e) {
      console.warn(e.message);
    }
  }

  const onlineSensorCount = sensorList.filter(s => isOnline(s.last_recorded_at)).length;
  const onlineDeviceCount = deviceList.filter(d => isOnline(d.last_record_time)).length;

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

      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchAll(); }}
            tintColor={Colors.primary.default}
          />
        }
      >

        {/* ── Sensor strip ───────────────────────────── */}
        <Text style={s.activeLabel}>
          {sensorList.length} sensor{sensorList.length !== 1 ? 's' : ''} · {onlineSensorCount} online
        </Text>
        {onlineSensorCount === 0 && sensorList.length > 0 && (
          <View style={s.sectionOfflineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={Colors.text.caption} />
            <Text style={s.sectionOfflineText}>All sensors are offline — no data in the last 5 min</Text>
          </View>
        )}
        <View style={s.envStrip}>
          {chunkSensors(sensorList, SENSOR_COLS).map((row, ri) => (
            <View key={ri} style={[s.envRow, row.length < SENSOR_COLS && s.envRowCenter]}>
              {row.map(sensor => {
                const meta     = SENSOR_META[sensor.feed_key] ?? { icon: 'analytics-outline', color: Colors.text.caption };
                const num      = parseFloat(sensor.current_value);
                const unit     = sensor.unit === 'raw' ? '' : sensor.unit;
                const status   = sensorStatus(sensor.feed_key, sensor.current_value);
                const online   = isOnline(sensor.last_recorded_at);
                const lastDate = sensor.last_recorded_at ? new Date(sensor.last_recorded_at) : null;
                return (
                  <View key={sensor.feed_key} style={[s.envTile, !online && { opacity: 0.6 }]}>
                    <Ionicons name={meta.icon} size={20} color={online ? meta.color : Colors.text.caption} />
                    <Text style={[s.envVal, { color: online ? meta.color : Colors.text.caption }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {!isNaN(num) ? `${Math.round(num)}${unit}` : '—'}
                    </Text>
                    <Text style={s.envLabel}>{sensor.name}</Text>
                    {online && status && <Text style={[s.envStatus, { color: status.color }]}>{status.text}</Text>}
                    {!online && <View style={s.offlineChip}><Text style={s.offlineChipText}>OFFLINE</Text></View>}
                    {lastDate && <Text style={s.envLastTime}>{formatAge(lastDate)}</Text>}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Quick Control ──────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>QUICK CONTROL</Text>
          <Text style={s.sectionBadge}>{onlineDeviceCount} online</Text>
        </View>
        {onlineDeviceCount === 0 && deviceList.length > 0 && (
          <View style={s.sectionOfflineBanner}>
            <Ionicons name="cloud-offline-outline" size={20} color={Colors.text.caption} />
            <Text style={s.sectionOfflineText}>All devices are offline — no data in the last 5 min</Text>
          </View>
        )}
        <View style={s.grid}>
          {deviceList.map(device => {
            const meta        = DEVICE_META[device.type] ?? { icon: 'hardware-chip-outline', iconActive: 'hardware-chip', activeColor: Colors.primary.default, borderColor: 'rgba(228,181,24,0.3)', toggleColor: Colors.success };
            const currentVal  = devices[device.feed_key] ?? device.value;
            const isActive    = isDeviceActive(device.type, currentVal);
            const statusLabel = deviceStatusLabel(device.type, currentVal);
            const busy        = !!cmdLoading[device.feed_key];
            const isSlider    = device.type === 'LIGHT' || device.type === 'RGB';
            const numVal      = parseFloat(currentVal) || 0;
            const online      = isOnline(device.last_record_time);
            const lastDate    = device.last_record_time ? new Date(device.last_record_time) : null;
            const onPress     = isSlider ? undefined : () => meta.isDoor
              ? handleDoor(device.feed_key, parseBool(currentVal) ? 'CLOSE' : 'OPEN')
              : handleToggle(device.feed_key);

            return (
              <TouchableOpacity
                key={device.feed_key}
                style={[
                  s.qaCard,
                  { borderColor: isActive && online ? meta.borderColor : 'transparent' },
                  !online && { opacity: 0.6 },
                ]}
                onPress={onPress}
                disabled={busy || isSlider}
                activeOpacity={isSlider ? 1 : 0.85}
              >
                {isActive && online && <View style={[s.qaTopBar, { backgroundColor: meta.activeColor }]} />}

                <Ionicons
                  name={isActive ? meta.iconActive : meta.icon}
                  size={28}
                  color={isActive && online ? meta.activeColor : Colors.text.caption}
                />
                <Text style={s.qaName}>{device.name}</Text>
                {lastDate && <Text style={s.qaLastTime}>{formatAge(lastDate)}</Text>}

                <View style={s.qaFill} />

                {isSlider ? (
                  <View style={s.qaSliderSection}>
                    <Text style={[s.qaStatus, { color: online && isActive ? meta.activeColor : Colors.text.caption }]}>
                      {online ? (isActive ? String(Math.round(numVal)) : 'OFF') : 'OFFLINE'}
                    </Text>
                    <HorizontalSlider
                      value={numVal}
                      color={online ? meta.activeColor : Colors.text.caption}
                      onChange={v => handleSlider(device.feed_key, v)}
                    />
                  </View>
                ) : (
                  <View style={s.qaBottom}>
                    {busy ? (
                      <ActivityIndicator size="small" color={meta.activeColor} />
                    ) : (
                      <>
                        <Text style={[s.qaStatus, { color: online && isActive ? meta.activeColor : Colors.text.caption }]}>
                          {online ? statusLabel : 'OFFLINE'}
                        </Text>
                        <Toggle value={isActive} color={online ? meta.toggleColor : Colors.surface.elevated} onPress={onPress} />
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Recent Activity ─────────────────────────── */}
        <View style={s.actHeader}>
          <Text style={s.sectionTitle}>RECENT ACTIVITY</Text>
          <Text style={s.sectionBadge}>last 5 min</Text>
        </View>
        <View style={s.actList}>
          {activities.length === 0 ? (
            <View style={s.actItem}>
              <Text style={s.actText}>No recent activity</Text>
            </View>
          ) : (
            activities.map((act, i) => (
              <View key={i} style={[s.actItem, i > 0 && s.actBorder]}>
                <Ionicons name={actIcon(act.type, act.value)} size={16} color={actColor(act.type, act.value)} style={{ flexShrink: 0 }} />
                <Text style={s.actText} numberOfLines={1}>{act.name} → {act.value}</Text>
                <Text style={s.actTime}>{formatAge(act.time)}</Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
      </View>
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
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.xl,
    gap:              Spacing.md,
  },
  envRow:       { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  envRowCenter: { justifyContent: 'center' },
  envTile: {
    width:           SENSOR_TILE_W,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    alignItems:      'center',
    gap:             4,
  },
  envVal:    { fontSize: 20, fontWeight: Typography.weight.bold, lineHeight: 26, width: '100%', textAlign: 'center' },
  envLabel:  { fontSize: Typography.size.xs, color: Colors.text.caption, textAlign: 'center' },
  envStatus: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  sectionHeader: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom:      Spacing.md,
  },
  sectionBadge: {
    fontSize:         Typography.size.xs,
    color:            Colors.primary.default,
    fontWeight:       Typography.weight.semibold,
  },
  sectionTitle: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
  qaBottom:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.sm },
  qaSliderSection: { gap: Spacing.xs },
  qaStatus:        { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

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

  sectionOfflineBanner: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              Spacing.md,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical:  Spacing.lg,
    marginHorizontal: Spacing.xl,
    marginBottom:     Spacing.md,
  },
  sectionOfflineText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.caption },

  offlineChip: {
    backgroundColor:   Colors.error + '22',
    borderWidth:       1,
    borderColor:       Colors.error + '88',
    borderRadius:      Radius.full,
    paddingHorizontal: 5,
    paddingVertical:   1,
  },
  offlineChipText: { fontSize: 8, fontWeight: '700', color: Colors.error, letterSpacing: 0.5 },

  envLastTime: { fontSize: 8, color: Colors.text.caption, textAlign: 'center' },
  qaLastTime:  { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 1 },
});
