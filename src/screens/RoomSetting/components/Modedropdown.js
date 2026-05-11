/**
 * components/ModeDropdown.js
 *
 * Dropdown chọn chế độ: Manual / Automatic / Schedule
 * Khớp với Figma: nền vàng gold khi active, arrow icon.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../../theme';

export default function ModeDropdown({
  modes,
  selected,
  open,
  onToggle,
  onSelect,
}) {
  const current = modes.find((m) => m.key === selected);

  return (
    <View style={s.wrapper}>
      {/* ── Trigger button ──────────────────────────── */}
      <TouchableOpacity
        style={s.trigger}
        onPress={onToggle}
        activeOpacity={0.85}
      >
        <Text style={s.triggerText}>{current?.label ?? 'Select'}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={Colors.text.onGold}
          style={{ marginLeft: Spacing.xs }}
        />
      </TouchableOpacity>

      {/* ── Dropdown list ───────────────────────────── */}
      {open && (
        <View style={s.dropdown}>
          {modes.map((m, idx) => {
            const isSelected = m.key === selected;
            return (
              <TouchableOpacity
                key={m.key}
                style={[
                  s.option,
                  isSelected && s.optionActive,
                  idx < modes.length - 1 && s.optionBorder,
                ]}
                onPress={() => onSelect(m.key)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={m.icon}
                  size={16}
                  color={isSelected ? Colors.primary.default : Colors.text.body}
                  style={{ marginRight: Spacing.md }}
                />
                <Text style={[s.optionText, isSelected && s.optionTextActive]}>
                  {m.label}
                </Text>
                {isSelected && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={Colors.primary.default}
                    style={{ marginLeft: 'auto' }}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 200,
  },

  // Trigger
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary.default,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    minWidth: 120,
  },
  triggerText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
    color: Colors.text.onGold,
    flex: 1,
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
    overflow: 'hidden',
    // Shadow
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },

  // Option row
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionActive: {
    backgroundColor: Colors.primary.darker + '40',
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.elevated,
  },
  optionText: {
    fontSize: Typography.size.md,
    color: Colors.text.body,
    fontWeight: Typography.weight.regular,
  },
  optionTextActive: {
    color: Colors.primary.default,
    fontWeight: Typography.weight.semibold,
  },
});
