import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { resetPassword, verifyEmail } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

const RULES = [
  { label: 'At least 8 characters',   test: v => v.length >= 8            },
  { label: 'Uppercase letter (A–Z)',   test: v => /[A-Z]/.test(v)         },
  { label: 'Lowercase letter (a–z)',   test: v => /[a-z]/.test(v)         },
  { label: 'Number (0–9)',             test: v => /[0-9]/.test(v)         },
  { label: 'Special character (!@#…)', test: v => /[^A-Za-z0-9]/.test(v) },
];

function isStrongPassword(v) {
  return RULES.every(r => r.test(v));
}

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep]               = useState(1);
  const [username, setUsername]       = useState('');
  const [email, setEmail]             = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [newPwd, setNewPwd]           = useState('');
  const [confirm, setConfirm]         = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);

  const newPwdTouched   = newPwd.length > 0;
  const confirmMismatch = confirm.length > 0 && confirm !== newPwd;
  const canReset        = isStrongPassword(newPwd) && newPwd === confirm;

  async function handleContinue() {
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await verifyEmail(username.trim(), email.trim());
      setVerifiedUser(result);
      setStep(2);
    } catch (e) {
      setError(
        e.message?.includes('404')
          ? 'No account found. Please check your username and email.'
          : 'Failed to verify. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    if (!canReset) return;
    setLoading(true);
    setError('');
    try {
      await resetPassword(verifiedUser?.username ?? username.trim(), email.trim(), newPwd);
      setSuccess(true);
    } catch (e) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" />
        <View style={s.glowTop} />
        <View style={s.glowBottom} />
        <View style={s.successContainer}>
          <View style={s.successIconCircle}>
            <Ionicons name="checkmark" size={48} color={Colors.success} />
          </View>
          <Text style={s.successTitle}>Password Reset!</Text>
          <Text style={s.successSub}>
            Your password has been reset successfully. You can now log in with your new password.
          </Text>
          <TouchableOpacity
            style={s.submitBtn}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Text style={s.submitText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* back button */}
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          {/* logo */}
          <View style={s.logoWrap}>
            <View style={s.logoCircle}>
              <Ionicons name="lock-open-outline" size={38} color={Colors.primary.default} />
            </View>
            <Text style={s.title}>Forgot Password</Text>
            <Text style={s.subtitle}>
              {step === 1
                ? 'Enter your username and email to reset your password'
                : 'Choose a strong new password'}
            </Text>
          </View>

          {/* step indicator */}
          <View style={s.stepRow}>
            <View style={[s.stepDot, s.stepDotActive]} />
            <View style={[s.stepLine, step === 2 && s.stepLineActive]} />
            <View style={[s.stepDot, step === 2 && s.stepDotActive]} />
          </View>

          {/* card */}
          <View style={s.card}>
            {step === 1 ? (
              <>
                {/* username */}
                <Text style={s.fieldLabel}>USERNAME</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.text.caption} />
                  <TextInput
                    placeholder="Enter your username"
                    placeholderTextColor={Colors.text.caption}
                    value={username}
                    onChangeText={t => { setUsername(t); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={s.input}
                  />
                </View>

                {/* email */}
                <Text style={s.fieldLabel}>EMAIL ADDRESS</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="mail-outline" size={18} color={Colors.text.caption} />
                  <TextInput
                    placeholder="Enter your email address"
                    placeholderTextColor={Colors.text.caption}
                    value={email}
                    onChangeText={t => { setEmail(t); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    style={s.input}
                  />
                </View>

                {!!error && (
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.submitBtn, (!username.trim() || !email.trim() || loading) && s.submitBtnDisabled]}
                  onPress={handleContinue}
                  disabled={!username.trim() || !email.trim() || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.text.onGold} />
                    : <>
                        <Text style={s.submitText}>Continue</Text>
                        <Ionicons name="arrow-forward" size={18} color={Colors.text.onGold} />
                      </>
                  }
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* identity display */}
                <View style={s.usernameChip}>
                  <Ionicons name="person-circle-outline" size={16} color={Colors.primary.default} />
                  <Text style={s.usernameChipText}>{username}</Text>
                  <TouchableOpacity onPress={() => { setStep(1); setError(''); }}>
                    <Ionicons name="pencil-outline" size={14} color={Colors.text.caption} />
                  </TouchableOpacity>
                </View>

                {/* new password */}
                <Text style={s.fieldLabel}>NEW PASSWORD</Text>
                <View style={s.inputWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.text.caption} />
                  <TextInput
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.text.caption}
                    secureTextEntry={!showNew}
                    value={newPwd}
                    onChangeText={t => { setNewPwd(t); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={s.input}
                  />
                  <TouchableOpacity onPress={() => setShowNew(v => !v)}>
                    <Ionicons
                      name={showNew ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.text.caption}
                    />
                  </TouchableOpacity>
                </View>

                {/* strength rules */}
                {newPwdTouched && (
                  <View style={s.rulesBox}>
                    {RULES.map(rule => {
                      const passed = rule.test(newPwd);
                      return (
                        <View key={rule.label} style={s.ruleRow}>
                          <Ionicons
                            name={passed ? 'checkmark-circle' : 'ellipse-outline'}
                            size={13}
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

                {/* confirm password */}
                <Text style={[s.fieldLabel, { marginTop: Spacing.md }]}>CONFIRM PASSWORD</Text>
                <View style={[s.inputWrap, confirmMismatch && s.inputWrapError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.text.caption} />
                  <TextInput
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.text.caption}
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={t => { setConfirm(t); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={s.input}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
                    <Ionicons
                      name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={Colors.text.caption}
                    />
                  </TouchableOpacity>
                </View>
                {confirmMismatch && (
                  <Text style={s.errorText}>Passwords do not match</Text>
                )}

                {!!error && (
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.error} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[s.submitBtn, (!canReset || loading) && s.submitBtnDisabled, { marginTop: Spacing.xl }]}
                  onPress={handleReset}
                  disabled={!canReset || loading}
                  activeOpacity={0.85}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.text.onGold} />
                    : <Text style={s.submitText}>Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity style={s.backToLogin} onPress={() => navigation.navigate('Login')}>
            <Text style={s.backToLoginText}>Back to Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },

  glowTop: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 260,
    height: 260,
    borderRadius: 200,
    backgroundColor: '#8B6B0020',
  },

  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 200,
    backgroundColor: '#1A3A8A20',
  },

  container: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxxl,
  },

  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },

  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B6B0018',
    borderWidth: 1.5,
    borderColor: Colors.primary.default,
    marginBottom: Spacing.lg,
  },

  title: {
    fontSize: 26,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
  },

  subtitle: {
    fontSize: Typography.size.sm,
    color: '#A1A1AA',
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
    gap: 0,
  },

  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3A3F50',
  },

  stepDotActive: {
    backgroundColor: Colors.primary.default,
  },

  stepLine: {
    width: 48,
    height: 2,
    backgroundColor: '#3A3F50',
    marginHorizontal: Spacing.sm,
  },

  stepLineActive: {
    backgroundColor: Colors.primary.default,
  },

  card: {
    backgroundColor: '#F4F4F5',
    borderRadius: 34,
    padding: Spacing.xl,
  },

  fieldLabel: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: '#7C7C7C',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D8',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  inputWrapError: {
    borderBottomColor: Colors.error,
  },

  input: {
    flex: 1,
    marginLeft: Spacing.md,
    color: '#111827',
    fontSize: Typography.size.sm,
    paddingVertical: 6,
  },

  rulesBox: {
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },

  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },

  ruleText: {
    fontSize: Typography.size.xs,
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },

  errorText: {
    color: Colors.error,
    fontSize: Typography.size.xs,
    marginBottom: Spacing.sm,
  },

  usernameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ECECEC',
    borderRadius: Radius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xl,
  },

  usernameChipText: {
    color: '#111827',
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    flex: 1,
  },

  submitBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: 15,
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
  },

  submitBtnDisabled: {
    opacity: 0.45,
  },

  submitText: {
    color: Colors.text.onGold,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },

  backToLogin: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },

  backToLoginText: {
    color: '#A1A1AA',
    fontSize: Typography.size.sm,
  },

  // success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },

  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success + '20',
    borderWidth: 1.5,
    borderColor: Colors.success,
    marginBottom: Spacing.lg,
  },

  successTitle: {
    fontSize: 26,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },

  successSub: {
    fontSize: Typography.size.sm,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 20,
  },
});
