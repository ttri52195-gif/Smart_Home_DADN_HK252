import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const passwordRef = useRef(null);

  const isDisabled = loading || !form.email || !form.password;

  const handleLogin = async () => {
    if (loading) return;

    if (!form.email || !form.password) {
      setError('Please enter email and password');
      return;
    }

    if (!form.email.includes('@')) {
      setError('Invalid email');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await signIn({
        username: form.email.trim(),
        password: form.password,
      });
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={s.container}>
            {/* Title */}
            <Text style={s.title}>Welcome Back</Text>
            <Text style={s.subtitle}>Login to your smart home</Text>

            {/* Email */}
            <TextInput
              placeholder="Email"
              autoFocus
              value={form.email}
              onChangeText={handleChange('email')}
              style={s.input}
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            {/* Password */}
            <TextInput
              ref={passwordRef}
              placeholder="Password"
              value={form.password}
              onChangeText={handleChange('password')}
              style={s.input}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
              <Text>{showPassword ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>

            {/* Error */}
            {error ? <Text style={s.errorText}>{error}</Text> : null}

            {/* Button */}
            <TouchableOpacity
              style={[s.btn, isDisabled && s.btnDisabled]}
              onPress={handleLogin}
              disabled={isDisabled}
            >
              {loading ? (
                <ActivityIndicator color={Colors.text.onGold} />
              ) : (
                <Text style={s.btnText}>Login</Text>
              )}
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.base },
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl,
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  brandIcon: { fontSize: 38, marginRight: Spacing.md },
  brandName: {
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.bold,
    color: Colors.primary.default,
  },
  tagline: {
    fontSize: Typography.size.md,
    color: Colors.text.body,
    marginBottom: Spacing.xxl,
  },

  form: { marginBottom: Spacing.xl },
  label: {
    fontSize: Typography.size.sm,
    color: Colors.text.subtitle,
    fontWeight: Typography.weight.medium,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surface.elevated,
    color: Colors.text.title,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    fontSize: Typography.size.md,
  },

  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Colors.primary.default,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: { backgroundColor: Colors.primary.default },
  check: {
    color: Colors.text.onGold,
    fontSize: 12,
    fontWeight: Typography.weight.bold,
  },
  ownerLabel: { color: Colors.text.body, fontSize: Typography.size.md },

  errorText: {
    color: Colors.error,
    fontSize: Typography.size.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },

  btn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: Colors.text.onGold,
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
  },

  toggleBtn: { marginTop: Spacing.xl, alignItems: 'center' },
  toggleText: { color: Colors.primary.default, fontSize: Typography.size.sm },
});
