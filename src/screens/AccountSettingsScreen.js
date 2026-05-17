import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';
import BottomNavBar from '../components/BottomNavBar';

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function Toggle({ value, onToggle }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={[t.toggle, { backgroundColor: value ? Colors.primary.default : Colors.surface.elevated }]}
    >
      <View style={[t.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </TouchableOpacity>
  );
}

const t = StyleSheet.create({
  toggle: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  knob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});

function SettingRow({ icon, label, toggleValue, onToggle, value }) {
  return (
    <View style={s.row}>
      <Ionicons name={icon} size={18} color={Colors.primary.default} style={{ flexShrink: 0 }} />
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        {value !== undefined && (
          <Text style={s.rowValue}>{value}</Text>
        )}
        {onToggle !== undefined ? (
          <Toggle value={toggleValue} onToggle={onToggle} />
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={Colors.text.caption} />
      </View>
    </View>
  );
}

export default function AccountSettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();

  const [deviceNotif, setDeviceNotif] = useState(true);
  const [emailNotif,  setEmailNotif]  = useState(true);
  const [twoFAcc,     setTwoFAcc]     = useState(true);
  const [twoFHouse,   setTwoFHouse]   = useState(true);

  const displayName = user?.username ?? 'Nguyen Van Minh';
  const email       = user?.email    ?? 'minh.nguyen@example.com';

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Account Settings</Text>
          <Text style={s.date}>{formatDate()}</Text>
        </View>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={Colors.text.title} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >

        {/* ── Profile card ───────────────────────────── */}
        <View style={s.profileCard}>
          <View style={s.profileAvatar}>
            <Ionicons name="person" size={32} color={Colors.text.title} />
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{displayName}</Text>
            <Text style={s.profileRole}>Homeowner</Text>
            <Text style={s.profileEmail}>{email}</Text>
          </View>
        </View>

        {/* ── Notifications ──────────────────────────── */}
        <Text style={s.sectionLabel}>NOTIFICATIONS</Text>
        <View style={s.section}>
          <SettingRow
            icon="notifications-outline"
            label="Device Notifications"
            toggleValue={deviceNotif}
            onToggle={() => setDeviceNotif(v => !v)}
          />
          <View style={s.divider} />
          <SettingRow
            icon="mail-outline"
            label="Email Notifications"
            toggleValue={emailNotif}
            onToggle={() => setEmailNotif(v => !v)}
          />
          <View style={s.divider} />
          <SettingRow
            icon="warning-outline"
            label="Thresholds Settings"
          />
        </View>

        {/* ── Security ───────────────────────────────── */}
        <Text style={s.sectionLabel}>SECURITY</Text>
        <View style={s.section}>
          <SettingRow
            icon="shield-outline"
            label="Change Password"
          />
          <View style={s.divider} />
          <SettingRow
            icon="lock-closed-outline"
            label="Two-Factor Authentication"
            toggleValue={twoFAcc}
            onToggle={() => setTwoFAcc(v => !v)}
          />
          <View style={s.divider} />
          <SettingRow
            icon="keypad-outline"
            label="Manage Access Code"
          />
        </View>

        {/* ── Household ──────────────────────────────── */}
        <Text style={s.sectionLabel}>HOUSEHOLD</Text>
        <View style={s.section}>
          <SettingRow
            icon="people-outline"
            label="Family Member"
            value="2 members"
          />
          <View style={s.divider} />
          <SettingRow
            icon="lock-closed-outline"
            label="Two-Factor Authentication"
            toggleValue={twoFHouse}
            onToggle={() => setTwoFHouse(v => !v)}
          />
        </View>

        {/* ── Log out ────────────────────────────────── */}
        <TouchableOpacity style={s.logoutBtn} onPress={signOut}>
          <Text style={s.logoutText}>Log out</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomNavBar active="Settings" navigation={navigation} />
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
    paddingBottom:     Spacing.xl,
    gap:               Spacing.lg,
    paddingTop:        Spacing.sm,
  },

  profileCard: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.xl,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xl,
  },
  profileAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primary.brand,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo:  { flex: 1 },
  profileName:  { color: Colors.text.title,   fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  profileRole:  { color: Colors.text.caption, fontSize: Typography.size.sm, fontStyle: 'italic', marginTop: 2 },
  profileEmail: { color: Colors.text.caption, fontSize: Typography.size.sm, marginTop: 4 },

  sectionLabel: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom:  -Spacing.xs,
  },

  section: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    overflow:        'hidden',
  },
  divider: {
    height:          0.5,
    backgroundColor: Colors.surface.elevated,
    marginLeft:      Spacing.xl + 18 + Spacing.lg,
  },

  row: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.lg,
    gap:           Spacing.lg,
  },
  rowLabel: { flex: 1, color: Colors.text.title, fontSize: Typography.size.md },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rowValue: { color: Colors.text.caption, fontSize: Typography.size.sm },

  logoutBtn: {
    borderWidth:   1.5,
    borderColor:   Colors.error,
    borderRadius:  Radius.full,
    paddingVertical: Spacing.lg,
    alignItems:    'center',
    marginTop:     Spacing.sm,
  },
  logoutText: {
    color:      Colors.error,
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
});
