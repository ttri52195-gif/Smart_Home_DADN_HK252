import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { getThresholds, updateThresholds, getUserByUsername } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const GROUPS = [
  {
    label:  'Temperature',
    unit:   '°C',
    hint:   'Alert if outside this range',
    icon:   'thermometer-outline',
    color:  Colors.data.temperature,
    fields: [
      { key: 'temp_lower_threshold',    label: 'Min' },
      { key: 'temp_upper_threshold',    label: 'Max' },
    ],
  },
  {
    label:  'Humidity',
    unit:   '%',
    hint:   'Alert if outside this range',
    icon:   'water-outline',
    color:  Colors.data.humidity,
    fields: [
      { key: 'humidity_lower_threshold', label: 'Min' },
      { key: 'humidity_upper_threshold', label: 'Max' },
    ],
  },
  {
    label:  'Gas',
    unit:   'ppm',
    hint:   'Alert if above this value',
    icon:   'flame-outline',
    color:  Colors.data.gas,
    fields: [
      { key: 'gas_upper_threshold',      label: 'Max' },
    ],
  },
  {
    label:  'Light Intensity',
    unit:   '',
    hint:   'Alert if below this value (low-light warning)',
    icon:   'sunny-outline',
    color:  Colors.data.light,
    fields: [
      { key: 'light_lower_threshold',    label: 'Min' },
    ],
  },
];

export const DEFAULT_THRESHOLDS = {
  temp_lower_threshold:     18,
  temp_upper_threshold:     30,
  humidity_lower_threshold: 30,
  humidity_upper_threshold: 80,
  gas_upper_threshold:      500,
  light_lower_threshold:    100,
};

