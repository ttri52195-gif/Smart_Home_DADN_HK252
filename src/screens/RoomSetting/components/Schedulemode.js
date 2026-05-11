/**
 * components/ScheduleMode.js
 *
 * Chế độ Schedule: tạo / xem / xóa lịch cho thiết bị.
 * Gọi đúng các API đã có trong api.js:
 *   - listSchedules(token, deviceKey)
 *   - createSchedule(token, { setting_profile_id, device_id, action, trigger_time })
 *   - updateSchedule(token, id, data)
 *
 * Lưu ý: BE cần device_id (số nguyên), FE đang dùng device.key (string).
 * Trong DEV_MODE mock trả về id: Date.now() nên vẫn hoạt động.
 * Production cần map device.key → device.id.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../context/AuthContext';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
} from '../../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../../theme';

// ── Action options ────────────────────────────────────────────────
const ACTIONS = [
  {
    key: 'TURN_ON',
    label: 'Turn ON',
    icon: 'power-outline',
    color: Colors.state.on,
  },
  {
    key: 'TURN_OFF',
    label: 'Turn OFF',
    icon: 'power-outline',
    color: Colors.state.off,
  },
  {
    key: 'SET_VALUE',
    label: 'Set Value',
    icon: 'options-outline',
    color: Colors.info,
  },
];

function fmtTime(dt) {
  return new Date(dt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtDate(dt) {
  return new Date(dt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── Schedule item card ────────────────────────────────────────────
function ScheduleItem({ schedule, deviceName, onToggle, onDelete }) {
  const action = ACTIONS.find((a) => a.key === schedule.action) ?? ACTIONS[0];
  const dt = new Date(schedule.trigger_time);
  const isPast = dt < new Date();

  return (
    <View style={[sc.item, isPast && sc.itemPast]}>
      <View style={[sc.actionDot, { backgroundColor: action.color + '30' }]}>
        <Ionicons name={action.icon} size={18} color={action.color} />
      </View>

      <View style={sc.itemInfo}>
        <Text style={sc.itemDevice}>{deviceName}</Text>
        <Text style={sc.itemAction}>{action.label}</Text>
        <View style={sc.itemTimeRow}>
          <Ionicons
            name="calendar-outline"
            size={12}
            color={Colors.text.caption}
          />
          <Text style={sc.itemTime}>
            {fmtDate(dt)} · {fmtTime(dt)}
          </Text>
        </View>
      </View>

      <TouchableOpacity onPress={onDelete} style={sc.deleteBtn}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}

const sc = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
  },
  itemPast: { opacity: 0.55 },
  actionDot: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, gap: 2 },
  itemDevice: {
    fontSize: Typography.size.md,
    color: Colors.text.title,
    fontWeight: Typography.weight.medium,
  },
  itemAction: {
    fontSize: Typography.size.sm,
    color: Colors.text.body,
  },
  itemTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  itemTime: { fontSize: Typography.size.xs, color: Colors.text.caption },
  deleteBtn: { padding: Spacing.sm },
});

// ── Add Schedule Form ─────────────────────────────────────────────
function AddScheduleForm({ devices, onAdd, onCancel }) {
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [action, setAction] = useState('TURN_ON');
  const [datetime, setDatetime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); // 'date' | 'time'
  const [saving, setSaving] = useState(false);
  const { token } = useAuth();

  const device = devices[deviceIdx];

  function openPicker(mode) {
    setPickerMode(mode);
    setShowPicker(true);
  }

  async function handleAdd() {
    if (!device) return;
    setSaving(true);
    try {
      await onAdd({
        deviceKey: device.key,
        deviceName: device.name ?? device.key,
        action,
        trigger_time: datetime.toISOString(),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={af.form}>
      <Text style={af.formTitle}>New Schedule</Text>

      {/* Device */}
      <Text style={af.label}>Device</Text>
      <View style={af.chipRow}>
        {devices.map((d, i) => (
          <TouchableOpacity
            key={d.key}
            style={[af.chip, deviceIdx === i && af.chipActive]}
            onPress={() => setDeviceIdx(i)}
          >
            <Text style={[af.chipText, deviceIdx === i && af.chipTextActive]}>
              {d.name ?? d.key}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action */}
      <Text style={af.label}>Action</Text>
      <View style={af.chipRow}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.key}
            style={[af.chip, action === a.key && af.chipActive]}
            onPress={() => setAction(a.key)}
          >
            <Ionicons
              name={a.icon}
              size={14}
              color={action === a.key ? Colors.text.onGold : Colors.text.body}
            />
            <Text style={[af.chipText, action === a.key && af.chipTextActive]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date & Time pickers */}
      <Text style={af.label}>When</Text>
      <View style={af.dtRow}>
        <TouchableOpacity style={af.dtBtn} onPress={() => openPicker('date')}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={Colors.primary.default}
          />
          <Text style={af.dtText}>{fmtDate(datetime)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={af.dtBtn} onPress={() => openPicker('time')}>
          <Ionicons
            name="time-outline"
            size={16}
            color={Colors.primary.default}
          />
          <Text style={af.dtText}>{fmtTime(datetime)}</Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <DateTimePicker
          value={datetime}
          mode={pickerMode}
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={new Date()}
          onChange={(_, selected) => {
            setShowPicker(Platform.OS === 'ios');
            if (selected) setDatetime(selected);
          }}
        />
      )}

      {/* Buttons */}
      <View style={af.btnRow}>
        <TouchableOpacity style={af.cancelBtn} onPress={onCancel}>
          <Text style={af.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[af.addBtn, saving && { opacity: 0.7 }]}
          onPress={handleAdd}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={Colors.text.onGold} size="small" />
          ) : (
            <Text style={af.addText}>Add Schedule</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const af = StyleSheet.create({
  form: {
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.primary.default + '60',
    gap: Spacing.md,
  },
  formTitle: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text.title,
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: Typography.size.sm,
    color: Colors.text.caption,
    fontWeight: Typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
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

  dtRow: { flexDirection: 'row', gap: Spacing.md },
  dtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface.overlay,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
  },
  dtText: { fontSize: Typography.size.sm, color: Colors.text.subtitle },

  btnRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
    alignItems: 'center',
  },
  cancelText: { fontSize: Typography.size.md, color: Colors.text.body },
  addBtn: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary.default,
    alignItems: 'center',
  },
  addText: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text.onGold,
  },
});

