import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../lib/player';
import { searchAll, saveTrackToLibrary, logB3Event, type UnifiedResult } from '../lib/api';
import { colors, radii, spacing } from '../lib/theme';

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000', spotify: '#1DB954', soundcloud: '#FF5500',
  podcast: '#9B59B6', bandcamp: '#1DA0C3',
};

export default function SearchScreen({ route }: { route?: any }) {
  const [query, setQuery] = useState(route?.params?.initialQuery || '');
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { play, replaceQueue } = usePlayer();

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { results: r } = await searchAll(query.trim());
      setResults(r);
      logB3Event('search.performed', { query: query.trim(), result_count: r.length });
    } catch (err) {
      Alert.alert('Search failed', (err as Error).message);
    }
    setSearching(false);
  }, [query]);

  const handlePlay = (item: UnifiedResult, index: number) => {
    play({
      id: `${item.source_platform}-${item.source_id}`,
      title: item.title, artist: item.artist,
      thumbnail_url: item.thumbnail_url, audio_url: item.preview_url || item.stream_url || '',
      duration_seconds: item.duration_seconds, source_platform: item.source_platform,
      source_id: item.source_id, source_url: item.external_url,
    });
    // Queue remaining results
    const remaining = results.slice(index + 1).map((r) => ({
      id: `${r.source_platform}-${r.source_id}`,
      title: r.title, artist: r.artist,
      thumbnail_url: r.thumbnail_url, audio_url: r.preview_url || r.stream_url || '',
      duration_seconds: r.duration_seconds, source_platform: r.source_platform,
      source_id: r.source_id, source_url: r.external_url,
    }));
    replaceQueue(remaining);
  };

  const handleSave = async (item: UnifiedResult) => {
    try {
      await saveTrackToLibrary({
        title: item.title, artist: item.artist, source_platform: item.source_platform,
        source_url: item.external_url, source_id: item.source_id,
        thumbnail_url: item.thumbnail_url, duration_seconds: item.duration_seconds,
      });
      Alert.alert('Saved', `"${item.title}" added to your library.`);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const renderItem = ({ item, index }: { item: UnifiedResult; index: number }) => (
    <TouchableOpacity style={styles.row} onPress={() => handlePlay(item, index)} activeOpacity={0.7}>
      <View style={styles.thumbWrap}>
        {item.thumbnail_url ? (
          <Image source={{ uri: item.thumbnail_url }} style={styles.thumb} />
        ) : (
          <Ionicons name="musical-note" size={20} color={colors.silver} />
        )}
        <View style={[styles.platformDot, { backgroundColor: PLATFORM_COLORS[item.source_platform] || colors.ash }]} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{item.artist}</Text>
        <Text style={styles.meta}>
          {item.source_platform.charAt(0).toUpperCase() + item.source_platform.slice(1)}
          {item.duration_display ? ` · ${item.duration_display}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={() => handleSave(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="add-circle-outline" size={24} color={colors.pink} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.ash} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search all platforms..."
          placeholderTextColor={colors.ash}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); setResults([]); }}>
            <Ionicons name="close-circle" size={18} color={colors.ash} />
          </TouchableOpacity>
        )}
      </View>

      {searching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.pink} />
          <Text style={styles.muted}>Searching YouTube, Spotify, SoundCloud...</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search" size={48} color={colors.ash} />
          <Text style={styles.emptyTitle}>Search across every platform</Text>
          <Text style={styles.muted}>YouTube, Spotify, SoundCloud, and more</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => `${item.source_platform}-${item.source_id}`}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.lg, marginHorizontal: spacing.lg, marginVertical: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
  },
  searchInput: { flex: 1, color: colors.pearl, fontSize: 15 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate,
  },
  thumbWrap: {
    width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.graphite,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  thumb: { width: 48, height: 48 },
  platformDot: {
    position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: 4,
    borderWidth: 1, borderColor: colors.ink,
  },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.pearl, fontSize: 14, fontWeight: '600' },
  artist: { color: colors.silver, fontSize: 12, marginTop: 1 },
  meta: { color: colors.ash, fontSize: 10, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.pearl, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.silver, fontSize: 13, marginTop: 4 },
});
