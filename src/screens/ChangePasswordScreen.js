import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const RULES = [
  { label: 'At least 8 characters',    test: v => v.length >= 8              },
  { label: 'Uppercase letter (A–Z)',    test: v => /[A-Z]/.test(v)           },
  { label: 'Lowercase letter (a–z)',    test: v => /[a-z]/.test(v)           },
  { label: 'Number (0–9)',              test: v => /[0-9]/.test(v)           },
  { label: 'Special character (!@#…)',  test: v => /[^A-Za-z0-9]/.test(v)   },
];

function isStrongPassword(v) {
  return RULES.every(r => r.test(v));
}

function PasswordInput({ label, value, onChange, show, onToggleShow, error }) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputRow, error && s.inputRowError]}>
        <TextInput
          style={s.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={Colors.text.caption}
          placeholder="••••••••"
        />
        <TouchableOpacity onPress={onToggleShow} style={s.eyeBtn}>
          <Ionicons
            name={show ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={Colors.text.caption}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function ChangePasswordScreen({ navigation }) {
  const { token } = useAuth();

  const [current,    setCurrent]    = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [banner,     setBanner]     = useState(null); // { type: 'success'|'error', msg }

  const newPwdTouched  = newPwd.length > 0;
  const confirmMismatch = confirm.length > 0 && confirm !== newPwd;
  const canSubmit = current.length > 0 && isStrongPassword(newPwd) && newPwd === confirm;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setBanner(null);
    try {
      await changePassword(token, current, newPwd);
      setBanner({ type: 'success', msg: 'Password changed successfully.' });
      setCurrent(''); setNewPwd(''); setConfirm('');
    } catch (e) {
      const msg = e.message?.includes('401') || e.message?.toLowerCase().includes('incorrect')
        ? 'Current password is incorrect.'
        : 'Failed to change password. Please try again.';
      setBanner({ type: 'error', msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.title} />
        </TouchableOpacity>
        <Text style={s.title}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Banner ─────────────────────────────────────── */}
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

        {/* ── Inputs ─────────────────────────────────────── */}
        <View style={s.card}>
          <PasswordInput
            label="Current Password"
            value={current}
            onChange={setCurrent}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(v => !v)}
          />

          <View style={s.divider} />

          <PasswordInput
            label="New Password"
            value={newPwd}
            onChange={v => { setNewPwd(v); setBanner(null); }}
            show={showNew}
            onToggleShow={() => setShowNew(v => !v)}
          />

          {/* ── Strength rules ─────────────────────────── */}
          {newPwdTouched && (
            <View style={s.rulesBox}>
              {RULES.map(rule => {
                const passed = rule.test(newPwd);
                return (
                  <View key={rule.label} style={s.ruleRow}>
                    <Ionicons
                      name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={14}
                      color={passed ? Colors.success : Colors.text.caption}
                    />
                    <Text style={[s.ruleText, { color: passed ? Colors.success : Colors.text.caption }]}>
                      {rule.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          <View style={s.divider} />

          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={v => { setConfirm(v); setBanner(null); }}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
            error={confirmMismatch ? 'Passwords do not match' : undefined}
          />
        </View>

        {/* ── Submit ─────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.submitBtn, (!canSubmit || loading) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.text.onGold} />
            : <Text style={s.submitText}>Save Password</Text>
          }
        </TouchableOpacity>

      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.surface.base },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:   { color: Colors.text.title, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },

  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop:        Spacing.md,
    paddingBottom:     Spacing.xxxl,
    gap:               Spacing.lg,
  },

  banner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    padding:       Spacing.lg,
    borderRadius:  Radius.lg,
    borderWidth:   1,
  },
  bannerSuccess: { backgroundColor: Colors.success + '18', borderColor: Colors.success + '55' },
  bannerError:   { backgroundColor: Colors.error   + '18', borderColor: Colors.error   + '55' },
  bannerText:    { flex: 1, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },

  card: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
  },
  divider: { height: 0.5, backgroundColor: Colors.surface.elevated, marginHorizontal: Spacing.lg },

  fieldGroup: { padding: Spacing.lg, gap: Spacing.sm },
  fieldLabel: { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, letterSpacing: 0.5 },
  fieldError: { color: Colors.error, fontSize: Typography.size.xs, marginTop: 2 },

  inputRow: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface.elevated,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     'transparent',
    paddingHorizontal: Spacing.md,
  },
  inputRowError: { borderColor: Colors.error },
  input: {
    flex:      1,
    color:     Colors.text.title,
    fontSize:  Typography.size.md,
    paddingVertical: Spacing.md,
  },
  eyeBtn: { padding: Spacing.xs },

  rulesBox: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.xs },
  ruleRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleText: { fontSize: Typography.size.xs },

  submitBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius:    Radius.full,
    paddingVertical: Spacing.lg,
    alignItems:      'center',
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: {
    color:      Colors.text.onGold,
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
