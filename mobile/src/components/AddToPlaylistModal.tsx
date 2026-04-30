// Reusable modal to add a track to a playlist
// Shows list of playlists + option to create a new one
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  FlatList, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMyPlaylists, createPlaylist, addTrackToPlaylist, type Playlist } from '../lib/api';
import { colors, radii, spacing } from '../lib/theme';

interface TrackData {
  title: string;
  artist: string;
  source_platform: string;
  source_url: string;
  source_id: string;
  thumbnail_url: string;
  duration_seconds: number | null;
}

interface AddToPlaylistModalProps {
  visible: boolean;
  track: TrackData | null;
  onClose: () => void;
}

export default function AddToPlaylistModal({ visible, track, onClose }: AddToPlaylistModalProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const loadPlaylists = useCallback(async () => {
    try {
      const data = await getMyPlaylists();
      setPlaylists(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadPlaylists();
    }
  }, [visible, loadPlaylists]);

  const handleAdd = async (playlist: Playlist) => {
    if (!track) return;
    setAdding(playlist.id);
    try {
      await addTrackToPlaylist(playlist.id, track);
      Alert.alert('Added', `"${track.title}" added to "${playlist.name}".`);
      onClose();
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
    setAdding(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const newPlaylist = await createPlaylist(newName.trim());
      setNewName('');
      setShowCreate(false);
      if (track) {
        await addTrackToPlaylist(newPlaylist.id, track);
        Alert.alert('Done', `Created "${newPlaylist.name}" and added the track.`);
        onClose();
      } else {
        loadPlaylists();
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Add to Playlist</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.silver} />
            </TouchableOpacity>
          </View>

          {track && (
            <Text style={styles.trackName} numberOfLines={1}>{track.title}</Text>
          )}

          {/* New playlist inline form */}
          {showCreate ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.createInput}
                placeholder="Playlist name"
                placeholderTextColor={colors.ash}
                value={newName}
                onChangeText={setNewName}
                autoFocus
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity onPress={handleCreate} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Create</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowCreate(false); setNewName(''); }}>
                <Ionicons name="close-circle" size={22} color={colors.ash} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.newPlaylistRow} onPress={() => setShowCreate(true)}>
              <View style={styles.newPlaylistIcon}>
                <Ionicons name="add" size={20} color={colors.pink} />
              </View>
              <Text style={styles.newPlaylistText}>New Playlist</Text>
            </TouchableOpacity>
          )}

          {/* Playlist list */}
          {loading ? (
            <ActivityIndicator color={colors.pink} style={{ marginVertical: spacing.xxl }} />
          ) : playlists.length === 0 ? (
            <Text style={styles.empty}>No playlists yet. Create one above.</Text>
          ) : (
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.playlistRow}
                  onPress={() => handleAdd(item)}
                  disabled={adding === item.id}
                >
                  <View style={styles.playlistIcon}>
                    <Ionicons name="list" size={16} color={colors.silver} />
                  </View>
                  <View style={styles.playlistInfo}>
                    <Text style={styles.playlistName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.playlistMeta}>
                      {item.track_count} track{item.track_count !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  {adding === item.id ? (
                    <ActivityIndicator color={colors.pink} size="small" />
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={colors.pink} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.void,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.slate,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    color: colors.pearl,
    fontSize: 18,
    fontWeight: '700',
  },
  trackName: {
    color: colors.silver,
    fontSize: 13,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  newPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate,
  },
  newPlaylistIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,45,135,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newPlaylistText: {
    color: colors.pink,
    fontSize: 14,
    fontWeight: '600',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate,
  },
  createInput: {
    flex: 1,
    backgroundColor: colors.graphite,
    borderWidth: 1,
    borderColor: colors.slate,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.pearl,
    fontSize: 14,
  },
  createBtn: {
    backgroundColor: colors.pink,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnText: {
    color: colors.pearl,
    fontSize: 13,
    fontWeight: '700',
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.slate,
  },
  playlistIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.graphite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: colors.pearl,
    fontSize: 14,
    fontWeight: '500',
  },
  playlistMeta: {
    color: colors.silver,
    fontSize: 11,
    marginTop: 1,
  },
  empty: {
    color: colors.silver,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
  },
});
