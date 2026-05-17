import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../theme';

const DOOR_LOCKS = [
  { id: 'garden_front', name: 'Front Door', location: 'Garden',      status: 'locked', active: true  },
  { id: 'living_front', name: 'Front Door', location: 'Living Room', status: 'error',  active: false },
  { id: 'living_back',  name: 'Front Door', location: 'Living Room', status: 'open',   active: true  },
];

function doorStyle(status, awayMode) {
  const effective = awayMode && status !== 'error' ? 'locked' : status;
  switch (effective) {
    case 'locked': return { iconBg: Colors.success,         badge: 'LOCKED', color: Colors.success };
    case 'error':  return { iconBg: Colors.error,           badge: 'ERROR',  color: Colors.error   };
    case 'open':   return { iconBg: Colors.warning,         badge: 'OPEN',   color: Colors.warning  };
    default:       return { iconBg: Colors.surface.elevated, badge: '—',      color: Colors.text.caption };
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
  const [awayMode,    setAwayMode]    = useState(false);
  const [doorStates,  setDoorStates]  = useState(
    Object.fromEntries(DOOR_LOCKS.map(d => [d.id, d.status]))
  );

  function toggleAway() {
    const next = !awayMode;
    setAwayMode(next);
    if (next) {
      setDoorStates(prev =>
        Object.fromEntries(
          DOOR_LOCKS.map(d => [
            d.id,
            prev[d.id] === 'error' ? 'error' : 'locked',
          ])
        )
      );
    }
  }

  function toggleDoor(id) {
    setDoorStates(prev => ({
      ...prev,
      [id]: prev[id] === 'locked' ? 'open' : 'locked',
    }));
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
        <View style={[s.awayBanner, {
          borderColor: awayMode ? Colors.success : Colors.warning,
        }]}>
          <View style={[s.awayIcon, {
            backgroundColor: awayMode
              ? Colors.success + '22'
              : Colors.warning + '22',
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
            {awayMode
              ? 'All doors locked\nPIR sensor active'
              : 'Unlocked doors: Garden 1, Master Bedroom\nPIR sensor active'}
          </Text>

          <TouchableOpacity
            style={[s.awayBtn, {
              borderColor: awayMode ? Colors.warning : Colors.success,
            }]}
            onPress={toggleAway}
          >
            <Text style={[s.awayBtnText, {
              color: awayMode ? Colors.warning : Colors.success,
            }]}>
              {awayMode ? 'Disable Away Mode' : 'Enable Away Mode'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Door Locks ─────────────────────────────── */}
        <Text style={s.sectionLabel}>DOOR LOCKS</Text>
        <View style={s.doorList}>
          {DOOR_LOCKS.map((door, i) => {
            const status  = doorStates[door.id];
            const ds      = doorStyle(status, awayMode);
            const isLocked = awayMode
              ? status !== 'error'
              : status === 'locked';
            const toggleColor = awayMode ? Colors.state.auto : Colors.success;

            return (
              <View
                key={door.id}
                style={[
                  s.doorRow,
                  i > 0 && s.doorBorder,
                  { borderLeftColor: ds.color + '55' },
                ]}
              >
                {/* Icon box */}
                <View style={[s.doorIconBox, { backgroundColor: ds.iconBg + '33' }]}>
                  <Ionicons
                    name={status === 'open' && !awayMode ? 'lock-open' : 'lock-closed'}
                    size={22}
                    color={ds.iconBg}
                  />
                </View>

                {/* Name + location + active state */}
                <View style={s.doorInfo}>
                  <Text style={s.doorName}>{door.name}</Text>
                  <Text style={[s.doorLocation, { color: ds.color }]}>{door.location}</Text>
                  <Text style={[s.doorActive, { color: ds.color }]}>
                    {door.active ? 'Active' : 'Inactive'}
                  </Text>
                </View>

                {/* Badge + toggle */}
                <View style={s.doorRight}>
                  <View style={[s.doorBadge, {
                    backgroundColor: ds.color + '22',
                    borderColor:     ds.color,
                  }]}>
                    <Text style={[s.doorBadgeText, { color: ds.color }]}>
                      {ds.badge}
                    </Text>
                  </View>

                  {status !== 'error' && (
                    <Toggle
                      value={isLocked}
                      color={toggleColor}
                      onPress={() => !awayMode && toggleDoor(door.id)}
                      disabled={awayMode}
                    />
                  )}
                </View>
              </View>
            );
          })}
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
  title: { color: Colors.text.title,   fontSize: 26, fontWeight: Typography.weight.bold },
  date:  { color: Colors.text.caption, fontSize: Typography.size.sm, marginTop: 2 },
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
  awaySub: {
    fontSize:   Typography.size.sm,
    textAlign:  'center',
    lineHeight: 18,
  },
  awayBtn: {
    borderWidth:       1.5,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.xxl,
    paddingVertical:   Spacing.sm,
    marginTop:         Spacing.xs,
  },
  awayBtnText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold },

  sectionLabel: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  doorList: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  doorRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.lg,
    gap:           Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  doorBorder: { borderTopWidth: 0.5, borderTopColor: Colors.surface.elevated },
  doorIconBox: {
    width: 48, height: 48, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  doorInfo:     { flex: 1 },
  doorName:     { color: Colors.text.title,   fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  doorLocation: { fontSize: Typography.size.sm, marginTop: 2 },
  doorActive:   { fontSize: Typography.size.xs, marginTop: 1 },
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
});
