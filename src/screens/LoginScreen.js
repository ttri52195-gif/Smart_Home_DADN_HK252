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
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { Colors, Typography, Spacing, Radius } from '../theme';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!username.trim() || !password.trim()) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await signIn(username.trim(), password);
      } else {
        await signUp(username.trim(), password);

        setPassword('');

        setUsername('');

        setMode('login');

        setError('');

        alert('Account created successfully!\n Please login to continue.');
      }
    } catch (e) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />

      {/* background glow */}
      <View style={s.glowTop} />
      <View style={s.glowBottom} />

      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons
              name="home-outline"
              size={42}
              color={Colors.primary.default}
            />
          </View>

          <Text style={s.title}>Smart House</Text>
        </View>

        {/* card */}
        <View style={s.card}>
          {/* tabs */}
          <View style={s.tabs}>
            <TouchableOpacity
              style={[s.tabBtn, mode === 'login' && s.tabBtnActive]}
              onPress={() => {
                setMode('login');
                setError('');
              }}
            >
              <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>
                Login
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.tabBtn, mode === 'signup' && s.tabBtnActive]}
              onPress={() => {
                setMode('signup');
                setError('');
              }}
            >
              <Text style={[s.tabText, mode === 'signup' && s.tabTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* username */}
          <View style={s.inputWrap}>
            <Ionicons
              name="person-outline"
              size={18}
              color={Colors.text.caption}
            />

            <TextInput
              placeholder="Username"
              placeholderTextColor={Colors.text.caption}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              style={s.input}
            />
          </View>

          {/* password */}
          <View style={s.inputWrap}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={Colors.text.caption}
            />

            <TextInput
              placeholder="Password"
              placeholderTextColor={Colors.text.caption}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={s.input}
            />

            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color={Colors.text.caption}
              />
            </TouchableOpacity>
          </View>

          {/* error */}
          {!!error && <Text style={s.error}>{error}</Text>}

          {/* submit */}
          <TouchableOpacity
            style={[
              s.submitBtn,
              loading && {
                opacity: 0.7,
              },
            ]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.text.onGold} />
            ) : (
              <Text style={s.submitText}>
                {mode === 'login' ? 'Login' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },

  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },

  // glow
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

  // logo
  logoWrap: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },

  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B6B0018',
    borderWidth: 1.5,
    borderColor: Colors.primary.default,
    marginBottom: Spacing.lg,
  },

  title: {
    fontSize: 30,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
  },

  subtitle: {
    marginTop: Spacing.sm,
    fontSize: Typography.size.sm,
    color: '#A1A1AA',
  },

  // card
  card: {
    backgroundColor: '#F4F4F5',
    borderRadius: 34,
    padding: Spacing.xl,
  },

  // tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ECECEC',
    borderRadius: Radius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },

  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.full,
  },

  tabBtnActive: {
    backgroundColor: Colors.primary.default,
  },

  tabText: {
    color: '#7C7C7C',
    fontWeight: Typography.weight.semibold,
    fontSize: Typography.size.sm,
  },

  tabTextActive: {
    color: '#FFFFFF',
  },

  // input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#D4D4D8',
    marginBottom: Spacing.xl,
    paddingBottom: Spacing.sm,
  },

  input: {
    flex: 1,
    marginLeft: Spacing.md,
    color: '#111827',
    fontSize: Typography.size.sm,
    paddingVertical: 6,
  },

  // error
  error: {
    color: '#DC2626',
    fontSize: Typography.size.xs,
    marginBottom: Spacing.md,
  },

  // button
  submitBtn: {
    backgroundColor: Colors.primary.default,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginTop: Spacing.sm,
  },

  submitText: {
    color: '#FFFFFF',
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