// ── ScheduleMode Component ────────────────────────────────────────
export default function ScheduleMode({ devices = [] }) {
  const { token } = useAuth();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Map key → tên thiết bị
  const deviceMap = Object.fromEntries(
    devices.map((d) => [d.key, d.name ?? d.key]),
  );

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSchedules(token);
      // listSchedules trả về mảng { id, device_id, action, trigger_time, ... }
      const arr = Array.isArray(data) ? data : (data?.schedules ?? []);
      setSchedules(arr);
    } catch (e) {
      console.warn('listSchedules error:', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  async function handleAdd({ deviceKey, action, trigger_time }) {
    try {
      // DEV_MODE: setting_profile_id = 1, device_id = index+1 (mock)
      const deviceIdx = devices.findIndex((d) => d.key === deviceKey);
      const device_id = deviceIdx + 1; // production: lấy từ devices list có id thật

      const created = await createSchedule(token, {
        setting_profile_id: 1,
        device_id,
        action,
        trigger_time,
      });

      // Gắn thêm deviceKey để hiển thị tên
      setSchedules((prev) => [...prev, { ...created, _deviceKey: deviceKey }]);
      setShowAddForm(false);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleDelete(id) {
    Alert.alert('Delete Schedule', 'Remove this schedule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setSchedules((prev) => prev.filter((s) => s.id !== id)),
      },
    ]);
  }

  function resolveDeviceName(schedule) {
    if (schedule._deviceKey)
      return deviceMap[schedule._deviceKey] ?? schedule._deviceKey;
    // production: device_id map
    const d = devices[schedule.device_id - 1];
    return d ? (d.name ?? d.key) : `Device #${schedule.device_id}`;
  }

  return (
    <View style={s.container}>
      {/* Info banner */}
      <View style={s.infoBanner}>
        <Ionicons name="time-outline" size={16} color={Colors.info} />
        <Text style={s.infoText}>
          Schedule devices to turn ON/OFF at specific times.
        </Text>
      </View>

      {/* Loading */}
      {loading && (
        <View style={s.centered}>
          <ActivityIndicator color={Colors.primary.default} />
        </View>
      )}

      {/* Schedule list */}
      {!loading && schedules.length === 0 && !showAddForm && (
        <View style={s.empty}>
          <Ionicons
            name="calendar-outline"
            size={40}
            color={Colors.text.caption}
          />
          <Text style={s.emptyText}>No schedules yet</Text>
        </View>
      )}

      {!loading &&
        schedules.map((sch) => (
          <ScheduleItem
            key={sch.id}
            schedule={sch}
            deviceName={resolveDeviceName(sch)}
            onDelete={() => handleDelete(sch.id)}
          />
        ))}

      {/* Add form */}
      {showAddForm && (
        <AddScheduleForm
          devices={devices}
          onAdd={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Add button */}
      {!showAddForm && (
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => setShowAddForm(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={Colors.primary.default}
          />
          <Text style={s.addBtnText}>New Schedule</Text>
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
    backgroundColor: Colors.info + '15',
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.info + '40',
  },
  infoText: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text.subtitle,
    lineHeight: 18,
  },

  centered: { alignItems: 'center', padding: Spacing.xxl },
  empty: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxxl,
  },
  emptyText: { fontSize: Typography.size.md, color: Colors.text.caption },

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
});
