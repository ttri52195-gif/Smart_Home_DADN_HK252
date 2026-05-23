import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../../context/AuthContext';
import {
  getAutomationMode, setAutomationMode,
  listAutomationRules, createAutomationRule,
  updateAutomationRule, deleteAutomationRule,
} from '../../../services/api';
import { Colors, Typography, Spacing, Radius } from '../../../theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEVICE_ICON = {
  LIGHT:  'bulb-outline',
  DIMMER: 'sunny-outline',
  RGB:    'color-palette-outline',
  DOOR:   'lock-closed-outline',
  MOTION: 'radio-outline',
};

// Backend returns days_of_week as either a comma-string ("Mon,Tue") or an array (["MON","TUE"]).
// Normalise to title-case array either way.
function parseDays(val) {
  if (!val) return [];
  const raw = Array.isArray(val) ? val : val.split(',');
  return raw
    .map(s => s.trim())
    .filter(Boolean)
    .map(d => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());
}

function formatDays(val) {
  const days = parseDays(val);
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && !days.includes('Sat') && !days.includes('Sun')) return 'Weekdays';
  if (days.length === 0) return '—';
  return days.join(' · ');
}

function fmtTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

const ONLINE_MS = 5 * 60 * 1000;
function isOnline(ts) {
  if (!ts) return false;
  const d = new Date(ts);
  return !isNaN(d) && (Date.now() - d.getTime()) < ONLINE_MS;
}
function formatAge(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d)) return '';
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60)    return `${sec}s ago`;
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ── Toggle ────────────────────────────────────────────────────────
function Toggle({ value, onPress, color = Colors.success, disabled }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[tog.track, { backgroundColor: value ? color : Colors.surface.elevated }]}
    >
      <View style={[tog.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </TouchableOpacity>
  );
}
const tog = StyleSheet.create({
  track: { width: 44, height: 24, borderRadius: 12, padding: 2, justifyContent: 'center' },
  knob: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
});

