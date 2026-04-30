import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { Lockup } from '../components/Logo';
import { colors, radii, spacing } from '../lib/theme';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignUp'>;

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const navigation = useNavigation<Nav>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
  };
  const passwordValid = checks.length && checks.upper && checks.number;

  const handleSubmit = async () => {
    if (!username || !email || !password) { setError('Please fill in all fields.'); return; }
    if (!passwordValid) return;
    setError('');
    setLoading(true);
    const { error: err } = await signUp(email, password, username);
    setLoading(false);
    if (err) { setError(err); } else { setSuccess(true); }
  };

  if (success) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.successCircle}>
          <Ionicons name="checkmark" size={32} color={colors.pink} />
        </View>
        <Text style={styles.successTitle}>Check your email.</Text>
        <Text style={styles.successSub}>
          We sent a confirmation link to <Text style={{ color: colors.pearl, fontWeight: '600' }}>{email}</Text>.
          {'\n'}Click it to activate your account and start mixing.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
          <Text style={styles.footerLink}>Back to sign in</Text>
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
        <Text style={styles.heading}>Start mixing.</Text>
        <Text style={styles.sub}>Free forever. No card. No catch.</Text>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} placeholder="yourname" placeholderTextColor={colors.ash}
          value={username} onChangeText={setUsername} autoCapitalize="none" autoComplete="username" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} placeholder="you@example.com" placeholderTextColor={colors.ash}
          value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordWrap}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Create a password"
            placeholderTextColor={colors.ash} value={password} onChangeText={setPassword}
            secureTextEntry={!showPassword} autoComplete="password-new" />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.silver} />
          </TouchableOpacity>
        </View>

        {password.length > 0 && (
          <View style={styles.checks}>
            {[
              { ok: checks.length, label: 'At least 8 characters' },
              { ok: checks.upper, label: 'One uppercase letter' },
              { ok: checks.number, label: 'One number' },
            ].map(({ ok, label }) => (
              <View key={label} style={styles.checkRow}>
                <View style={[styles.checkDot, ok && styles.checkDotOk]}>
                  {ok && <Ionicons name="checkmark" size={10} color={colors.ink} />}
                </View>
                <Text style={[styles.checkLabel, ok && styles.checkLabelOk]}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, (!passwordValid || loading) && styles.btnDisabled]}
          onPress={handleSubmit} disabled={!passwordValid || loading} activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color={colors.pearl} size="small" />
            : <Text style={styles.primaryBtnText}>Create account</Text>
          }
        </TouchableOpacity>

        <Text style={styles.terms}>By signing up, you agree to our Terms and Privacy Policy.</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
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
  passwordWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  eyeBtn: { position: 'absolute', right: 14, top: 14 },
  checks: { marginBottom: spacing.lg, gap: 6 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkDot: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: colors.graphite,
    borderWidth: 1, borderColor: colors.slate, justifyContent: 'center', alignItems: 'center',
  },
  checkDotOk: { backgroundColor: colors.pink, borderColor: colors.pink },
  checkLabel: { color: colors.silver, fontSize: 11 },
  checkLabelOk: { color: colors.cloud },
  primaryBtn: {
    backgroundColor: colors.pink, borderRadius: radii.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: colors.pearl, fontSize: 16, fontWeight: '700' },
  terms: { color: colors.silver, fontSize: 11, textAlign: 'center', marginTop: spacing.lg },
  errorBox: {
    backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorText: { color: colors.error, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.silver, fontSize: 13 },
  footerLink: { color: colors.pink, fontSize: 13, fontWeight: '600' },
  successCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,45,135,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xxl,
  },
  successTitle: { color: colors.pearl, fontSize: 28, fontWeight: '900', marginBottom: spacing.md },
  successSub: { color: colors.silver, fontSize: 14, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 20 },
});
