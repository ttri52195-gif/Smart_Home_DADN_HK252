import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listDevices, setDeviceState, getDeviceActivities } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const FILTERS = ['All', 'Doors', 'Lights', 'Curtains', 'Climate'];

const ACTIVITY_RANGES = [
  { label: '5 min',  ms: 5  * 60 * 1000 },
  { label: '1 hour', ms: 60 * 60 * 1000 },
  { label: '1 day',  ms: 24 * 60 * 60 * 1000 },
];

const TYPE_FILTER = {
  DOOR:    'Doors',
  LIGHT:   'Lights',
  DIMMER:  'Lights',
  RGB:     'Curtains',
  MOTION:  'Climate',
  GENERIC: 'Climate',
};

const LOCATION_META = {
  bedroom:  { icon: 'bed-outline'           },
  living:   { icon: 'tv-outline'            },
  kitchen:  { icon: 'restaurant-outline'    },
  entrance: { icon: 'enter-outline'         },
  outdoor:  { icon: 'partly-sunny-outline'  },
  bathroom: { icon: 'water-outline'         },
  office:   { icon: 'briefcase-outline'     },
  garage:   { icon: 'car-outline'           },
  dining:   { icon: 'cafe-outline'          },
};

function roomIcon(location) {
  const l = (location ?? '').toLowerCase();
  const key = Object.keys(LOCATION_META).find(k => l.includes(k));
  return key ? LOCATION_META[key].icon : 'home-outline';
}

const TYPE_META = {
  DOOR:    { icon: 'lock-closed-outline',   isDoor: true  },
  LIGHT:   { icon: 'bulb-outline'                         },
  DIMMER:  { icon: 'sunny-outline'                        },
  MOTION:  { icon: 'aperture-outline'                     },
  RGB:     { icon: 'color-palette-outline', isRGB: true   },
  GENERIC: { icon: 'flash-outline'                        },
};

function toApiTime(date) {
  return date.toISOString().slice(0, 19);
}

function formatAge(date) {
  if (!date || isNaN(date)) return '';
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60)   return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
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

