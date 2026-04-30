import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { Lockup } from '../components/Logo';
import { colors, radii, spacing } from '../lib/theme';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await resetPassword(email);
    setLoading(false);
    if (err) { setError(err); } else { setSent(true); }
  };

  if (sent) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail" size={32} color={colors.pink} />
        </View>
        <Text style={styles.sentTitle}>Check your email.</Text>
        <Text style={styles.sentSub}>
          If an account exists for <Text style={{ color: colors.pearl, fontWeight: '600' }}>{email}</Text>,
          we sent a password reset link.
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={18} color={colors.silver} />
          <Text style={styles.backText}>Back to sign in</Text>
        </TouchableOpacity>

        <Lockup markSize={32} wordSize={24} />
        <Text style={styles.heading}>Reset password.</Text>
        <Text style={styles.sub}>Enter your email — we'll send a reset link.</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.ash}
          value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email"
          keyboardType="email-address" textContentType="emailAddress" />

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.pearl} size="small" />
            : <Text style={styles.primaryBtnText}>Send reset link</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xxl },
  backText: { color: colors.silver, fontSize: 13 },
  heading: { color: colors.pearl, fontSize: 32, fontWeight: '900', marginTop: spacing.xxl, letterSpacing: -1 },
  sub: { color: colors.silver, fontSize: 14, marginTop: spacing.sm, marginBottom: spacing.xxl },
  label: { color: colors.cloud, fontSize: 13, fontWeight: '500', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 14,
    color: colors.pearl, fontSize: 15, marginBottom: spacing.lg,
  },
  primaryBtn: { backgroundColor: colors.pink, borderRadius: radii.lg, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.pearl, fontSize: 16, fontWeight: '700' },
  errorBox: {
    backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorText: { color: colors.error, fontSize: 13 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,45,135,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xxl,
  },
  sentTitle: { color: colors.pearl, fontSize: 28, fontWeight: '900', marginBottom: spacing.md },
  sentSub: { color: colors.silver, fontSize: 14, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 20 },
  link: { color: colors.pink, fontSize: 13, fontWeight: '600' },
});
