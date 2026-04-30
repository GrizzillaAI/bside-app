// Playlist detail — shows tracks inside a playlist with play/remove actions
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { usePlayer, formatTime } from '../lib/player';
import { getPlaylistTracks } from '../lib/api';
import { supabase } from '../lib/supabase';
import { colors, radii, spacing } from '../lib/theme';
import type { MainStackParamList } from '../navigation/MainNavigator';

type RouteParams = RouteProp<MainStackParamList, 'PlaylistDetail'>;

interface PlaylistTrack {
  id: string;
  track_id: string;
  position: number;
  track: {
    id: string;
    title: string;
    artist: string | null;
    source_platform: string;
    source_url: string;
    source_id: string | null;
    thumbnail_url: string | null;
    duration_seconds: number | null;
  };
}

export default function PlaylistDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { playlistId, playlistName } = route.params;
  const { play, currentTrack, isPlaying, togglePlayPause, replaceQueue } = usePlayer();

  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTracks = useCallback(async () => {
    try {
      const data = await getPlaylistTracks(playlistId);
      setTracks(data.filter((d: any) => d.track) as PlaylistTrack[]);
    } catch {}
    setLoading(false);
  }, [playlistId]);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  const handlePlay = (item: PlaylistTrack, index: number) => {
    const t = item.track;
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) { togglePlayPause(); return; }

    play({
      id: t.id, title: t.title, artist: t.artist || 'Unknown artist',
      thumbnail_url: t.thumbnail_url || '', audio_url: '',
      duration_seconds: t.duration_seconds || 0,
      source_platform: t.source_platform, source_id: t.source_id || '',
      source_url: t.source_url,
    });

    // Queue the rest
    const remaining = tracks.slice(index + 1).map((r) => ({
      id: r.track.id, title: r.track.title, artist: r.track.artist || 'Unknown artist',
      thumbnail_url: r.track.thumbnail_url || '', audio_url: '',
      duration_seconds: r.track.duration_seconds || 0,
      source_platform: r.track.source_platform, source_id: r.track.source_id || '',
      source_url: r.track.source_url,
    }));
    replaceQueue(remaining);
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    handlePlay(tracks[0], 0);
  };

  const handleRemove = (item: PlaylistTrack) => {
    Alert.alert('Remove Track', `Remove "${item.track.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await supabase.from('playlist_tracks').delete().eq('id', item.id);
            // Update track count
            await supabase.from('playlists').update({
              track_count: Math.max(0, tracks.length - 1),
              updated_at: new Date().toISOString(),
            }).eq('id', playlistId);
            loadTracks();
          } catch {}
        },
      },
    ]);
  };

  const totalDuration = tracks.reduce((sum, t) => sum + (t.track.duration_seconds || 0), 0);

  const renderItem = ({ item, index }: { item: PlaylistTrack; index: number }) => {
    const t = item.track;
    const isThis = currentTrack?.source_id === t.source_id;
    return (
      <TouchableOpacity style={styles.row} onPress={() => handlePlay(item, index)} activeOpacity={0.7}>
        <Text style={[styles.rowNum, isThis && { color: colors.pink }]}>{index + 1}</Text>
        <View style={styles.thumbWrap}>
          {t.thumbnail_url ? (
            <Image source={{ uri: t.thumbnail_url }} style={styles.thumb} />
          ) : (
            <Ionicons name="musical-note" size={18} color={colors.silver} />
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, isThis && { color: colors.pink }]} numberOfLines={1}>{t.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{t.artist || 'Unknown artist'}</Text>
        </View>
        {t.duration_seconds ? (
          <Text style={styles.dur}>{formatTime(t.duration_seconds)}</Text>
        ) : null}
        <TouchableOpacity
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.removeBtn}
        >
          <Ionicons name="close-circle-outline" size={20} color={colors.ash} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={colors.pearl} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.heading} numberOfLines={1}>{playlistName}</Text>
          <Text style={styles.meta}>
            {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            {totalDuration > 0 ? ` · ${formatTime(totalDuration)}` : ''}
          </Text>
        </View>
      </View>

      {/* Play All button */}
      {tracks.length > 0 && (
        <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
          <Ionicons name="play" size={18} color={colors.ink} />
          <Text style={styles.playAllText}>Play All</Text>
        </TouchableOpacity>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.pink} />
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="musical-notes" size={48} color={colors.ash} />
          <Text style={styles.emptyTitle}>This playlist is empty</Text>
          <Text style={styles.emptyDesc}>Search for tracks and add them to this playlist.</Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerInfo: { flex: 1 },
  heading: {
    color: colors.pearl, fontSize: 22, fontWeight: '900', letterSpacing: -0.5,
  },
  meta: {
    color: colors.silver, fontSize: 12, marginTop: 2,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.pink,
    borderRadius: radii.lg,
    paddingVertical: 12,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  playAllText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate,
  },
  rowNum: {
    color: colors.ash,
    fontSize: 12,
    width: 22,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  thumbWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: colors.graphite,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: { width: 40, height: 40 },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.pearl, fontSize: 13, fontWeight: '600' },
  artist: { color: colors.silver, fontSize: 11, marginTop: 1 },
  dur: { color: colors.ash, fontSize: 11, fontVariant: ['tabular-nums'] },
  removeBtn: { padding: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.pearl, fontSize: 16, fontWeight: '600' },
  emptyDesc: { color: colors.silver, fontSize: 13 },
});
