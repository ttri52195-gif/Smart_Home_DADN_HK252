import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { listUsers, getUserByUsername, createMember, deleteMember } from '../services/api';
import { Colors, Typography, Spacing, Radius } from '../theme';

// ── Password strength ─────────────────────────────────────────────
const RULES = [
  { label: 'At least 8 characters',   test: v => v.length >= 8            },
  { label: 'Uppercase letter (A–Z)',   test: v => /[A-Z]/.test(v)         },
  { label: 'Lowercase letter (a–z)',   test: v => /[a-z]/.test(v)         },
  { label: 'Number (0–9)',             test: v => /[0-9]/.test(v)         },
  { label: 'Special character (!@#…)', test: v => /[^A-Za-z0-9]/.test(v) },
];
const isStrongPassword = v => RULES.every(r => r.test(v));

// ── Avatar colour pool ────────────────────────────────────────────
const AVATAR_COLORS = ['#4A90E2', '#7B68EE', '#E87040', '#27AE60', '#E4B518', '#EB5757'];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

// ── Member row ────────────────────────────────────────────────────
function MemberRow({ member, isSelf, onDelete, deleting }) {
  const letter   = (member.username ?? '?')[0].toUpperCase();
  const isOwner  = member.role === 'homeowner';
  const canDelete = onDelete && !isSelf && !isOwner;
  return (
    <View style={s.memberRow}>
      <View style={[s.memberAvatar, { backgroundColor: avatarColor(member.username) }]}>
        <Text style={s.memberAvatarText}>{letter}</Text>
      </View>
      <View style={s.memberInfo}>
        <Text style={s.memberName}>
          {member.username}{isSelf ? '  (you)' : ''}
        </Text>
      </View>
      <View style={[s.roleBadge, isOwner ? s.roleBadgeOwner : s.roleBadgeMember]}>
        <Text style={[s.roleText, { color: isOwner ? Colors.primary.default : Colors.text.caption }]}>
          {isOwner ? 'Home Owner' : 'Member'}
        </Text>
      </View>
      {canDelete && (
        deleting
          ? <ActivityIndicator size="small" color={Colors.error} style={s.deleteBtn} />
          : <TouchableOpacity onPress={onDelete} style={s.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────
export default function FamilyMemberScreen({ navigation }) {
  const { token, user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [members,    setMembers]    = useState([]);
  const [isOwner,    setIsOwner]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [banner,     setBanner]     = useState(null);

  // Add-member form (owner only)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirm,  setNewConfirm]  = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [adding,      setAdding]      = useState(false);
  const [deletingId,  setDeletingId]  = useState(null);

  const pwdTouched      = newPassword.length > 0;
  const confirmMismatch = newConfirm.length > 0 && newConfirm !== newPassword;
  const canAdd          = newUsername.trim().length > 0
    && isStrongPassword(newPassword)
    && newPassword === newConfirm;

  useEffect(() => {
    async function load() {
      try {
        const [profile, list] = await Promise.all([
          getUserByUsername(user?.username),
          listUsers(token),
        ]);
        setIsOwner(profile?.is_house_owner === true);
        setProfile(profile);
        setMembers(list);
      } catch (e) {
        console.warn('FamilyMember load error:', e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function confirmDelete(member) {
    Alert.alert(
      'Remove Member',
      `Remove ${member.username} from the household?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => handleDelete(member) },
      ],
    );
  }

  async function handleDelete(member) {
    setDeletingId(member.id);
    try {
      await deleteMember(token, member.id);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setBanner({ type: 'success', msg: `${member.username} has been removed.` });
    } catch (e) {
      console.log(e)
      setBanner({ type: 'error', msg: 'Failed to remove member. Please try again.' });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleAdd() {
    if (!canAdd || adding) return;
    setAdding(true);
    setBanner(null);
    const uname = newUsername.trim();
    try {
      await createMember(token, uname, newPassword, profile?.id);
      setMembers(prev => [...prev, { id: Date.now(), username: uname, role: 'member' }]);
      setNewUsername(''); setNewPassword(''); setNewConfirm('');
      setBanner({ type: 'success', msg: `${uname} added as a family member.` });
    } catch (e) {
      console.log(e);
      const msg = e.message?.includes('400') || e.message?.includes('409')
        ? 'Username already exists.'
        : 'Failed to add member. Please try again.';
      setBanner({ type: 'error', msg });
    } finally {
      setAdding(false);
    }
  }

  return (
    <SafeAreaView style={s.safe}>

      {/* ── Header ─────────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text.title} />
        </TouchableOpacity>
        <Text style={s.title}>Family Members</Text>
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

          {/* ── Banner ───────────────────────────────────── */}
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

          {/* ── Member list ──────────────────────────────── */}
          <Text style={s.sectionLabel}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
          <View style={s.card}>
            {members.length === 0 ? (
              <View style={s.emptyRow}>
                <Text style={s.emptyText}>No members found</Text>
              </View>
            ) : (
              members.map((m, i) => (
                <View key={m.username}>
                  {i > 0 && <View style={s.divider} />}
                  <MemberRow
                    member={m}
                    isSelf={m.username === user?.username}
                    onDelete={isOwner ? () => confirmDelete(m) : undefined}
                    deleting={deletingId === m.id}
                  />
                </View>
              ))
            )}
          </View>

          {/* ── Add member form (owner only) ─────────────── */}
          {isOwner && (
            <>
              <Text style={s.sectionLabel}>ADD MEMBER</Text>
              <View style={s.card}>

                {/* Username */}
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>USERNAME</Text>
                  <View style={s.inputRow}>
                    <Ionicons name="person-outline" size={16} color={Colors.text.caption} style={{ marginRight: Spacing.xs }} />
                    <TextInput
                      style={s.input}
                      value={newUsername}
                      onChangeText={v => { setNewUsername(v); setBanner(null); }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="Enter username"
                      placeholderTextColor={Colors.text.caption}
                    />
                  </View>
                </View>

                <View style={s.divider} />

                {/* Password */}
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>PASSWORD</Text>
                  <View style={s.inputRow}>
                    <Ionicons name="lock-closed-outline" size={16} color={Colors.text.caption} style={{ marginRight: Spacing.xs }} />
                    <TextInput
                      style={s.input}
                      value={newPassword}
                      onChangeText={v => { setNewPassword(v); setBanner(null); }}
                      secureTextEntry={!showPwd}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.text.caption}
                    />
                    <TouchableOpacity onPress={() => setShowPwd(v => !v)} style={s.eyeBtn}>
                      <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.text.caption} />
                    </TouchableOpacity>
                  </View>

                  {/* Strength rules */}
                  {pwdTouched && (
                    <View style={s.rulesBox}>
                      {RULES.map(rule => {
                        const passed = rule.test(newPassword);
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
                </View>

                <View style={s.divider} />

                {/* Confirm password */}
                <View style={s.fieldGroup}>
                  <Text style={s.fieldLabel}>CONFIRM PASSWORD</Text>
                  <View style={[s.inputRow, confirmMismatch && s.inputRowError]}>
                    <Ionicons name="lock-closed-outline" size={16} color={Colors.text.caption} style={{ marginRight: Spacing.xs }} />
                    <TextInput
                      style={s.input}
                      value={newConfirm}
                      onChangeText={v => { setNewConfirm(v); setBanner(null); }}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      autoCorrect={false}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.text.caption}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={s.eyeBtn}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.text.caption} />
                    </TouchableOpacity>
                  </View>
                  {confirmMismatch && (
                    <Text style={s.fieldError}>Passwords do not match</Text>
                  )}
                </View>

              </View>

              <TouchableOpacity
                style={[s.addBtn, (!canAdd || adding) && s.addBtnDisabled]}
                onPress={handleAdd}
                disabled={!canAdd || adding}
                activeOpacity={0.85}
              >
                {adding
                  ? <ActivityIndicator color={Colors.text.onGold} />
                  : <>
                      <Ionicons name="person-add-outline" size={18} color={Colors.text.onGold} />
                      <Text style={s.addBtnText}>Add Member</Text>
                    </>
                }
              </TouchableOpacity>
            </>
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
    paddingTop:        Spacing.sm,
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

  sectionLabel: {
    color:         Colors.text.caption,
    fontSize:      Typography.size.xs,
    fontWeight:    Typography.weight.bold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom:  -Spacing.xs,
  },

  card: {
    backgroundColor: Colors.surface.card,
    borderRadius:    Radius.lg,
  },
  divider: { height: 0.5, backgroundColor: Colors.surface.elevated, marginLeft: Spacing.lg },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems:    'center',
    padding:       Spacing.lg,
    gap:           Spacing.lg,
  },
  memberAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: { color: '#fff', fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  memberInfo:  { flex: 1 },
  memberName:  { color: Colors.text.title, fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  roleBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   3,
    borderRadius:      Radius.full,
    borderWidth:       1,
  },
  roleBadgeOwner:  { backgroundColor: Colors.primary.default + '22', borderColor: Colors.primary.default + '88' },
  roleBadgeMember: { backgroundColor: Colors.surface.elevated,       borderColor: Colors.surface.elevated       },
  roleText:  { fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold },
  deleteBtn: { padding: Spacing.xs, marginLeft: Spacing.sm },

  emptyRow:  { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { color: Colors.text.caption, fontSize: Typography.size.sm },

  // Form fields
  fieldGroup:   { padding: Spacing.lg, gap: Spacing.sm },
  fieldLabel:   { color: Colors.text.caption, fontSize: Typography.size.xs, fontWeight: Typography.weight.semibold, letterSpacing: 0.5 },
  fieldError:   { color: Colors.error, fontSize: Typography.size.xs, marginTop: 2 },
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
    flex: 1,
    color: Colors.text.title,
    fontSize: Typography.size.md,
    paddingVertical: Spacing.md,
  },
  eyeBtn:  { padding: Spacing.xs },
  rulesBox:{ marginTop: Spacing.sm, gap: Spacing.xs },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ruleText:{ fontSize: Typography.size.xs },

  // Add button
  addBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    backgroundColor: Colors.primary.default,
    borderRadius:    Radius.full,
    paddingVertical: Spacing.lg,
  },
  addBtnDisabled: { opacity: 0.45 },
  addBtnText: {
    color:      Colors.text.onGold,
    fontSize:   Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
});
