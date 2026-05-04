import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function LoginScreen() {
  const { signIn, signUp, error } = useAuth();
  const [mode, setMode]       = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    if (mode === 'login') {
      await signIn(username.trim(), password);
    } else {
      await signUp(username.trim(), password, isOwner);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <View style={s.brand}>
            <Text style={s.brandIcon}>🏠</Text>
            <Text style={s.brandName}>Smart House</Text>
          </View>
          <Text style={s.tagline}>
            {mode === 'login' ? 'Sign in to your home' : 'Create your account'}
          </Text>

          {/* Form */}
          <View style={s.form}>
            <Text style={s.label}>Username</Text>
            <TextInput
              style={s.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={Colors.text.caption}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.label}>Password</Text>
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              placeholderTextColor={Colors.text.caption}
              secureTextEntry
            />

            {mode === 'register' && (
              <TouchableOpacity
                style={s.ownerRow}
                onPress={() => setIsOwner(v => !v)}
                activeOpacity={0.7}
              >
                <View style={[s.checkbox, isOwner && s.checkboxActive]}>
                  {isOwner && <Text style={s.check}>✓</Text>}
                </View>
                <Text style={s.ownerLabel}>Register as house owner</Text>
              </TouchableOpacity>
            )}

            {!!error && <Text style={s.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color={Colors.text.onGold} />
                : <Text style={s.btnText}>{mode === 'login' ? 'Sign In' : 'Register'}</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Toggle mode */}
          <TouchableOpacity
            onPress={() => { setMode(m => m === 'login' ? 'register' : 'login'); }}
            style={s.toggleBtn}
          >
            <Text style={s.toggleText}>
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.surface.base },
  flex:      { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical:   Spacing.xxxl,
  },

  brand: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  brandIcon: { fontSize: 38, marginRight: Spacing.md },
  brandName: {
    fontSize:   Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color:      Colors.primary.default,
  },
  tagline: {
    fontSize:     Typography.size.md,
    color:        Colors.text.body,
    marginBottom: Spacing.xxl,
  },

  form:        { marginBottom: Spacing.xl },
  label: {
    fontSize:     Typography.size.sm,
    color:        Colors.text.subtitle,
    fontWeight:   Typography.weight.medium,
    marginTop:    Spacing.lg,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.surface.elevated,
    color:           Colors.text.title,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   12,
    fontSize:        Typography.size.md,
  },

  ownerRow:    { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.lg },
  checkbox: {
    width: 20, height: 20,
    borderRadius: Radius.sm,
    borderWidth:  1.5,
    borderColor:  Colors.primary.default,
    marginRight:  Spacing.md,
    alignItems:   'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary.default },
  check:      { color: Colors.text.onGold, fontSize: 12, fontWeight: Typography.weight.bold },
  ownerLabel: { color: Colors.text.body, fontSize: Typography.size.md },

  errorText: {
    color:        Colors.error,
    fontSize:     Typography.size.sm,
    marginTop:    Spacing.md,
    marginBottom: Spacing.xs,
  },

  btn: {
    backgroundColor: Colors.primary.default,
    borderRadius:    Radius.md,
    paddingVertical: 14,
    alignItems:      'center',
    marginTop:       Spacing.xl,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color:      Colors.text.onGold,
    fontSize:   Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },

  toggleBtn:  { marginTop: Spacing.xl, alignItems: 'center' },
  toggleText: { color: Colors.primary.default, fontSize: Typography.size.sm },
});
