import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer, formatTime } from '../lib/player';
import { supabase } from '../lib/supabase';
import { saveTrackToLibrary } from '../lib/api';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import { colors, radii, spacing } from '../lib/theme';

interface LibTrack {
  id: string; title: string; artist: string | null; source_platform: string;
  source_url: string; source_id: string | null; thumbnail_url: string | null;
  duration_seconds: number | null;
}

export default function LibraryScreen() {
  const { play, currentTrack, isPlaying, togglePlayPause, replaceQueue } = usePlayer();
  const [tracks, setTracks] = useState<LibTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');
  const [playlistModalTrack, setPlaylistModalTrack] = useState<LibTrack | null>(null);

  const loadTracks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('library_tracks')
      .select('track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });
    if (data) setTracks((data as any[]).map((r) => r.track).filter(Boolean));
    setLoading(false);
  }, []);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTracks();
    setRefreshing(false);
  }, [loadTracks]);

  const handlePaste = async () => {
    if (!pasteUrl.trim()) return;
    try {
      await saveTrackToLibrary({
        title: pasteUrl.trim(), artist: '', source_platform: 'youtube',
        source_url: pasteUrl.trim(), source_id: pasteUrl.trim(),
        thumbnail_url: '', duration_seconds: null,
      });
      setPasteUrl('');
      Alert.alert('Saved', 'Track added to your library.');
      loadTracks();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handlePlayTrack = (t: LibTrack, index: number) => {
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) { togglePlayPause(); return; }
    play({
      id: t.id, title: t.title, artist: t.artist || 'Unknown artist',
      thumbnail_url: t.thumbnail_url || '', audio_url: '',
      duration_seconds: t.duration_seconds || 0, source_platform: t.source_platform,
      source_id: t.source_id || '', source_url: t.source_url,
    });
    replaceQueue(tracks.slice(index + 1).map((r) => ({
      id: r.id, title: r.title, artist: r.artist || 'Unknown artist',
      thumbnail_url: r.thumbnail_url || '', audio_url: '',
      duration_seconds: r.duration_seconds || 0, source_platform: r.source_platform,
      source_id: r.source_id || '', source_url: r.source_url,
    })));
  };

  const renderItem = ({ item, index }: { item: LibTrack; index: number }) => {
    const isThis = currentTrack?.source_id === item.source_id;
    return (
      <TouchableOpacity style={styles.row} onPress={() => handlePlayTrack(item, index)}>
        <View style={styles.thumbWrap}>
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
          ) : (
            <Ionicons name="musical-note" size={20} color={colors.silver} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, isThis && { color: colors.pink }]} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{item.artist || 'Unknown artist'}</Text>
        </View>
        {item.duration_seconds ? (
          <Text style={styles.dur}>{formatTime(item.duration_seconds)}</Text>
        ) : null}
        <TouchableOpacity
          onPress={() => setPlaylistModalTrack(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="list-circle-outline" size={22} color={colors.cobalt} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.heading}>Library</Text>

      {/* Paste URL bar */}
      <View style={styles.pasteBar}>
        <Ionicons name="link" size={16} color={colors.ash} />
        <TextInput
          style={styles.pasteInput}
          placeholder="Paste a YouTube, SoundCloud, or Spotify link..."
          placeholderTextColor={colors.ash}
          value={pasteUrl}
          onChangeText={setPasteUrl}
          onSubmitEditing={handlePaste}
          autoCapitalize="none"
          returnKeyType="go"
        />
        {pasteUrl.length > 0 && (
          <TouchableOpacity onPress={handlePaste}>
            <Ionicons name="add-circle" size={22} color={colors.pink} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.pink} /></View>
      ) : tracks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="musical-notes" size={48} color={colors.ash} />
          <Text style={styles.emptyTitle}>No tracks yet</Text>
          <Text style={styles.muted}>Paste a link above or search to add tracks.</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.pink} />
          }
        />
      )}
      <AddToPlaylistModal
        visible={!!playlistModalTrack}
        track={playlistModalTrack ? {
          title: playlistModalTrack.title,
          artist: playlistModalTrack.artist || '',
          source_platform: playlistModalTrack.source_platform,
          source_url: playlistModalTrack.source_url,
          source_id: playlistModalTrack.source_id || '',
          thumbnail_url: playlistModalTrack.thumbnail_url || '',
          duration_seconds: playlistModalTrack.duration_seconds,
        } : null}
        onClose={() => setPlaylistModalTrack(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  heading: {
    color: colors.pearl, fontSize: 24, fontWeight: '900', letterSpacing: -0.5,
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  pasteBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  pasteInput: { flex: 1, color: colors.pearl, fontSize: 13 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate,
  },
  thumbWrap: {
    width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.graphite,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  thumb: { width: 44, height: 44 },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.pearl, fontSize: 14, fontWeight: '600' },
  artist: { color: colors.silver, fontSize: 12, marginTop: 1 },
  dur: { color: colors.ash, fontSize: 11, fontVariant: ['tabular-nums'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.pearl, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.silver, fontSize: 13 },
});
