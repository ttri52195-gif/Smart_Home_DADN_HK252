import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listDevices, setDeviceState } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const FILTERS = ['All', 'Doors', 'Lights', 'Curtains', 'Climate'];

const ROOMS = [
  { id: 'bedroom', name: 'Master Bedroom', icon: 'bed-outline',        count: 4 },
  { id: 'living',  name: 'Living Room',    icon: 'tv-outline',          count: 5 },
  { id: 'kitchen', name: 'Kitchen',        icon: 'restaurant-outline',  count: 1 },
];

const TYPE_FILTER = {
  DOOR:    'Doors',
  LIGHT:   'Lights',
  DIMMER:  'Lights',
  RGB:     'Curtains',
  MOTION:  'Climate',
  GENERIC: 'Climate',
};

const TYPE_META = {
  DOOR:    { icon: 'lock-closed-outline', isDoor: true  },
  LIGHT:   { icon: 'bulb-outline',        isToggle: true },
  DIMMER:  { icon: 'sunny-outline',       isToggle: true },
  MOTION:  { icon: 'aperture-outline',    isToggle: true, isAuto: true },
  RGB:     { icon: 'reorder-three-outline', isToggle: true, isAuto: true },
  GENERIC: { icon: 'flash-outline',       isToggle: true },
};

const DEVICE_ROOM = {
  lb1:        'Master Bedroom',
  door:       'Garden',
  pir:        'Living Room',
  rgb:        'Living Room',
  'light-pwm': 'Living Room',
};

function parseBool(val) {
  const v = String(val ?? '').toUpperCase();
  return v === 'ON' || v === '1' || v === 'TRUE' || v === 'OPEN';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.roomRow}
        >
          {ROOMS.map(room => (
            <TouchableOpacity
              key={room.id}
              style={s.roomCard}
              onPress={() =>
                navigation.navigate('RoomSetting', {
                  roomName: room.name,
                  devices: devices.map(d => ({
                    key:        d.feed_key ?? d.key,
                    name:       d.name,
                    type:       d.type,
                    last_value: states[d.feed_key ?? d.key],
                  })),
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name={room.icon} size={34} color={Colors.text.title} />
              <Text style={s.roomName}>{room.name}</Text>
              <Text style={s.roomCount}>{room.count} devices</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Device list ────────────────────────────── */}
        <View style={s.deviceList}>
          {filteredDevices.map((device, i) => {
            const key    = device.feed_key ?? device.key;
            const meta   = TYPE_META[device.type] ?? TYPE_META.GENERIC;
            const val    = states[key];
            const isOn   = parseBool(val);
            const busy   = !!cmdLoading[key];
            const isAuto = meta.isAuto;

            const statusLabel = meta.isDoor
              ? (isOn ? 'OPEN' : 'LOCKED')
              : isAuto ? 'AUTO'
              : isOn ? 'ON' : 'OFF';

            const badgeColor = isAuto ? Colors.state.auto
              : isOn           ? Colors.primary.default
              :                  Colors.surface.elevated;

            const badgeTextColor = isAuto ? Colors.state.auto
              : isOn              ? Colors.primary.default
              :                     Colors.text.caption;

            return (
              <View key={key} style={[s.deviceRow, i > 0 && s.deviceBorder]}>

                {/* Icon box */}
                <View style={[s.iconBox, {
                  backgroundColor: isOn
                    ? Colors.primary.darker + '55'
                    : Colors.surface.elevated + '55',
                }]}>
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={isOn ? Colors.primary.default : Colors.text.caption}
                  />
                </View>

                {/* Name + room */}
                <View style={s.deviceInfo}>
                  <Text style={s.deviceName}>{device.name ?? key}</Text>
                  <Text style={s.deviceRoom}>{DEVICE_ROOM[key] ?? 'Home'}</Text>
                </View>

                {/* Badge + control */}
                <View style={s.deviceRight}>
                  <View style={[s.badge, {
                    backgroundColor: badgeColor + '22',
                    borderColor:     badgeColor,
                  }]}>
                    <Text style={[s.badgeText, { color: badgeTextColor }]}>
                      {statusLabel}
                    </Text>
                  </View>

                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.primary.default} />
                  ) : meta.isDoor ? (
                    <Toggle
                      value={!isOn}
                      color={Colors.success}
                      onPress={() => handleDoor(key, isOn ? 'CLOSE' : 'OPEN')}
                    />
                  ) : (
                    <Toggle
                      value={isAuto ? true : isOn}
                      color={isAuto ? Colors.state.auto : Colors.success}
                      onPress={() => !isAuto && handleToggle(key)}
                    />
                  )}
                </View>
              </View>
            );
          })}
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
    width:           130,
    height:          130,
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    justifyContent:  'flex-end',
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
});
