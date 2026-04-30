import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ScrollView, Platform, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth';
import { usePlayer, formatTime } from '../lib/player';
import { supabase } from '../lib/supabase';
import { Lockup } from '../components/Logo';
import { colors, radii, spacing } from '../lib/theme';

interface HomeTrack {
  id: string; title: string; artist: string | null; source_platform: string;
  source_url: string; source_id: string | null; thumbnail_url: string | null;
  duration_seconds: number | null;
}

function greeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Late night';
}

const STARTERS = ['Tiny Desk', 'Boiler Room', 'Fred again', 'Tyler the Creator', 'Colors Show', 'KEXP Live'];

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { play, currentTrack, isPlaying, togglePlayPause, replaceQueue } = usePlayer();
  const [recent, setRecent] = useState<HomeTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'there';
  const hello = greeting(new Date().getHours());

  const loadRecent = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setLoading(false); return; }
    const { data } = await supabase
      .from('library_tracks')
      .select('track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
      .eq('user_id', u.id)
      .order('added_at', { ascending: false })
      .limit(6);
    if (data) {
      setRecent((data as any[]).map((r) => r.track).filter(Boolean));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecent();
    setRefreshing(false);
  }, [loadRecent]);

  const handlePlayRecent = (t: HomeTrack) => {
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) { togglePlayPause(); return; }
    play({
      id: t.id, title: t.title, artist: t.artist || 'Unknown artist',
      thumbnail_url: t.thumbnail_url || '', audio_url: '',
      duration_seconds: t.duration_seconds || 0, source_platform: t.source_platform,
      source_id: t.source_id || '', source_url: t.source_url,
    });
    const idx = recent.findIndex((r) => r.id === t.id);
    if (idx >= 0 && idx < recent.length - 1) {
      replaceQueue(recent.slice(idx + 1).map((r) => ({
        id: r.id, title: r.title, artist: r.artist || 'Unknown artist',
        thumbnail_url: r.thumbnail_url || '', audio_url: '',
        duration_seconds: r.duration_seconds || 0, source_platform: r.source_platform,
        source_id: r.source_id || '', source_url: r.source_url,
      })));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
        }
      >
        <View style={styles.header}>
          <Lockup markSize={24} wordSize={18} />
        </View>

        <Text style={styles.greeting}>{hello}, {displayName}.</Text>
        <Text style={styles.headline}>What are we mixing today?</Text>

        {/* Quick Start Cards */}
        <Text style={styles.sectionLabel}>QUICK START</Text>
        <View style={styles.cardsRow}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Search')}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(255,45,135,0.15)' }]}>
              <Ionicons name="search" size={20} color={colors.pink} />
            </View>
            <Text style={styles.cardTitle}>Search</Text>
            <Text style={styles.cardSub}>All platforms</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Library')}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(45,107,255,0.15)' }]}>
              <Ionicons name="musical-note" size={20} color={colors.cobalt} />
            </View>
            <Text style={styles.cardTitle}>Library</Text>
            <Text style={styles.cardSub}>Paste a link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('Playlists')}>
            <View style={[styles.cardIcon, { backgroundColor: 'rgba(61,220,132,0.15)' }]}>
              <Ionicons name="list" size={20} color={colors.lime} />
            </View>
            <Text style={styles.cardTitle}>Playlists</Text>
            <Text style={styles.cardSub}>Mix anything</Text>
          </TouchableOpacity>
        </View>

        {/* Recently Added */}
        <Text style={styles.sectionLabel}>RECENTLY ADDED</Text>
        {loading ? (
          <Text style={styles.muted}>Loading...</Text>
        ) : recent.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="musical-notes" size={40} color={colors.ash} />
            <Text style={styles.emptyTitle}>Your library is empty — so far.</Text>
            <Text style={styles.emptyDesc}>Paste a link or search to save your first track.</Text>
          </View>
        ) : (
          <FlatList
            data={recent}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 10 }}
            renderItem={({ item }) => {
              const isThis = currentTrack?.source_id === item.source_id;
              return (
                <TouchableOpacity
                  style={styles.trackCard}
                  onPress={() => handlePlayRecent(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.trackThumb}>
                    {item.thumbnail_url ? (
                      <Image source={{ uri: item.thumbnail_url }} style={styles.trackImg} />
                    ) : (
                      <Ionicons name="musical-note" size={24} color={colors.silver} />
                    )}
                    {item.duration_seconds ? (
                      <View style={styles.durBadge}>
                        <Text style={styles.durText}>{formatTime(item.duration_seconds)}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.trackTitle, isThis && { color: colors.pink }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.trackArtist} numberOfLines={1}>{item.artist || 'Unknown'}</Text>
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Try This */}
        <Text style={styles.sectionLabel}>TRY THIS</Text>
        <View style={styles.chipsRow}>
          {STARTERS.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.chip}
              onPress={() => navigation.navigate('Search', { initialQuery: q })}
            >
              <Ionicons name="search" size={12} color={colors.silver} />
              <Text style={styles.chipText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  greeting: { color: colors.silver, fontSize: 14, marginBottom: spacing.xs },
  headline: { color: colors.pearl, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginBottom: spacing.xxl },
  sectionLabel: {
    color: colors.silver, fontSize: 10, fontWeight: '700', letterSpacing: 1.5,
    marginBottom: spacing.md, marginTop: spacing.lg,
  },
  cardsRow: { flexDirection: 'row', gap: 10 },
  card: {
    flex: 1, backgroundColor: colors.void, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.xl, padding: spacing.lg,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: radii.md,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  cardTitle: { color: colors.pearl, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  cardSub: { color: colors.silver, fontSize: 11 },
  muted: { color: colors.silver, fontSize: 13, paddingVertical: spacing.lg },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { color: colors.pearl, fontSize: 15, fontWeight: '600', marginTop: spacing.md },
  emptyDesc: { color: colors.silver, fontSize: 13, marginTop: spacing.xs },
  trackCard: { width: 130 },
  trackThumb: {
    width: 130, height: 130, borderRadius: radii.md, backgroundColor: colors.graphite,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  trackImg: { width: 130, height: 130 },
  durBadge: {
    position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  durText: { color: colors.pearl, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  trackTitle: { color: colors.pearl, fontSize: 12, fontWeight: '600', marginTop: 6 },
  trackArtist: { color: colors.silver, fontSize: 11, marginTop: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.void, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipText: { color: colors.cloud, fontSize: 12, fontWeight: '500' },
});

