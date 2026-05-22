/**
 * RoomSettingScreen.js
 *
 * Màn hình cài đặt thiết bị theo phòng.
 * Hỗ trợ 3 chế độ: Manual | Automatic | Schedule
 *
 * Cách navigate tới màn hình này (ví dụ từ HomeScreen hoặc DevicesScreen):
 *   navigation.navigate('RoomSetting', {
 *     roomName: 'Bedroom',
 *     devices: [{ key: 'lb1', name: 'Light Bulb 1', type: 'LIGHT', last_value: 'ON' }, ...],
 *   });
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '../../theme';
import ModeDropdown from './components/Modedropdown';
import ManualMode from './components/ManualMode';
import AutomaticMode from './components/Automaticmode';
import ScheduleMode from './components/Schedulemode';

// ── Các chế độ ────────────────────────────────────────────────────
const MODES = [
  { key: 'manual', label: 'Manual', icon: 'hand-left-outline' },
  { key: 'automatic', label: 'Automatic', icon: 'flash-outline' },
];

// ── Component ─────────────────────────────────────────────────────
export default function RoomSettingScreen({ route, navigation }) {
  const { roomName = 'Bedroom', devices = [] } = route?.params ?? {};
  const [mode, setMode] = useState('manual');
  const [dropdownOpen, setDropdown] = useState(false);

  const selectedMode = MODES.find((m) => m.key === mode);

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={Colors.text.title} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{roomName}</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Mode Selector ──────────────────────────────────── */}
      <View style={s.modeRow}>
        <Text style={s.modeLabel}>Mode:</Text>
        <ModeDropdown
          modes={MODES}
          selected={mode}
          open={dropdownOpen}
          onToggle={() => setDropdown((o) => !o)}
          onSelect={(key) => {
            setMode(key);
            setDropdown(false);
          }}
        />
      </View>

      {/* ── Mode Content ───────────────────────────────────── */}
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // đóng dropdown khi scroll
        onScrollBeginDrag={() => setDropdown(false)}
      >
        {mode === 'manual' && <ManualMode devices={devices} />}
        {mode === 'automatic' && <AutomaticMode devices={devices} />}
        {mode === 'schedule' && <ScheduleMode devices={devices} />}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.surface.base,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface.overlay,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
    color: Colors.text.title,
  },

  // Mode row
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface.overlay,
    borderTopWidth: 1,
    borderTopColor: Colors.surface.elevated,
    zIndex: 100, // dropdown nổi lên trên content
  },
  modeLabel: {
    fontSize: Typography.size.md,
    color: Colors.text.subtitle,
    fontWeight: Typography.weight.medium,
    marginRight: Spacing.md,
  },

  // Scroll area
  content: { flex: 1 },
  contentInner: { padding: Spacing.xl, gap: Spacing.lg },
});