// ── Day Picker ────────────────────────────────────────────────────
function DayPicker({ selected, onChange }) {
  const all = DAYS.every(d => selected.includes(d));
  function toggle(d) {
    onChange(selected.includes(d) ? selected.filter(x => x !== d) : [...selected, d]);
  }
  return (
    <View style={dpk.row}>
      <TouchableOpacity
        style={[dpk.chip, all && dpk.on]}
        onPress={() => onChange(all ? [] : [...DAYS])}
      >
        <Text style={[dpk.txt, all && dpk.onTxt]}>All</Text>
      </TouchableOpacity>
      {DAYS.map(d => (
        <TouchableOpacity
          key={d}
          style={[dpk.chip, selected.includes(d) && dpk.on]}
          onPress={() => toggle(d)}
        >
          <Text style={[dpk.txt, selected.includes(d) && dpk.onTxt]}>{d}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
const dpk = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: {
    paddingHorizontal: Spacing.sm, paddingVertical: 3,
    borderRadius: Radius.full, backgroundColor: Colors.surface.elevated,
    minWidth: 36, alignItems: 'center',
  },
  on:    { backgroundColor: Colors.state.auto },
  txt:   { fontSize: Typography.size.xs, color: Colors.text.body },
  onTxt: { color: '#fff', fontWeight: Typography.weight.semibold },
});

// ── Door Auto-Lock Card ───────────────────────────────────────────
// Door states: OPEN (physically open) | CLOSE (closed, unlocked) | LOCKED
// Auto-lock: after door is OPEN, automatically send LOCKED after delay_sec.
function DoorAutoLockCard({ doorDevices, config, onSave, saving }) {
  const [enabled,  setEnabled]  = useState(config.door_auto_lock ?? false);
  const [delaySec, setDelaySec] = useState(config.door_auto_lock_delay_sec ?? 120);
  const delayMin = Math.max(1, Math.round(delaySec / 60));
  const names      = doorDevices.map(d => d.name ?? d.feed_key ?? d.key).join(', ');
  const anyOffline = doorDevices.some(d => !isOnline(d.last_record_time));

  return (
    <View style={dl.card}>
      <View style={dl.head}>
        <View style={dl.headIcon}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.state.auto} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dl.title}>Door Auto-Lock</Text>
          <Text style={dl.sub}>{names}</Text>
          {anyOffline && (
            <View style={dl.offlineNote}>
              <Ionicons name="cloud-offline-outline" size={11} color={Colors.error + 'CC'} />
              <Text style={dl.offlineNoteTxt}>Door state may be outdated</Text>
            </View>
          )}
        </View>
      </View>

      {/* State guide */}
      <View style={dl.stateGuide}>
        {[
          { badge: 'OPEN',   desc: 'Physically open',    color: Colors.warning },
          { badge: 'CLOSED', desc: 'Closed, not locked', color: Colors.info    },
          { badge: 'LOCKED', desc: 'Closed and locked',  color: Colors.success },
        ].map(({ badge, desc, color }) => (
          <View key={badge} style={dl.stateRow}>
            <View style={[dl.stateBadge, { backgroundColor: color + '22', borderColor: color }]}>
              <Text style={[dl.stateBadgeText, { color }]}>{badge}</Text>
            </View>
            <Text style={dl.stateDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      <View style={dl.row}>
        <Text style={dl.rowLabel}>Lock automatically after door opens</Text>
        <Toggle value={enabled} onPress={() => setEnabled(v => !v)} color={Colors.success} />
      </View>

      {enabled && (
        <View style={dl.delayRow}>
          <Text style={dl.delayLabel}>Lock after</Text>
          <TouchableOpacity
            style={dl.stepBtn}
            onPress={() => setDelaySec(prev => Math.max(60, prev - 60))}
          >
            <Ionicons name="remove-outline" size={18} color={Colors.primary.default} />
          </TouchableOpacity>
          <Text style={dl.delayVal}>{delayMin} min</Text>
          <TouchableOpacity
            style={dl.stepBtn}
            onPress={() => setDelaySec(prev => prev + 60)}
          >
            <Ionicons name="add-outline" size={18} color={Colors.primary.default} />
          </TouchableOpacity>
          <Text style={dl.delayUnit}>open</Text>
        </View>
      )}

      <TouchableOpacity
        style={[dl.saveBtn, saving && { opacity: 0.7 }]}
        onPress={() => onSave({ door_auto_lock: enabled, door_auto_lock_delay_sec: delaySec })}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving
          ? <ActivityIndicator size="small" color={Colors.text.onGold} />
          : <Text style={dl.saveTxt}>Save Auto-Lock</Text>
        }
      </TouchableOpacity>
    </View>
  );
}
const dl = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card, borderRadius: Radius.lg,
    padding: Spacing.xl, gap: Spacing.md,
    borderWidth: 1, borderColor: Colors.state.auto + '40',
  },
  head:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.state.auto + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.title },
  sub:   { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 1 },

  stateGuide: { gap: Spacing.xs, padding: Spacing.md, backgroundColor: Colors.surface.elevated + '55', borderRadius: Radius.md },
  stateRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stateBadge: {
    paddingHorizontal: Spacing.sm, paddingVertical: 1,
    borderRadius: Radius.full, borderWidth: 1, minWidth: 60, alignItems: 'center',
  },
  stateBadgeText: { fontSize: Typography.size.xs, fontWeight: Typography.weight.bold },
  stateDesc:      { fontSize: Typography.size.xs, color: Colors.text.caption },

  row:      { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.body },

  delayRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface.elevated + '88',
    borderRadius: Radius.md, padding: Spacing.md,
  },
  delayLabel: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.caption },
  stepBtn: {
    width: 32, height: 32, borderRadius: Radius.full,
    backgroundColor: Colors.surface.elevated,
    alignItems: 'center', justifyContent: 'center',
  },
  delayVal: {
    fontSize: Typography.size.md, color: Colors.text.title,
    fontWeight: Typography.weight.bold, minWidth: 52, textAlign: 'center',
  },
  delayUnit: { fontSize: Typography.size.sm, color: Colors.text.caption },

  saveBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.full, paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  saveTxt: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.onGold },

  offlineNote:    { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  offlineNoteTxt: { fontSize: 10, color: Colors.error + 'CC' },
});

