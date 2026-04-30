import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing } from '../lib/theme';

interface ConnStatus {
  spotify: boolean;
  youtube: boolean;
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [connections, setConnections] = useState<ConnStatus>({ spotify: false, youtube: false });
  const [loadingConn, setLoadingConn] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const [sp, yt] = await Promise.all([
        supabase.from('spotify_connections')
          .select('user_id').eq('user_id', user.id).maybeSingle(),
        supabase.from('youtube_connections')
          .select('user_id').eq('user_id', user.id).maybeSingle(),
      ]);
      setConnections({ spotify: !!sp.data, youtube: !!yt.data });
      setLoadingConn(false);
    })();
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', { body: {} });
      if (error || !data?.url) {
        Alert.alert('Error', 'Unable to open billing portal.');
        return;
      }
      await Linking.openURL(data.url);
    } catch {
      Alert.alert('Error', 'Unable to open billing portal.');
    }
  };

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const initial = (user?.user_metadata?.username?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.heading}>Settings</Text>

        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Connected Accounts */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CONNECTED ACCOUNTS</Text>
          {loadingConn ? (
            <ActivityIndicator color={colors.pink} style={{ marginVertical: spacing.lg }} />
          ) : (
            <>
              <View style={styles.connRow}>
                <Ionicons name="logo-spotify" size={20} color="#1DB954" />
                <Text style={styles.connName}>Spotify</Text>
                <View style={[styles.badge, connections.spotify ? styles.badgeOn : styles.badgeOff]}>
                  <Text style={styles.badgeText}>{connections.spotify ? 'Connected' : 'Not connected'}</Text>
                </View>
              </View>
              <View style={styles.connRow}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <Text style={styles.connName}>YouTube</Text>
                <View style={[styles.badge, connections.youtube ? styles.badgeOn : styles.badgeOff]}>
                  <Text style={styles.badgeText}>{connections.youtube ? 'Connected' : 'Not connected'}</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Subscription */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SUBSCRIPTION</Text>
          <TouchableOpacity style={styles.actionRow} onPress={handleManageSubscription}>
            <Ionicons name="card" size={18} color={colors.pink} />
            <Text style={styles.actionText}>Manage Subscription & Billing</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ash} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color={colors.pearl} size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={colors.pearl} />
                <Text style={styles.signOutText}>Sign out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Mixd v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  heading: {
    color: colors.pearl, fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.xxl },
  sectionLabel: {
    color: colors.silver, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: spacing.md,
  },
  profileRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.void, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.xl, padding: spacing.lg,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.pink,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: colors.pearl, fontSize: 16, fontWeight: '800' },
  profileName: { color: colors.pearl, fontSize: 15, fontWeight: '600' },
  profileEmail: { color: colors.silver, fontSize: 12, marginTop: 2 },
  connRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate,
  },
  connName: { flex: 1, color: colors.pearl, fontSize: 14, fontWeight: '500' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full },
  badgeOn: { backgroundColor: 'rgba(61,220,132,0.15)' },
  badgeOff: { backgroundColor: colors.graphite },
  badgeText: { color: colors.silver, fontSize: 11, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.void, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.xl, padding: spacing.lg,
  },
  actionText: { flex: 1, color: colors.pearl, fontSize: 14, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.graphite, borderRadius: radii.lg, paddingVertical: 14,
  },
  signOutText: { color: colors.pearl, fontSize: 14, fontWeight: '600' },
  version: {
    color: colors.ash, fontSize: 11, textAlign: 'center', marginTop: spacing.lg,
  },
});
