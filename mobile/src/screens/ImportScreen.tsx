import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing } from '../lib/theme';

export default function ImportScreen() {
  const [loading, setLoading] = useState<string | null>(null);

  const connectSpotify = async () => {
    setLoading('spotify');
    try {
      const { data, error } = await supabase.functions.invoke('spotify-auth-url', {
        body: { redirect_uri: 'https://getmixd.app/auth/spotify/callback' },
      });
      if (error || !data?.url) throw new Error(error?.message || 'No auth URL');
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
    setLoading(null);
  };

  const connectYouTube = async () => {
    setLoading('youtube');
    try {
      const { data, error } = await supabase.functions.invoke('youtube-auth-url', {
        body: { redirect_uri: 'https://getmixd.app/auth/youtube/callback' },
      });
      if (error || !data?.url) throw new Error(error?.message || 'No auth URL');
      await WebBrowser.openBrowserAsync(data.url);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
    setLoading(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>Import</Text>
      <Text style={styles.sub}>Connect your music accounts to import playlists and liked songs.</Text>

      <View style={styles.cards}>
        {/* Spotify */}
        <TouchableOpacity style={styles.card} onPress={connectSpotify} disabled={loading === 'spotify'}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(29,185,84,0.15)' }]}>
            <Ionicons name="logo-spotify" size={28} color="#1DB954" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>Spotify</Text>
            <Text style={styles.cardSub}>Import playlists & liked songs</Text>
          </View>
          {loading === 'spotify' ? (
            <ActivityIndicator color={colors.pink} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.ash} />
          )}
        </TouchableOpacity>

        {/* YouTube */}
        <TouchableOpacity style={styles.card} onPress={connectYouTube} disabled={loading === 'youtube'}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,0,0,0.15)' }]}>
            <Ionicons name="logo-youtube" size={28} color="#FF0000" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>YouTube</Text>
            <Text style={styles.cardSub}>Import playlists & subscriptions</Text>
          </View>
          {loading === 'youtube' ? (
            <ActivityIndicator color={colors.pink} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.ash} />
          )}
        </TouchableOpacity>

        {/* SoundCloud — manual link paste (no OAuth) */}
        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,85,0,0.15)' }]}>
            <Ionicons name="cloud" size={28} color="#FF5500" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>SoundCloud</Text>
            <Text style={styles.cardSub}>Paste links in Search or Library</Text>
          </View>
          <Ionicons name="checkmark-circle" size={20} color={colors.lime} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  heading: {
    color: colors.pearl, fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg,
  },
  sub: {
    color: colors.silver, fontSize: 14, paddingHorizontal: spacing.lg,
    marginTop: spacing.sm, marginBottom: spacing.xxl,
  },
  cards: { paddingHorizontal: spacing.lg, gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.void, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.xl, padding: spacing.lg,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: radii.lg,
    justifyContent: 'center', alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { color: colors.pearl, fontSize: 15, fontWeight: '700' },
  cardSub: { color: colors.silver, fontSize: 12, marginTop: 2 },
});