function parseBool(val) {
  const v = String(val ?? '').toUpperCase();
  return v === 'ON' || v === '1' || v === 'TRUE' || v === 'OPEN';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
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

function Toggle({ value, color = Colors.success, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[ds.toggle, { backgroundColor: value ? color : Colors.surface.elevated }]}
    >
      <View style={[ds.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </TouchableOpacity>
  );
}

const ds = StyleSheet.create({
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  knob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});

export default function DevicesScreen({ navigation }) {
  const { token } = useAuth();
  const [devices,      setDevices]      = useState([]);
  const [states,       setStates]       = useState({});
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [cmdLoading,   setCmdLoading]   = useState({});
  const [activeFilter, setActiveFilter] = useState('All');
  const [actTimeRange, setActTimeRange] = useState(ACTIVITY_RANGES[0]);
  const [activities,   setActivities]   = useState([]);
  const [actLoading,   setActLoading]   = useState(false);

  const fetchDevices = useCallback(async () => {
    try {
      const res  = await listDevices();
      const list = res.devices ?? [];
      setDevices(list);
      const sm = {};
      list.forEach(d => { sm[d.feed_key ?? d.key] = d.value ?? d.last_value ?? null; });
      setStates(sm);
    } catch (e) {
      console.warn('Devices fetch failed:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const fetchActivities = useCallback(async () => {
    if (!token || devices.length === 0) return;
    setActLoading(true);
    const end      = new Date();
    const start    = new Date(end.getTime() - actTimeRange.ms);
    const feedKeys = activeFilter === 'All'
      ? devices.map(d => d.feed_key ?? d.key)
      : devices.filter(d => TYPE_FILTER[d.type] === activeFilter).map(d => d.feed_key ?? d.key);
    try {
      const results = await Promise.allSettled(
        feedKeys.map(key => getDeviceActivities(token, key, toApiTime(start), toApiTime(end)))
      );
      const merged = [];
      results.forEach((res, i) => {
        if (res.status !== 'fulfilled') return;
        const key    = feedKeys[i];
        const device = devices.find(d => (d.feed_key ?? d.key) === key);
        const rows   = Array.isArray(res.value) ? res.value : (res.value?.data ?? []);
        rows.forEach(pt => {
          const t = new Date(pt.timestamp ?? pt.created_at);
          if (!isNaN(t)) merged.push({ name: device?.name ?? key, type: device?.type, value: pt.value, time: t });
        });
      });
      merged.sort((a, b) => b.time - a.time);
      setActivities(merged);
    } catch (e) {
      console.warn('fetchActivities failed:', e.message);
    } finally {
      setActLoading(false);
    }
  }, [token, devices, activeFilter, actTimeRange]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  async function handleToggle(key) {
    const next = parseBool(states[key]) ? 'OFF' : 'ON';
    setCmdLoading(p => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, next, token);
      setStates(p => ({ ...p, [key]: next }));
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
      setStates(p => ({ ...p, [key]: next }));
    } catch (e) {
      console.warn(e.message);
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  async function handleSlider(key, val) {
    setStates(p => ({ ...p, [key]: String(val) }));
    try {
      await setDeviceState(key, String(val), token);
    } catch (e) {
      console.warn(e.message);
    }
  }

  const filteredDevices = devices.filter(d =>
    activeFilter === 'All' || TYPE_FILTER[d.type] === activeFilter
  );

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
          <Text style={s.title}>Devices</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <TouchableOpacity
          style={s.avatar}
          onPress={() => navigation?.navigate('AccountSettings')}
        >
          <Ionicons name="person" size={18} color={Colors.text.title} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchDevices(); }}
            tintColor={Colors.primary.default}
          />
        }
      >

        {/* ── Filter chips ───────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f}
              style={[s.chip, activeFilter === f && s.chipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[s.chipText, activeFilter === f && s.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Room cards ─────────────────────────────── */}
        {(() => {
          const scopedDevices = activeFilter === 'All'
            ? devices
            : devices.filter(d => TYPE_FILTER[d.type] === activeFilter);
          const rooms = Object.values(
            scopedDevices.reduce((acc, d) => {
              const loc = d.location || 'Default';
              if (!acc[loc]) acc[loc] = { name: loc, count: 0, devices: [] };
              acc[loc].count++;
              acc[loc].devices.push(d);
              return acc;
            }, {})
          );
          if (rooms.length === 0) return null;
          return (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.roomRow}
            >
              {rooms.map(room => (
                <TouchableOpacity
                  key={room.name}
                  style={s.roomCard}
                  onPress={() => navigation?.navigate('RoomSetting', { roomName: room.name, devices: room.devices })}
                  activeOpacity={0.8}
                >
                  <Ionicons name={roomIcon(room.name)} size={26} color={Colors.primary.default} />
                  <View style={{ flex: 1 }} />
                  <Text style={s.roomName}>{room.name}</Text>
                  <Text style={s.roomCount}>{room.count} device{room.count !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          );
        })()}

        {/* ── Device list ────────────────────────────── */}
        <View style={s.deviceList}>
          {filteredDevices.map((device, i) => {
            const key      = device.feed_key ?? device.key;
            const meta     = TYPE_META[device.type] ?? TYPE_META.GENERIC;
            const val      = states[key];
            const busy     = !!cmdLoading[key];
            const isSlider = device.type === 'LIGHT' || device.type === 'RGB';
            const numVal   = parseFloat(val) || 0;

            const numericOn = !isNaN(parseFloat(val)) && parseFloat(val) > 0;
            const isActive  = meta.isDoor ? !parseBool(val) : numericOn || parseBool(val);

            const statusLabel    = meta.isDoor ? (parseBool(val) ? 'OPEN' : 'LOCKED') : isActive ? 'ON' : 'OFF';
            const badgeLabel     = isSlider ? (isActive ? String(Math.round(numVal)) : 'OFF') : statusLabel;
            const badgeColor     = isActive ? Colors.primary.default : Colors.surface.elevated;
            const badgeTextColor = isActive ? Colors.primary.default : Colors.text.caption;

            return (
              <View key={key} style={[s.deviceRow, i > 0 && s.deviceBorder]}>

                {/* Icon box */}
                <View style={[s.iconBox, {
                  backgroundColor: isActive ? Colors.primary.darker + '55' : Colors.surface.elevated + '55',
                }]}>
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={isActive ? Colors.primary.default : Colors.text.caption}
                  />
                </View>

                {/* Name */}
                <View style={s.deviceInfo}>
                  <Text style={s.deviceName}>{device.name ?? key}</Text>
                  {isSlider && (
                    <HorizontalSlider
                      value={numVal}
                      color={Colors.primary.default}
                      onChange={v => handleSlider(key, v)}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </View>

                {/* Badge + control */}
                <View style={s.deviceRight}>
                  <View style={[s.badge, {
                    backgroundColor: badgeColor + '22',
                    borderColor:     badgeColor,
                  }]}>
                    <Text style={[s.badgeText, { color: badgeTextColor }]}>
                      {badgeLabel}
                    </Text>
                  </View>

                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.primary.default} />
                  ) : isSlider ? null : meta.isDoor ? (
                    <Toggle
                      value={isActive}
                      color={Colors.success}
                      onPress={() => handleDoor(key, parseBool(val) ? 'CLOSE' : 'OPEN')}
                    />
                  ) : (
                    <Toggle
                      value={isActive}
                      color={Colors.success}
                      onPress={() => handleToggle(key)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Device Activities ──────────────────────── */}
        <View style={s.actSectionHeader}>
          <Text style={s.actSectionTitle}>DEVICE ACTIVITIES</Text>
        </View>
        <View style={s.actTimeRow}>
          {ACTIVITY_RANGES.map(range => (
            <TouchableOpacity
              key={range.label}
              style={[s.actChip, actTimeRange === range && s.actChipActive]}
              onPress={() => setActTimeRange(range)}
            >
              <Text style={[s.actChipText, actTimeRange === range && s.actChipTextActive]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.actList}>
          {actLoading ? (
            <ActivityIndicator color={Colors.primary.default} style={{ padding: Spacing.xl }} />
          ) : activities.length === 0 ? (
            <View style={s.actEmptyRow}>
              <Text style={s.actEmptyText}>No activity in this period</Text>
            </View>
          ) : (
            activities.map((act, i) => (
              <View key={i} style={[s.actItem, i > 0 && s.actBorder]}>
                <Ionicons name={actIcon(act.type, act.value)} size={16} color={actColor(act.type, act.value)} />
                <Text style={s.actName} numberOfLines={1}>{act.name}</Text>
                <Text style={[s.actValue, { color: actColor(act.type, act.value) }]}>{act.value}</Text>
                <Text style={s.actTime}>{formatAge(act.time)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: Spacing.xxxl + 20 }} />
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

  filterRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.lg,
    gap:               Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.sm,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.card,
  },
  chipActive:     { backgroundColor: Colors.primary.default },
  chipText:       { color: Colors.text.caption, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  chipTextActive: { color: Colors.text.onGold },

  roomRow: {
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.lg,
    gap:               Spacing.md,
  },
  roomCard: {
    width:           120,
    height:          120,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    justifyContent:  'space-between',
  },
  roomName:  { color: Colors.text.title,   fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginTop: Spacing.sm },
  roomCount: { color: Colors.text.caption, fontSize: Typography.size.xs, marginTop: 2 },

  deviceList: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.lg,
    gap:           Spacing.lg,
  },
  deviceBorder: { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  iconBox: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceInfo: { flex: 1 },
  deviceName: { color: Colors.text.title,   fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  deviceRoom: { color: Colors.text.caption, fontSize: Typography.size.xs, marginTop: 2 },
  deviceRight: { alignItems: 'flex-end', gap: Spacing.xs },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    borderRadius:      Radius.full,
    borderWidth:       1,
  },
  badgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },

  actSectionHeader: {
    paddingHorizontal: Spacing.xl,
    marginTop:         Spacing.xl,
    marginBottom:      Spacing.md,
  },
  actSectionTitle: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  actTimeRow: {
    flexDirection:     'row',
    paddingHorizontal: Spacing.xl,
    gap:               Spacing.sm,
    marginBottom:      Spacing.md,
  },
  actChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.surface.card,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  actChipActive:     { backgroundColor: Colors.surface.elevated, borderColor: Colors.text.caption },
  actChipText:       { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
  actChipTextActive: { color: Colors.text.title },
  actList: {
    marginHorizontal: Spacing.xl,
    backgroundColor:  Colors.surface.card,
    borderRadius:     Radius.lg,
    overflow:         'hidden',
  },
  actItem:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  actBorder:   { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  actName:     { flex: 1, color: Colors.text.body, fontSize: Typography.size.sm },
  actValue:    { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  actTime:     { color: Colors.text.caption, fontSize: Typography.size.xs },
  actEmptyRow: { padding: Spacing.xl, alignItems: 'center' },
  actEmptyText:{ color: Colors.text.caption, fontSize: Typography.size.sm },
});