// ── Rule Item ─────────────────────────────────────────────────────
function RuleItem({ rule, deviceType, onToggle, onDelete, toggling }) {
  const isNum = deviceType === 'LIGHT' || deviceType === 'RGB';
  const valLabel = isNum ? `${rule.value}%` : rule.value;
  return (
    <View style={ri.row}>
      <View style={ri.timeBox}>
        <Text style={ri.timeTxt}>{rule.time_of_day}</Text>
      </View>
      <View style={ri.info}>
        <Text style={ri.days}>{formatDays(rule.days_of_week)}</Text>
        <Text style={ri.val}>→ {valLabel}</Text>
      </View>
      {toggling
        ? <ActivityIndicator size="small" color={Colors.state.auto} />
        : <Toggle value={rule.enabled !== false} onPress={() => onToggle(rule)} color={Colors.state.auto} />
      }
      <TouchableOpacity onPress={() => onDelete(rule.id)} style={ri.del}>
        <Ionicons name="trash-outline" size={16} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );
}
const ri = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  timeBox: {
    backgroundColor: Colors.surface.elevated,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3,
    minWidth: 52, alignItems: 'center',
  },
  timeTxt: { fontSize: Typography.size.sm, color: Colors.text.title, fontWeight: Typography.weight.semibold },
  info:    { flex: 1 },
  days:    { fontSize: Typography.size.xs, color: Colors.text.caption },
  val:     { fontSize: Typography.size.sm, color: Colors.text.body, marginTop: 1 },
  del:     { padding: Spacing.xs },
});

