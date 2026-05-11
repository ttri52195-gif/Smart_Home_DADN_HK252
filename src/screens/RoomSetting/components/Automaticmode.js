/**
 * components/AutomaticMode.js
 *
 * Chế độ Automatic: chọn thiết bị → thiết lập điều kiện sensor
 * (ví dụ: bật đèn khi độ sáng < 30, tắt quạt khi nhiệt độ < 25).
 *
 * Gọi BE: setting_profiles (temp/gas thresholds) hoặc có thể mở rộng
 * qua endpoint riêng. Hiện tại dùng local state + mock save.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { setDeviceState } from '../../../services/api';

// ── Sensor options ────────────────────────────────────────────────
const SENSOR_OPTIONS = [
  {
    key: 'temperature',
    label: 'Temperature',
    unit: '°C',
    icon: 'thermometer-outline',
    color: Colors.data.temperature,
  },
  {
    key: 'humidity',
    label: 'Humidity',
    unit: '%',
    icon: 'water-outline',
    color: Colors.data.humidity,
  },
  {
    key: 'gas',
    label: 'Gas',
    unit: '',
    icon: 'warning-outline',
    color: Colors.data.gas,
  },
  {
    key: 'themis',
    label: 'Light',
    unit: 'lx',
    icon: 'sunny-outline',
    color: Colors.data.light,
  },
];

const CONDITION_OPS = [
  { key: '>', label: '>' },
  { key: '<', label: '<' },
  { key: '>=', label: '≥' },
  { key: '<=', label: '≤' },
];

const ACTIONS = [
  { key: 'ON', label: 'Turn ON' },
  { key: 'OFF', label: 'Turn OFF' },
];

// ── Rule card ─────────────────────────────────────────────────────
function RuleCard({ rule, devices, onRemove, onChange }) {
  const device = devices.find((d) => d.key === rule.deviceKey);
  const sensor = SENSOR_OPTIONS.find((s) => s.key === rule.sensorKey);

  return (
    <View style={rc.card}>
      {/* Remove */}
      <TouchableOpacity style={rc.removeBtn} onPress={onRemove}>
        <Ionicons name="close-circle" size={20} color={Colors.error} />
      </TouchableOpacity>

      {/* Device select */}
      <Text style={rc.rowLabel}>Device</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: Spacing.md }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {devices.map((d) => (
            <TouchableOpacity
              key={d.key}
              style={[rc.chip, rule.deviceKey === d.key && rc.chipActive]}
              onPress={() => onChange({ ...rule, deviceKey: d.key })}
            >
              <Text
                style={[
                  rc.chipText,
                  rule.deviceKey === d.key && rc.chipTextActive,
                ]}
              >
                {d.name ?? d.key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sensor select */}
      <Text style={rc.rowLabel}>When sensor</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: Spacing.md }}
      >
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {SENSOR_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[rc.chip, rule.sensorKey === s.key && rc.chipActive]}
              onPress={() => onChange({ ...rule, sensorKey: s.key })}
            >
              <Ionicons
                name={s.icon}
                size={14}
                color={
                  rule.sensorKey === s.key
                    ? Colors.text.onGold
                    : Colors.text.body
                }
              />
              <Text
                style={[
                  rc.chipText,
                  rule.sensorKey === s.key && rc.chipTextActive,
                ]}
              >
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Condition + threshold */}
      <Text style={rc.rowLabel}>Condition</Text>
      <View style={rc.condRow}>
        {CONDITION_OPS.map((op) => (
          <TouchableOpacity
            key={op.key}
            style={[rc.opBtn, rule.op === op.key && rc.opBtnActive]}
            onPress={() => onChange({ ...rule, op: op.key })}
          >
            <Text style={[rc.opText, rule.op === op.key && rc.opTextActive]}>
              {op.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TextInput
          style={rc.thresholdInput}
          keyboardType="numeric"
          value={String(rule.threshold)}
          onChangeText={(v) => onChange({ ...rule, threshold: v })}
          placeholderTextColor={Colors.text.caption}
          placeholder="value"
        />
        {sensor && <Text style={rc.unitText}>{sensor.unit}</Text>}
      </View>

      {/* Action */}
      <Text style={rc.rowLabel}>Then action</Text>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[rc.chip, rule.action === a.key && rc.chipActive]}
            onPress={() => onChange({ ...rule, action: a.key })}
          >
            <Text
              style={[rc.chipText, rule.action === a.key && rc.chipTextActive]}
            >
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const rc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
  },
  rowLabel: {
    fontSize: Typography.size.sm,
    color: Colors.text.caption,
    fontWeight: Typography.weight.medium,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.elevated,
  },
  chipActive: { backgroundColor: Colors.primary.default },
  chipText: { fontSize: Typography.size.sm, color: Colors.text.body },
  chipTextActive: {
    color: Colors.text.onGold,
    fontWeight: Typography.weight.semibold,
  },

  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  opBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opBtnActive: { backgroundColor: Colors.primary.default },
  opText: { fontSize: Typography.size.md, color: Colors.text.body },
  opTextActive: {
    color: Colors.text.onGold,
    fontWeight: Typography.weight.bold,
  },
  thresholdInput: {
    width: 70,
    height: 36,
    backgroundColor: Colors.surface.overlay,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
    color: Colors.text.title,
    fontSize: Typography.size.md,
    paddingHorizontal: Spacing.md,
  },
  unitText: {
    fontSize: Typography.size.sm,
    color: Colors.text.caption,
  },
});

