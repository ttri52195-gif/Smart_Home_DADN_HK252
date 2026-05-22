import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listDevices, setDeviceState, getAwayMode, setAwayMode } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// Door has three distinct states: OPEN (physically open), CLOSE (closed, unlocked), LOCKED
function doorStyleFor(rawState) {
  switch ((rawState ?? '').toUpperCase()) {
    case 'LOCKED':
      return { icon: 'lock-closed',  badge: 'LOCKED', color: Colors.success };
    case 'OPEN':
      return { icon: 'lock-open',    badge: 'OPEN',   color: Colors.warning  };
    case 'CLOSE':
    case 'CLOSED':
      return { icon: 'lock-open',    badge: 'CLOSED', color: Colors.info     };
    default:
      return { icon: 'help-outline', badge: '—',      color: Colors.text.caption };
  }
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function Toggle({ value, color, onPress, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[s.toggle, { backgroundColor: value ? color : Colors.surface.elevated }]}
    >
      <View style={[s.toggleKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const { token } = useAuth();

  const [awayMode,     setAwayState]   = useState(false);
  const [doors,        setDoors]       = useState([]);
  const [loading,      setLoading]     = useState(true);
  const [togglingAway, setTogglingAway] = useState(false);
  const [togglingId,   setTogglingId]  = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [awayRes, devRes] = await Promise.all([
        getAwayMode(token),
        listDevices(),
      ]);
      setAwayState(awayRes?.enabled === true);
      const allDev = devRes?.devices ?? (Array.isArray(devRes) ? devRes : []);
      setDoors(allDev.filter(d => d.type === 'DOOR'));
    } catch (e) {
      console.warn('SettingsScreen load error:', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAway() {
    const next = !awayMode;
    setTogglingAway(true);
    setAwayState(next);
    try {
      await setAwayMode(token, next);
      // Refresh door states — backend commands them immediately on away toggle
      const devRes = await listDevices();
      const allDev = devRes?.devices ?? (Array.isArray(devRes) ? devRes : []);
      setDoors(allDev.filter(d => d.type === 'DOOR'));
    } catch (e) {
      setAwayState(!next);
      console.warn('setAwayMode error:', e.message);
    } finally {
      setTogglingAway(false);
    }
  }

  // Toggle between LOCKED ↔ CLOSE. OPEN doors cannot be toggled (physically open).
  async function handleToggleDoor(door) {
    const current = (door.value ?? door.last_value ?? 'CLOSE').toUpperCase();
    if (current === 'OPEN') return;
    const next = current === 'LOCKED' ? 'CLOSE' : 'LOCKED';
    setTogglingId(door.feed_key);
    setDoors(prev => prev.map(d =>
      d.feed_key === door.feed_key ? { ...d, value: next } : d
    ));
    try {
      await setDeviceState(door.feed_key, next, token);
    } catch (e) {
      setDoors(prev => prev.map(d =>
        d.feed_key === door.feed_key ? { ...d, value: current } : d
      ));
      console.warn('toggleDoor error:', e.message);
    } finally {
      setTogglingId(null);
    }
  }

  const lockedCount = doors.filter(d => (d.value ?? d.last_value ?? '').toUpperCase() === 'LOCKED').length;
  const openCount   = doors.filter(d => (d.value ?? d.last_value ?? '').toUpperCase() === 'OPEN').length;

  function awaySubText() {
    if (awayMode) return 'All doors locked · All devices off';
    if (openCount > 0) return `${openCount} door(s) open · ${lockedCount} locked`;
    if (lockedCount > 0) return `${lockedCount} door(s) locked`;
    return 'All doors unlocked';
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Home Settings</Text>
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
        contentContainerStyle={s.content}
      >

        {/* ── Away Mode banner ───────────────────────── */}
        <View style={[s.awayBanner, { borderColor: awayMode ? Colors.success : Colors.warning }]}>
          <View style={[s.awayIcon, {
            backgroundColor: awayMode ? Colors.success + '22' : Colors.warning + '22',
          }]}>
            <Ionicons
              name={awayMode ? 'shield-checkmark' : 'shield'}
              size={28}
              color={Colors.text.title}
            />
          </View>

          <Text style={s.awayTitle}>
            {awayMode ? 'Away Mode is enabled!' : 'Away Mode is inactive!'}
          </Text>

          <Text style={[s.awaySub, { color: awayMode ? Colors.success : Colors.primary.default }]}>
            {awaySubText()}
          </Text>

          <TouchableOpacity
            style={[s.awayBtn, { borderColor: awayMode ? Colors.warning : Colors.success }]}
            onPress={handleToggleAway}
            disabled={togglingAway}
            activeOpacity={0.85}
          >
            {togglingAway
              ? <ActivityIndicator size="small" color={awayMode ? Colors.warning : Colors.success} />
              : <Text style={[s.awayBtnText, { color: awayMode ? Colors.warning : Colors.success }]}>
                  {awayMode ? 'Disable Away Mode' : 'Enable Away Mode'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        {/* ── Door Locks ─────────────────────────────── */}
        <Text style={s.sectionLabel}>DOOR LOCKS</Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary.default} style={{ padding: Spacing.xl }} />
        ) : (
          <View style={s.doorList}>
            {doors.length === 0 ? (
              <View style={s.emptyRow}>
                <Text style={s.emptyText}>No door devices found.</Text>
              </View>
            ) : (
              doors.map((door, i) => {
                const rawState  = (door.value ?? door.last_value ?? 'CLOSE').toUpperCase();
                const ds        = doorStyleFor(rawState);
                const isLocked  = rawState === 'LOCKED';
                const isOpen    = rawState === 'OPEN';
                const isToggling = togglingId === door.feed_key;

                return (
                  <View
                    key={door.feed_key}
                    style={[s.doorRow, i > 0 && s.doorBorder, { borderLeftColor: ds.color + '55' }]}
                  >
                    <View style={[s.doorIconBox, { backgroundColor: ds.color + '22' }]}>
                      <Ionicons name={ds.icon} size={22} color={ds.color} />
                    </View>

                    <View style={s.doorInfo}>
                      <Text style={s.doorName}>{door.name ?? door.feed_key}</Text>
                      {door.location
                        ? <Text style={[s.doorLocation, { color: ds.color }]}>{door.location}</Text>
                        : null
                      }
                    </View>

                    <View style={s.doorRight}>
                      <View style={[s.doorBadge, { backgroundColor: ds.color + '22', borderColor: ds.color }]}>
                        <Text style={[s.doorBadgeText, { color: ds.color }]}>{ds.badge}</Text>
                      </View>

                      {/* OPEN: physically open — show warning, no toggle */}
                      {isOpen ? (
                        <Ionicons name="alert-circle-outline" size={22} color={Colors.warning} />
                      ) : isToggling ? (
                        <ActivityIndicator size="small" color={Colors.primary.default} />
                      ) : (
                        <Toggle
                          value={isLocked}
                          color={awayMode ? Colors.state.auto : Colors.success}
                          onPress={() => !awayMode && handleToggleDoor(door)}
                          disabled={awayMode || isToggling}
                        />
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── State legend ───────────────────────────── */}
        <View style={s.legend}>
          {[
            { color: Colors.warning, label: 'OPEN — door is physically open' },
            { color: Colors.info,    label: 'CLOSED — closed but unlocked' },
            { color: Colors.success, label: 'LOCKED — closed and locked' },
          ].map(({ color, label }) => (
            <View key={label} style={s.legendRow}>
              <View style={[s.legendDot, { backgroundColor: color }]} />
              <Text style={s.legendText}>{label}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.base },

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

  content: {
    paddingHorizontal: Spacing.xl,
    paddingBottom:     Spacing.xxxl + 20,
    gap:               Spacing.xl,
    paddingTop:        Spacing.sm,
  },

  // Away banner
  awayBanner: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.xl,
    borderWidth:     1.5,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.md,
  },
  awayIcon: {
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
  },
  awayTitle: {
    color:      Colors.text.title,
    fontSize:   Typography.size.lg,
    fontWeight: Typography.weight.bold,
    textAlign:  'center',
  },
  awaySub: { fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 18 },
  awayBtn: {
    borderWidth:       1.5,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical:   Spacing.sm,
    marginTop:         Spacing.xs,
    minWidth:          180,
    alignItems:        'center',
  },
  awayBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  sectionLabel: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Door list
  doorList: { backgroundColor: Colors.surface.card, borderRadius: Radius.lg },
  doorRow: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         Spacing.lg,
    gap:             Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  doorBorder:   { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  doorIconBox:  {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  doorInfo:     { flex: 1 },
  doorName:     { color: Colors.text.title, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  doorLocation: { fontSize: Typography.size.sm, marginTop: 2 },
  doorRight:    { alignItems: 'flex-end', gap: Spacing.sm },
  doorBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
    borderRadius:      Radius.full,
    borderWidth:       1,
  },
  doorBadgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },

  toggle: {
    width: 44, height: 24, borderRadius: 12,
    padding: 2, justifyContent: 'center',
  },
  toggleKnob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },

  emptyRow:  { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.text.caption, fontSize: Typography.size.sm },

  // Legend
  legend:    { gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: Typography.size.xs, color: Colors.text.caption },
});
