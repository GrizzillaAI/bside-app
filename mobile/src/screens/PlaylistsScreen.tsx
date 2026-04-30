import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getMyPlaylists, createPlaylist, deletePlaylist, getPlaylistTracks, type Playlist } from '../lib/api';
import { usePlayer } from '../lib/player';
import { colors, radii, spacing } from '../lib/theme';

export default function PlaylistsScreen() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const { play, replaceQueue } = usePlayer();

  const load = useCallback(async () => {
    try {
      const data = await getMyPlaylists();
      setPlaylists(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createPlaylist(newName.trim());
      setNewName('');
      setShowCreate(false);
      load();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const handleDelete = (p: Playlist) => {
    Alert.alert('Delete Playlist', `Delete "${p.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deletePlaylist(p.id); load(); } catch {}
      }},
    ]);
  };

  const handlePlayPlaylist = async (p: Playlist) => {
    try {
      const tracks = await getPlaylistTracks(p.id);
      if (tracks.length === 0) { Alert.alert('Empty', 'This playlist has no tracks.'); return; }
      const mapped = tracks.map((t: any) => ({
        id: t.track.id, title: t.track.title, artist: t.track.artist || 'Unknown',
        thumbnail_url: t.track.thumbnail_url || '', audio_url: '',
        duration_seconds: t.track.duration_seconds || 0,
        source_platform: t.track.source_platform, source_id: t.track.source_id || '',
        source_url: t.track.source_url,
      }));
      play(mapped[0]);
      replaceQueue(mapped.slice(1));
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  const renderItem = ({ item }: { item: Playlist }) => (
    <TouchableOpacity style={styles.row} onPress={() => handlePlayPlaylist(item)} activeOpacity={0.7}>
      <View style={styles.coverWrap}>
        <Ionicons name="list" size={20} color={colors.silver} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>{item.track_count} track{item.track_count !== 1 ? 's' : ''}</Text>
      </View>
      <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="trash-outline" size={18} color={colors.ash} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Playlists</Text>
        <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn}>
          <Ionicons name="add" size={22} color={colors.pink} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={colors.pink} /></View>
      ) : playlists.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="list" size={48} color={colors.ash} />
          <Text style={styles.emptyTitle}>No playlists yet</Text>
          <Text style={styles.muted}>Tap + to create your first playlist.</Text>
        </View>
      ) : (
        <FlatList
          data={playlists}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Create playlist modal */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={colors.ash}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.modalCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={styles.modalCreate}>
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.ink },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md,
  },
  heading: { color: colors.pearl, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.graphite,
    justifyContent: 'center', alignItems: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.slate,
  },
  coverWrap: {
    width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.graphite,
    justifyContent: 'center', alignItems: 'center',
  },
  info: { flex: 1 },
  name: { color: colors.pearl, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.silver, fontSize: 12, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  emptyTitle: { color: colors.pearl, fontSize: 16, fontWeight: '600' },
  muted: { color: colors.silver, fontSize: 13 },
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalBox: {
    width: '85%', backgroundColor: colors.void, borderRadius: radii.xl,
    padding: spacing.xxl, borderWidth: 1, borderColor: colors.slate,
  },
  modalTitle: { color: colors.pearl, fontSize: 18, fontWeight: '700', marginBottom: spacing.lg },
  modalInput: {
    backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.slate,
    borderRadius: radii.lg, paddingHorizontal: spacing.lg, paddingVertical: 14,
    color: colors.pearl, fontSize: 15, marginBottom: spacing.lg,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: spacing.lg },
  cancelText: { color: colors.silver, fontSize: 14, fontWeight: '500' },
  modalCreate: {
    backgroundColor: colors.pink, borderRadius: radii.lg,
    paddingVertical: 10, paddingHorizontal: spacing.xxl,
  },
  createText: { color: colors.pearl, fontSize: 14, fontWeight: '700' },
});
