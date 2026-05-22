import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  listSensors, listDevices, getUserByUsername,
  updateDevice, updateSensor,
} from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Visual config ────────────────────────────────────────────────
const SENSOR_ICON = {
  TEMPERATURE:    'thermometer-outline',
  HUMIDITY:       'water-outline',
  RAIN:           'rainy-outline',
  GAS:            'flame-outline',
  LIGHT_INTENSITY:'sunny-outline',
};
const DEVICE_ICON = {
  LIGHT:  'bulb-outline',
  DOOR:   'lock-closed-outline',
  MOTION: 'aperture-outline',
  RGB:    'color-palette-outline',
  DIMMER: 'sunny-outline',
};

function itemIcon(item) {
  if (item.itemType === 'sensor') return SENSOR_ICON[item.type] ?? 'analytics-outline';
  return DEVICE_ICON[item.type] ?? 'hardware-chip-outline';
}

// ── Single editable row ──────────────────────────────────────────
function ItemRow({ item, isOwner, editing, onEdit, onCancel, onSave, saving }) {
  const [draftName, setDraftName]     = useState(item.name     ?? '');
  const [draftLoc,  setDraftLocation] = useState(item.location ?? '');

  // Reset draft when this row enters edit mode
  useEffect(() => {
    if (editing) {
      setDraftName(item.name ?? '');
      setDraftLocation(item.location ?? '');
    }
  }, [editing]);

  return (
    <View>
      {/* ── Display row ── */}
      <View style={s.itemRow}>
        <View style={s.itemIcon}>
          <Ionicons name={itemIcon(item)} size={18} color={Colors.primary.default} />
        </View>
        <View style={s.itemInfo}>
          <Text style={s.itemName}>{item.name}</Text>
          <Text style={s.itemMeta}>
            {item.itemType === 'sensor' ? 'Sensor' : 'Device'}
            {item.location ? `  ·  ${item.location}` : ''}
          </Text>
        </View>
        {isOwner && !editing && (
          <TouchableOpacity onPress={onEdit} style={s.editBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="pencil-outline" size={16} color={Colors.text.caption} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Edit panel ── */}
      {editing && (
        <View style={s.editPanel}>
          <View style={s.editField}>
            <Text style={s.editLabel}>NAME</Text>
            <TextInput
              style={s.editInput}
              value={draftName}
              onChangeText={setDraftName}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={Colors.text.caption}
            />
          </View>
          <View style={s.editField}>
            <Text style={s.editLabel}>LOCATION</Text>
            <TextInput
              style={s.editInput}
              value={draftLoc}
              onChangeText={setDraftLocation}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="e.g. Living Room"
              placeholderTextColor={Colors.text.caption}
            />
          </View>
          <View style={s.editActions}>
            <TouchableOpacity style={s.cancelBtn} onPress={onCancel} disabled={saving}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={() => onSave(draftName.trim(), draftLoc.trim())}
              disabled={saving || !draftName.trim()}
            >
              {saving
                ? <ActivityIndicator size="small" color={Colors.text.onGold} />
                : <Text style={s.saveText}>Save</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────
export default function RoomDeviceScreen({ navigation }) {
  const { token, user } = useAuth();

  const [sensors,    setSensors]    = useState([]);
  const [devices,    setDevices]    = useState([]);
  const [isOwner,    setIsOwner]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [editingKey, setEditingKey] = useState(null); // feed_key
  const [saving,     setSaving]     = useState(false);
  const [banner,     setBanner]     = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [profile, sRes, dRes] = await Promise.all([
          getUserByUsername(user?.username),
          listSensors(),
          listDevices(),
        ]);
        setIsOwner(profile?.is_house_owner === true);
        setSensors(sRes?.sensors ?? []);
        setDevices(dRes?.devices ?? []);
      } catch (e) {
        console.warn('RoomDevice load error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Merge sensors + devices, tag each with itemType, group by location
  const allItems = [
    ...sensors.map(s => ({ ...s, itemType: 'sensor' })),
    ...devices.map(d => ({ ...d, itemType: 'device' })),
  ];
  const groups = Object.values(
    allItems.reduce((acc, item) => {
      const loc = item.location || 'Unassigned';
      if (!acc[loc]) acc[loc] = { location: loc, items: [] };
      acc[loc].items.push(item);
      return acc;
    }, {})
  ).sort((a, b) =>
    a.location === 'Unassigned' ? 1 : b.location === 'Unassigned' ? -1
      : a.location.localeCompare(b.location)
  );

  async function handleSave(item, newName, newLocation) {
    setSaving(true);
    setBanner(null);
    try {
      const data = { name: newName, location: newLocation || null };
      if (item.itemType === 'device') {
        await updateDevice(token, item.feed_key, data);
        setDevices(prev => prev.map(d =>
          d.feed_key === item.feed_key ? { ...d, ...data } : d
        ));
      } else {
        await updateSensor(token, item.feed_key, data);
        setSensors(prev => prev.map(s =>
          s.feed_key === item.feed_key ? { ...s, ...data } : s
        ));
      }
      setEditingKey(null);
      setBanner({ type: 'success', msg: `${newName} updated.` });
    } catch (e) {
      setBanner({ type: 'error', msg: 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.title} />
        </TouchableOpacity>
        <Text style={s.title}>Room &amp; Device Info</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary.default} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Role hint ──────────────────────────────── */}
          {!isOwner && (
            <View style={s.hintRow}>
              <Ionicons name="eye-outline" size={14} color={Colors.text.caption} />
              <Text style={s.hintText}>View only — only the homeowner can edit names and locations.</Text>
            </View>
          )}

          {/* ── Banner ─────────────────────────────────── */}
          {banner && (
            <View style={[s.banner, banner.type === 'success' ? s.bannerSuccess : s.bannerError]}>
              <Ionicons
                name={banner.type === 'success' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
                size={18}
                color={banner.type === 'success' ? Colors.success : Colors.error}
              />
              <Text style={[s.bannerText, { color: banner.type === 'success' ? Colors.success : Colors.error }]}>
                {banner.msg}
              </Text>
            </View>
          )}

          {/* ── Location groups ────────────────────────── */}
          {groups.map(group => (
            <View key={group.location}>
              <View style={s.groupHeader}>
                <Ionicons name="location-outline" size={13} color={Colors.text.caption} />
                <Text style={s.groupTitle}>{group.location.toUpperCase()}</Text>
                <Text style={s.groupCount}>{group.items.length}</Text>
              </View>
              <View style={s.card}>
                {group.items.map((item, i) => (
                  <View key={item.feed_key}>
                    {i > 0 && <View style={s.divider} />}
                    <ItemRow
                      item={item}
                      isOwner={isOwner}
                      editing={editingKey === item.feed_key}
                      onEdit={() => { setBanner(null); setEditingKey(item.feed_key); }}
                      onCancel={() => setEditingKey(null)}
                      onSave={(name, loc) => handleSave(item, name, loc)}
                      saving={saving && editingKey === item.feed_key}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {groups.length === 0 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>No devices or sensors found.</Text>
            </View>
          )}

        </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:   { color: Colors.text.title, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop:        Spacing.sm,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.lg,
  },

  hintRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  hintText: { color: Colors.text.caption, fontSize: Typography.size.xs, flex: 1 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1,
  },
  bannerSuccess: { backgroundColor: Colors.success + '18', borderColor: Colors.success + '55' },
  bannerError:   { backgroundColor: Colors.error   + '18', borderColor: Colors.error   + '55' },
  bannerText:    { flex: 1, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  groupTitle: {
    flex: 1, color: Colors.text.caption, fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold, letterSpacing: 1.5,
  },
  groupCount: {
    color: Colors.text.caption, fontSize: Typography.size.xs,
    backgroundColor: Colors.surface.elevated,
    paddingHorizontal: Spacing.sm, paddingVertical: 2,
    borderRadius: Radius.full,
  },

  card:    { backgroundColor: Colors.surface.card, borderRadius: Radius.lg },
  divider: { height: 0.5, backgroundColor: Colors.surface.elevated, marginLeft: 52 },

  // Display row
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, gap: Spacing.lg,
  },
  itemIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.primary.default + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  itemInfo:  { flex: 1 },
  itemName:  { color: Colors.text.title, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  itemMeta:  { color: Colors.text.caption, fontSize: Typography.size.xs, marginTop: 2 },
  editBtn:   { padding: Spacing.xs },

  // Edit panel
  editPanel: {
    backgroundColor: Colors.surface.elevated + '66',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  editField: { gap: Spacing.xs },
  editLabel: {
    color: Colors.text.caption, fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold, letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text.title,
    fontSize: Typography.size.sm,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
  },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md, marginTop: Spacing.xs },
  cancelBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.card,
  },
  cancelText: { color: Colors.text.body, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  saveBtn: {
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary.default,
    minWidth: 64, alignItems: 'center',
  },
  saveText: { color: Colors.text.onGold, fontSize: Typography.size.sm, fontWeight: Typography.weight.bold },

  emptyRow:  { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.text.caption, fontSize: Typography.size.sm },
});
