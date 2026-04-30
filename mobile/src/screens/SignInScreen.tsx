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

type Nav = NativeStackNavigationProp<AuthStackParamList, 'SignIn'>;

export default function SignInScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); }
    // Navigation handled automatically by RootNavigator on session change
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Lockup markSize={32} wordSize={24} />

        <Text style={styles.heading}>Welcome back.</Text>
        <Text style={styles.sub}>Sign in and pick up where you left off.</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={colors.ash}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />

        <View style={styles.passwordHeader}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
            <Text style={styles.forgotLink}>Forgot password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Enter your password"
            placeholderTextColor={colors.ash}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete="password"
            textContentType="password"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color={colors.silver} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.pearl} size="small" />
          ) : (
            <Text style={styles.primaryBtnText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.footerLink}>Start mixing free</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xxl },
  heading: {
    color: colors.pearl, fontSize: 32, fontWeight: '900',
    marginTop: spacing.xxl, letterSpacing: -1,
  },
  sub: { color: colors.silver, fontSize: 14, marginTop: spacing.sm, marginBottom: spacing.xxl },
  label: { color: colors.cloud, fontSize: 13, fontWeight: '500', marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 14,
    color: colors.pearl, fontSize: 15, marginBottom: spacing.lg,
  },
  passwordHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xs,
  },
  forgotLink: { color: colors.pink, fontSize: 12, fontWeight: '500' },
  passwordWrap: {
    flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg,
  },
  eyeBtn: {
    position: 'absolute', right: 14, top: 14,
  },
  primaryBtn: {
    backgroundColor: colors.pink, borderRadius: radii.lg,
    paddingVertical: 16, alignItems: 'center', marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.pearl, fontSize: 16, fontWeight: '700' },
  errorBox: {
    backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.errorBorder,
    borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.lg,
  },
  errorText: { color: colors.error, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.silver, fontSize: 13 },
  footerLink: { color: colors.pink, fontSize: 13, fontWeight: '600' },
});