export default function ThresholdSettingsScreen({ navigation }) {
  const { token, user } = useAuth();
  const [values,  setValues]  = useState(
    Object.fromEntries(Object.entries(DEFAULT_THRESHOLDS).map(([k, v]) => [k, String(v)]))
  );
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [isOwner,  setIsOwner]  = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const profile = await getUserByUsername(user?.username);
        const owner   = profile?.is_house_owner === true;
        setIsOwner(owner);
        // For members, fetch thresholds using the house owner's context
        // (backend resolves via house_owner_id on the token's profile)
        const data = await getThresholds(token);
        if (data && typeof data === 'object') {
          setValues(prev => {
            const next = { ...prev };
            for (const k of Object.keys(DEFAULT_THRESHOLDS)) {
              if (data[k] != null) next[k] = String(data[k]);
            }
            return next;
          });
        }
      } catch (e) {
        console.warn('ThresholdSettings load failed:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    const payload = {};
    for (const k of Object.keys(DEFAULT_THRESHOLDS)) {
      const n = parseFloat(values[k]);
      if (isNaN(n)) {
        Alert.alert('Invalid value', `${k} must be a number.`);
        return;
      }
      payload[k] = n;
    }
    if (payload.temp_lower_threshold >= payload.temp_upper_threshold) {
      Alert.alert('Invalid range', 'Temperature min must be less than max.');
      return;
    }
    if (payload.humidity_lower_threshold >= payload.humidity_upper_threshold) {
      Alert.alert('Invalid range', 'Humidity min must be less than max.');
      return;
    }
    setSaving(true);
    try {
      await updateThresholds(token, payload);
      Alert.alert('Saved', 'Threshold settings updated.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save thresholds:\n' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={Colors.text.title} />
        </TouchableOpacity>
        <Text style={s.title}>Threshold Settings</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={Colors.primary.default} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isOwner === false && (
            <View style={s.readOnlyBanner}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.warning} />
              <Text style={s.readOnlyText}>
                Only the Home Owner can change threshold settings. You are viewing read-only values.
              </Text>
            </View>
          )}

          <View style={s.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.primary.default} />
            <Text style={s.infoText}>
              Sensors generate alerts when readings fall outside these thresholds.
            </Text>
          </View>

          {GROUPS.map(group => (
            <View key={group.label} style={s.card}>
              <View style={s.groupHead}>
                <View style={[s.groupIcon, { backgroundColor: group.color + '22' }]}>
                  <Ionicons name={group.icon} size={18} color={group.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.groupTitle}>{group.label}</Text>
                  <Text style={s.groupHint}>{group.hint}</Text>
                </View>
              </View>

              <View style={s.fieldsRow}>
                {group.fields.map((field, i) => (
                  <View key={field.key} style={[s.fieldBox, { flex: 1 }, i > 0 && { marginLeft: Spacing.md }]}>
                    <Text style={s.fieldLabel}>
                      {field.label}{group.unit ? `  (${group.unit})` : ''}
                    </Text>
                    <TextInput
                      style={[s.input, { borderColor: group.color + '55' }, !isOwner && s.inputReadOnly]}
                      value={values[field.key] ?? ''}
                      onChangeText={v => isOwner && setValues(prev => ({ ...prev, [field.key]: v }))}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.text.caption}
                      selectTextOnFocus
                      editable={!!isOwner}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Thresholds not yet exposed by the API */}
          <View style={s.missingCard}>
            <View style={s.missingHead}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.text.caption} />
              <Text style={s.missingTitle}>Not configurable via current API</Text>
            </View>
            {[
              { sensor: 'Rain',             note: 'No threshold defined — alerts handled by backend only' },
              { sensor: 'Light upper bound', note: 'Only a lower limit is exposed; "too bright" has no threshold' },
              { sensor: 'Temp critical',     note: 'API provides one upper limit; warn vs critical distinction is unavailable' },
            ].map(({ sensor, note }) => (
              <View key={sensor} style={s.missingRow}>
                <Text style={s.missingKey}>{sensor}</Text>
                <Text style={s.missingNote}>{note}</Text>
              </View>
            ))}
          </View>

          {isOwner && (
            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={Colors.text.onGold} />
                : <Text style={s.saveBtnText}>Save Changes</Text>
              }
            </TouchableOpacity>
          )}

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical:   Spacing.lg,
    backgroundColor:   Colors.surface.overlay,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: Radius.full,
    backgroundColor: Colors.surface.card,
    alignItems: 'center', justifyContent: 'center',
  },
  title: {
    flex: 1, textAlign: 'center',
    fontSize: Typography.size.xl, fontWeight: Typography.weight.bold,
    color: Colors.text.title,
  },

  content: {
    padding:       Spacing.xl,
    paddingBottom: Spacing.xxxl,
    gap:           Spacing.lg,
  },

  readOnlyBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.warning + '18',
    borderRadius: Radius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.warning + '40',
  },
  readOnlyText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.subtitle, lineHeight: 18 },

  inputReadOnly: {
    opacity: 0.5,
  },

  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.primary.default + '18',
    borderRadius: Radius.md, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary.default + '40',
  },
  infoText: { flex: 1, fontSize: Typography.size.sm, color: Colors.text.subtitle, lineHeight: 18 },

  card: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.xl,
    gap:             Spacing.lg,
  },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  groupIcon: {
    width: 40, height: 40, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  groupTitle: { fontSize: Typography.size.md, fontWeight: Typography.weight.bold, color: Colors.text.title },
  groupHint:  { fontSize: Typography.size.xs, color: Colors.text.caption, marginTop: 2 },

  fieldsRow: { flexDirection: 'row' },
  fieldBox:  {},
  fieldLabel: {
    fontSize:      Typography.size.xs,
    color:         Colors.text.caption,
    fontWeight:    Typography.weight.semibold,
    letterSpacing: 0.3,
    marginBottom:  Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface.elevated,
    borderRadius:    Radius.md,
    borderWidth:     1.5,
    paddingVertical: Spacing.md,
    color:           Colors.text.title,
    fontSize:        Typography.size.lg,
    fontWeight:      Typography.weight.bold,
    textAlign:       'center',
  },

  missingCard: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
    padding:         Spacing.xl,
    gap:             Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.surface.elevated,
  },
  missingHead:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  missingTitle: { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.caption },
  missingRow:   { gap: 2 },
  missingKey:   { fontSize: Typography.size.sm, fontWeight: Typography.weight.semibold, color: Colors.text.body },
  missingNote:  { fontSize: Typography.size.xs, color: Colors.text.caption, lineHeight: 16 },

  saveBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius:    Radius.full,
    paddingVertical: Spacing.lg,
    alignItems:      'center',
    marginTop:       Spacing.sm,
  },
  saveBtnText: {
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.bold,
    color:      Colors.text.onGold,
  },
});