// ── Add Rule Form ─────────────────────────────────────────────────
function AddRuleForm({ deviceType, onAdd, onCancel }) {
  const isNum = deviceType === 'LIGHT' || deviceType === 'RGB';
  const [time,       setTime]       = useState(() => { const d = new Date(); d.setSeconds(0, 0); return d; });
  const [showPicker, setShowPicker] = useState(false);
  const [days,       setDays]       = useState([...DAYS]);
  const [value,      setValue]      = useState(isNum ? '50' : 'ON');
  const [saving,     setSaving]     = useState(false);

  async function handleAdd() {
    if (!days.length) { Alert.alert('Select at least one day'); return; }
    setSaving(true);
    try {
      await onAdd({
        time_of_day:  fmtTime(time),
        days_of_week: days.join(','),
        value:        String(value),
        enabled:      true,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={af.form}>
      <Text style={af.title}>New Rule</Text>

      <Text style={af.lbl}>TIME</Text>
      <TouchableOpacity onPress={() => setShowPicker(true)} style={af.dtBtn}>
        <Ionicons name="time-outline" size={16} color={Colors.primary.default} />
        <Text style={af.dtTxt}>{fmtTime(time)}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, sel) => {
            setShowPicker(Platform.OS === 'ios');
            if (sel) setTime(sel);
          }}
        />
      )}

      <Text style={af.lbl}>DAYS</Text>
      <DayPicker selected={days} onChange={setDays} />

      <Text style={af.lbl}>VALUE</Text>
      {isNum ? (
        <View style={af.numRow}>
          <TextInput
            style={af.numInput}
            value={String(value)}
            onChangeText={v => setValue(v.replace(/\D/g, '').slice(0, 3))}
            keyboardType="numeric"
            placeholder="0–100"
            placeholderTextColor={Colors.text.caption}
          />
          <Text style={af.unit}>%</Text>
        </View>
      ) : (
        <View style={af.valRow}>
          {['ON', 'OFF'].map(v => (
            <TouchableOpacity
              key={v}
              style={[af.valChip, value === v && af.valChipOn]}
              onPress={() => setValue(v)}
            >
              <Text style={[af.valTxt, value === v && af.valTxtOn]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={af.btnRow}>
        <TouchableOpacity style={af.cancelBtn} onPress={onCancel} disabled={saving}>
          <Text style={af.cancelTxt}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[af.addBtn, (saving || !days.length) && { opacity: 0.5 }]}
          onPress={handleAdd}
          disabled={saving || !days.length}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.text.onGold} />
            : <Text style={af.addTxt}>Add</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}
const af = StyleSheet.create({
  form: {
    backgroundColor: Colors.surface.elevated + '55', borderRadius: Radius.md,
    padding: Spacing.lg, gap: Spacing.md, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: Colors.primary.default + '50',
  },
  title:  { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.title },
  lbl:    { fontSize: Typography.size.xs, color: Colors.text.caption, fontWeight: Typography.weight.semibold, letterSpacing: 0.5 },
  dtBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surface.card, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.surface.elevated, alignSelf: 'flex-start',
  },
  dtTxt:  { fontSize: Typography.size.sm, color: Colors.text.title },
  numRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  numInput: {
    width: 72, height: 36,
    backgroundColor: Colors.surface.card, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.surface.elevated,
    color: Colors.text.title, fontSize: Typography.size.md,
    paddingHorizontal: Spacing.md, textAlign: 'center',
  },
  unit:       { fontSize: Typography.size.sm, color: Colors.text.caption },
  valRow:     { flexDirection: 'row', gap: Spacing.sm },
  valChip:    { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.xs, borderRadius: Radius.full, backgroundColor: Colors.surface.elevated },
  valChipOn:  { backgroundColor: Colors.primary.default },
  valTxt:     { fontSize: Typography.size.sm, color: Colors.text.body },
  valTxtOn:   { color: Colors.text.onGold, fontWeight: Typography.weight.semibold },
  btnRow:     { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  cancelBtn:  { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surface.elevated, alignItems: 'center' },
  cancelTxt:  { fontSize: Typography.size.sm, color: Colors.text.body },
  addBtn:     { flex: 2, paddingVertical: Spacing.sm, borderRadius: Radius.full, backgroundColor: Colors.primary.default, alignItems: 'center' },
  addTxt:     { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.onGold },
});

// ── Device Rule Section ───────────────────────────────────────────
function DeviceRuleSection({ device, rules, onAdd, onToggle, onDelete }) {
  const [showForm,  setShowForm]  = useState(false);
  const [toggling,  setToggling]  = useState(null);
  const feedKey = device.feed_key ?? device.key;
  const icon    = DEVICE_ICON[device.type] ?? 'hardware-chip-outline';

  async function handleToggle(rule) {
    setToggling(rule.id);
    try { await onToggle(rule); }
    finally { setToggling(null); }
  }

  return (
    <View style={dr.card}>
      <View style={dr.head}>
        <View style={[dr.icon, { backgroundColor: Colors.primary.default + '22' }]}>
          <Ionicons name={icon} size={16} color={Colors.primary.default} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[dr.name, { flex: undefined }]}>{device.name ?? feedKey}</Text>
          {device.last_record_time && (
            <Text style={dr.deviceTime}>{formatAge(device.last_record_time)}</Text>
          )}
        </View>
        {!isOnline(device.last_record_time) && (
          <View style={dr.offlineChip}><Text style={dr.offlineChipText}>OFFLINE</Text></View>
        )}
        <Text style={dr.type}>{device.type}</Text>
      </View>

      {rules.length === 0 && !showForm && (
        <Text style={dr.empty}>No rules — tap + to add one</Text>
      )}

      {rules.map((rule, i) => (
        <View key={rule.id}>
          {i > 0 && <View style={dr.divider} />}
          <RuleItem
            rule={rule}
            deviceType={device.type}
            onToggle={handleToggle}
            onDelete={onDelete}
            toggling={toggling === rule.id}
          />
        </View>
      ))}

      {rules.length > 0 && <View style={dr.divider} />}

      {showForm ? (
        <AddRuleForm
          deviceType={device.type}
          onAdd={async (data) => { await onAdd(feedKey, data); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        <TouchableOpacity style={dr.addBtn} onPress={() => setShowForm(true)} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={16} color={Colors.primary.default} />
          <Text style={dr.addTxt}>Add Rule</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
const dr = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.card, borderRadius: Radius.lg,
    padding: Spacing.xl, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.surface.elevated,
  },
  head:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.xs },
  icon:    { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  name:    { flex: 1, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.title },
  type:    { fontSize: Typography.size.xs, color: Colors.text.caption },
  empty:   { fontSize: Typography.size.sm, color: Colors.text.caption, paddingVertical: Spacing.xs },
  divider: { height: 0.5, backgroundColor: Colors.surface.elevated, marginVertical: 2 },
  addBtn:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs },
  addTxt:  { fontSize: Typography.size.sm, color: Colors.primary.default, fontWeight: Typography.weight.medium },

  deviceTime: { fontSize: 10, color: Colors.text.caption, marginTop: 1 },
  offlineChip: {
    backgroundColor: Colors.error + '22',
    borderWidth: 1, borderColor: Colors.error + '88',
    borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1,
  },
  offlineChipText: { fontSize: 8, fontWeight: '700', color: Colors.error, letterSpacing: 0.5 },
});

// ── Main Component ────────────────────────────────────────────────
export default function AutomaticMode({ devices = [] }) {
  const { token } = useAuth();

  const [autoConfig,   setAutoConfig]   = useState({ door_auto_lock: false, door_auto_lock_delay_sec: 120 });
  const [rulesMap,     setRulesMap]     = useState({});
  const [loading,      setLoading]      = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  const doorDevices   = devices.filter(d => d.type === 'DOOR');
  const motionDevices = devices.filter(d => d.type === 'MOTION');
  const ruleDevices   = devices.filter(d => ['LIGHT', 'DIMMER', 'RGB'].includes(d.type));

  useEffect(() => {
    async function load() {
      try {
        const [configRes, rulesRes] = await Promise.allSettled([
          getAutomationMode(token),
          listAutomationRules(token),
        ]);

        if (configRes.status === 'fulfilled') {
          const config = configRes.value;
          setAutoConfig({
            door_auto_lock:           config?.door_auto_lock           ?? false,
            door_auto_lock_delay_sec: config?.door_auto_lock_delay_sec ?? 120,
          });
        } else {
          console.warn('getAutomationMode failed:', configRes.reason?.message);
        }

        if (rulesRes.status === 'fulfilled') {
          const raw = rulesRes.value;
          // Unwrap { count, rules: [...] } or plain array
          const rulesArr = raw?.rules ?? (Array.isArray(raw) ? raw : []);
          const map = {};
          for (const rule of rulesArr) {
            const key = rule.feed_key ?? rule.device_key ?? '';
            if (!map[key]) map[key] = [];
            map[key].push(rule);
          }
          setRulesMap(map);
        } else {
          console.warn('listAutomationRules failed:', rulesRes.reason?.message);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  async function handleSaveConfig(data) {
    setSavingConfig(true);
    try {
      await setAutomationMode(token, data);
      setAutoConfig(prev => ({ ...prev, ...data }));
    } catch (e) {
      Alert.alert('Error', 'Failed to save auto-lock settings.');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleAddRule(feedKey, data) {
    try {
      const rule = await createAutomationRule(token, { feed_key: feedKey, ...data });
      // POST response omits feed_key — inject it so toggle/delete can find the right rulesMap key
      setRulesMap(prev => ({
        ...prev,
        [feedKey]: [...(prev[feedKey] ?? []), { ...rule, feed_key: feedKey }],
      }));
    } catch (e) {
      Alert.alert('Error', 'Failed to create rule.');
    }
  }

  async function handleToggleRule(rule) {
    const feedKey = rule.feed_key ?? rule.device_key ?? '';
    const updated = { ...rule, enabled: !rule.enabled };
    setRulesMap(prev => ({
      ...prev,
      [feedKey]: (prev[feedKey] ?? []).map(r => r.id === rule.id ? updated : r),
    }));
    try {
      await updateAutomationRule(token, rule.id, { enabled: !rule.enabled });
    } catch (e) {
      setRulesMap(prev => ({
        ...prev,
        [feedKey]: (prev[feedKey] ?? []).map(r => r.id === rule.id ? rule : r),
      }));
      Alert.alert('Error', 'Failed to update rule.');
    }
  }

  function handleDeleteRule(id, feedKey) {
    Alert.alert('Delete Rule', 'Remove this automation rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setRulesMap(prev => ({
            ...prev,
            [feedKey]: (prev[feedKey] ?? []).filter(r => r.id !== id),
          }));
          try {
            await deleteAutomationRule(token, id);
          } catch (e) {
            Alert.alert('Error', 'Failed to delete rule.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={Colors.primary.default} />
      </View>
    );
  }

  return (
    <View style={s.container}>

      {/* Info banner */}
      <View style={s.infoBanner}>
        <Ionicons name="flash-outline" size={16} color={Colors.state.auto} />
        <Text style={s.infoText}>
          Set recurring schedules and automatic behaviors per device.
        </Text>
      </View>

      {devices.length > 0 && devices.every(d => !isOnline(d.last_record_time)) && (
        <View style={s.allOfflineBanner}>
          <Ionicons name="cloud-offline-outline" size={18} color={Colors.text.caption} />
          <Text style={s.allOfflineText}>All devices are offline — data may be outdated</Text>
        </View>
      )}

      {/* Motion sensors — always on, automation doesn't apply */}
      {motionDevices.length > 0 && (
        <View style={s.motionCard}>
          <View style={s.motionHead}>
            <Ionicons name="radio-outline" size={16} color={Colors.state.auto} />
            <Text style={s.motionTitle}>Motion Sensors</Text>
          </View>
          <Text style={s.motionNote}>
            Always ON — automation does not control sensors.
          </Text>
          {motionDevices.map(d => (
            <View key={d.feed_key ?? d.key} style={s.motionDeviceRow}>
              <Text style={s.motionDevice}>· {d.name ?? d.feed_key ?? d.key}</Text>
              {!isOnline(d.last_record_time) && (
                <Text style={s.motionOfflineTime}>
                  {d.last_record_time ? formatAge(d.last_record_time) : 'No data'} · OFFLINE
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Door auto-lock config */}
      {doorDevices.length > 0 && (
        <DoorAutoLockCard
          doorDevices={doorDevices}
          config={autoConfig}
          onSave={handleSaveConfig}
          saving={savingConfig}
        />
      )}

      {/* Light / Dimmer / RGB — recurring time-based rules */}
      {ruleDevices.map(device => {
        const feedKey = device.feed_key ?? device.key;
        return (
          <DeviceRuleSection
            key={feedKey}
            device={device}
            rules={rulesMap[feedKey] ?? []}
            onAdd={handleAddRule}
            onToggle={handleToggleRule}
            onDelete={(id) => handleDeleteRule(id, feedKey)}
          />
        );
      })}

      {devices.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyTxt}>No devices in this room.</Text>
        </View>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  container:  { gap: Spacing.lg },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },

  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.state.auto + '20',
    borderRadius: Radius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.state.auto + '40',
  },
  infoText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.subtitle, lineHeight: 18 },

  motionCard: {
    backgroundColor: Colors.surface.card, borderRadius: Radius.lg,
    padding: Spacing.xl, gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.surface.elevated,
  },
  motionHead:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  motionTitle:  { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.title },
  motionNote:   { fontSize: Typography.size.sm, color: Colors.text.caption, lineHeight: 18 },
  motionDevice: { fontSize: Typography.size.sm, color: Colors.text.body, marginLeft: Spacing.sm },

  empty:    { padding: Spacing.xl, alignItems: 'center' },
  emptyTxt: { fontSize: Typography.size.md, color: Colors.text.caption },

  allOfflineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surface.card, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg,
    borderWidth: 1, borderColor: Colors.surface.elevated,
  },
  allOfflineText:  { flex: 1, fontSize: Typography.size.sm, color: Colors.text.caption },
  motionDeviceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  motionOfflineTime: { fontSize: Typography.size.xs, color: Colors.error + 'CC', fontWeight: Typography.weight.semibold },
});