// ── AutomaticMode Component ───────────────────────────────────────
export default function AutomaticMode({ devices = [] }) {
  const { token } = useAuth();
  const [rules, setRules] = useState([]);
  const [saving, setSaving] = useState(false);

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        id: Date.now(),
        deviceKey: devices[0]?.key ?? '',
        sensorKey: 'temperature',
        op: '>',
        threshold: '30',
        action: 'ON',
      },
    ]);
  }

  function removeRule(id) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  function updateRule(id, updated) {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updated } : r)),
    );
  }

  async function handleSave() {
    if (rules.length === 0) {
      Alert.alert('No rules', 'Add at least one automation rule.');
      return;
    }
    setSaving(true);
    try {
      // DEV_MODE: chỉ simulate, production sẽ gọi BE endpoint riêng
      await new Promise((r) => setTimeout(r, 600));
      Alert.alert('Saved', `${rules.length} automation rule(s) saved.`);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={s.container}>
      {/* Info banner */}
      <View style={s.infoBanner}>
        <Ionicons name="flash-outline" size={16} color={Colors.state.auto} />
        <Text style={s.infoText}>
          Devices will react automatically based on sensor readings.
        </Text>
      </View>

      {/* Rules */}
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          devices={devices}
          onRemove={() => removeRule(rule.id)}
          onChange={(updated) => updateRule(rule.id, updated)}
        />
      ))}

      {/* Add rule button */}
      <TouchableOpacity style={s.addBtn} onPress={addRule} activeOpacity={0.8}>
        <Ionicons
          name="add-circle-outline"
          size={20}
          color={Colors.primary.default}
        />
        <Text style={s.addBtnText}>Add Rule</Text>
      </TouchableOpacity>

      {/* Save */}
      {rules.length > 0 && (
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.text.onGold} />
          ) : (
            <Text style={s.saveBtnText}>Save Rules</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { gap: Spacing.lg },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.state.auto + '20',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.state.auto + '40',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text.subtitle,
    lineHeight: 18,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary.default,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    borderStyle: 'dashed',
  },
  addBtnText: {
    fontSize: Typography.size.md,
    color: Colors.primary.default,
    fontWeight: Typography.weight.semibold,
  },

  saveBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.full,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  saveBtnText: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onGold,
  },
});
