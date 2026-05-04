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

const TYPE_META = {
  DOOR:    { icon: 'key-outline',           isDoor: true  },
  LIGHT:   { icon: 'bulb-outline',          isToggle: true },
  DIMMER:  { icon: 'sunny-outline',         isToggle: true },
  MOTION:  { icon: 'eye-outline',           isToggle: true },
  RGB:     { icon: 'color-palette-outline', isToggle: true },
  GENERIC: { icon: 'flash-outline',         isToggle: true },
};

function parseBool(val) {
  const s = String(val ?? '').toUpperCase();
  return s === 'ON' || s === '1' || s === 'TRUE' || s === 'OPEN';
}

export default function DevicesScreen() {
  const { token } = useAuth();
  const [devices,    setDevices]    = useState([]);
  const [states,     setStates]     = useState({});
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cmdLoading, setCmdLoading] = useState({});

  const fetchDevices = useCallback(async () => {
    try {
      const res = await listDevices();
      const list = res.devices ?? [];
      setDevices(list);
      const sm = {};
      list.forEach(d => { sm[d.key] = d.last_value ?? d.value ?? null; });
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

  async function handleDoor(key, state) {
    setCmdLoading(p => ({ ...p, [key]: true }));
    try {
      await setDeviceState(key, state, token);
      setStates(p => ({ ...p, [key]: state }));
    } catch (e) {
      console.warn(e.message);
    } finally {
      setCmdLoading(p => ({ ...p, [key]: false }));
    }
  }

  const onRefresh = () => { setRefreshing(true); fetchDevices(); };

  const onlineCount = devices.filter(d => parseBool(states[d.key])).length;

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
        <Text style={s.headerTitle}>Devices</Text>
        <View style={s.badge}>
          <Text style={s.badgeText}>{onlineCount} / {devices.length} active</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary.default} />}
      >
        {devices.map(device => {
          const meta  = TYPE_META[device.type] ?? TYPE_META.GENERIC;
          const val   = states[device.key];
          const isOn  = parseBool(val);
          const busy  = !!cmdLoading[device.key];

          return (
            <View
              key={device.key}
              style={[s.card, { borderLeftColor: isOn ? Colors.state.on : Colors.state.off }]}
            >
              {/* Left: icon + name */}
              <View style={s.cardLeft}>
                <View style={[s.iconWrap, { backgroundColor: isOn ? Colors.primary.darker + '60' : Colors.surface.elevated + '40' }]}>
                  <Ionicons name={meta.icon} size={20} color={isOn ? Colors.primary.default : Colors.text.caption} />
                </View>
                <View>
                  <Text style={s.cardName}>{device.name ?? device.key}</Text>
                  <Text style={s.cardSub}>{device.type} · {device.key}</Text>
                </View>
              </View>

              {/* Right: control */}
              <View style={s.cardRight}>
                {busy ? (
                  <ActivityIndicator color={Colors.primary.default} size="small" />
                ) : meta.isDoor ? (
                  <View style={s.doorRow}>
                    <TouchableOpacity
                      style={[s.doorBtn, val === 'OPEN' && s.doorBtnOn]}
                      onPress={() => handleDoor(device.key, 'OPEN')}
                    >
                      <Text style={[s.doorBtnText, val === 'OPEN' && { color: Colors.text.onGold }]}>Open</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.doorBtn, val !== 'OPEN' && s.doorBtnOn]}
                      onPress={() => handleDoor(device.key, 'CLOSE')}
                    >
                      <Text style={[s.doorBtnText, val !== 'OPEN' && { color: Colors.text.onGold }]}>Close</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[s.toggle, isOn && s.toggleOn]}
                    onPress={() => handleToggle(device.key)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.thumb, isOn && s.thumbOn]} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

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
  headerTitle: {
    flex:       1,
    fontSize:   Typography.size.xl,
    color:      Colors.text.title,
    fontWeight: Typography.weight.bold,
  },
  badge: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.full,
    backgroundColor:   Colors.success + '22',
  },
  badgeText: { fontSize: Typography.size.xs, color: Colors.success, fontWeight: Typography.weight.semibold },

  list: { padding: Spacing.xl, gap: Spacing.md },

  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.lg,
    borderLeftWidth: 4,
  },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  iconWrap: { width: 42, height: 42, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: Typography.size.md, color: Colors.text.title, fontWeight: Typography.weight.medium },
  cardSub:  { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', minWidth: 90 },

  // Toggle switch
  toggle: {
    width: 48, height: 26,
    borderRadius: 13,
    backgroundColor: Colors.state.off,
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: { backgroundColor: Colors.state.on },
  thumb: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: Colors.text.title,
    alignSelf: 'flex-start',
  },
  thumbOn: { alignSelf: 'flex-end' },

  // Door buttons
  doorRow:    { flexDirection: 'row', gap: Spacing.xs },
  doorBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
    borderRadius:      Radius.md,
    borderWidth:       1,
    borderColor:       Colors.surface.elevated,
  },
  doorBtnOn:   { backgroundColor: Colors.primary.default, borderColor: Colors.primary.default },
  doorBtnText: { color: Colors.text.body, fontSize: Typography.size.xs, fontWeight: Typography.weight.medium },
});
