import { useState, useEffect } from 'react';
import { Plus, Play, Pause, Music, X, ListMusic, Trash2, Clock, ChevronLeft, Loader2 } from 'lucide-react';
import { usePlayer, formatTime } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import {
  getMyPlaylists, createPlaylist, deletePlaylist,
  getPlaylistTracks, removeTrackFromPlaylist,
} from '../lib/api';
import type { Playlist, PlaylistTrackItem } from '../lib/api';

// Mixd gradient set
const GRADIENTS = [
  'from-[#FF2D87] to-[#E01570]',
  'from-[#1F3DFF] to-[#0920A0]',
  'from-[#DAFF00] to-[#8FA800]',
  'from-[#FF4D9E] to-[#7D0640]',
];

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  applemusic: 'Apple Music',
  tiktok: 'TikTok',
};

export default function Playlists() {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Detail view state
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<PlaylistTrackItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  async function loadPlaylists() {
    setLoading(true);
    try {
      const data = await getMyPlaylists();
      setPlaylists(data);
    } catch (e) {
      console.error('Failed to load playlists:', e);
    }
    setLoading(false);
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const pl = await createPlaylist(newName.trim(), newDesc.trim() || undefined);
      setPlaylists([pl, ...playlists]);
      setNewName('');
      setNewDesc('');
      setShowModal(false);
    } catch (e) {
      console.error('Failed to create playlist:', e);
    }
    setCreating(false);
  };

  const handleDelete = async (playlistId: string) => {
    try {
      await deletePlaylist(playlistId);
      setPlaylists((p) => p.filter((pl) => pl.id !== playlistId));
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
        setPlaylistTracks([]);
      }
    } catch (e) {
      console.error('Failed to delete playlist:', e);
    }
  };

  const handleOpenPlaylist = async (pl: Playlist) => {
    setSelectedPlaylist(pl);
    setLoadingTracks(true);
    try {
      const tracks = await getPlaylistTracks(pl.id);
      setPlaylistTracks(tracks);
    } catch (e) {
      console.error('Failed to load playlist tracks:', e);
    }
    setLoadingTracks(false);
  };

  const handleRemoveTrack = async (ptItem: PlaylistTrackItem) => {
    if (!selectedPlaylist) return;
    try {
      await removeTrackFromPlaylist(ptItem.id, selectedPlaylist.id);
      setPlaylistTracks((t) => t.filter((item) => item.id !== ptItem.id));
      // Update local count
      setPlaylists((pls) =>
        pls.map((p) => p.id === selectedPlaylist.id ? { ...p, track_count: Math.max(0, p.track_count - 1) } : p),
      );
      setSelectedPlaylist((p) => p ? { ...p, track_count: Math.max(0, p.track_count - 1) } : p);
    } catch (e) {
      console.error('Failed to remove track:', e);
    }
  };

  const handlePlayTrack = (t: PlaylistTrackItem['track']) => {
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) {
      togglePlayPause();
      return;
    }

    let audioUrl = '';
    if (t.source_platform === 'spotify' && t.source_id) {
      audioUrl = `spotify:track:${t.source_id}`;
    }

    play({
      id: t.id,
      title: t.title,
      artist: t.artist || 'Unknown Artist',
      thumbnail_url: t.thumbnail_url || '',
      audio_url: audioUrl,
      duration_seconds: t.duration_seconds || 0,
      source_platform: t.source_platform,
      source_id: t.source_id || '',
      source_url: t.source_url,
    });
  };

  // ── Detail view ──────────────────────────────────────────────────────
  if (selectedPlaylist) {
    return (
      <div className="max-w-4xl">
        <button
          onClick={() => { setSelectedPlaylist(null); setPlaylistTracks([]); }}
          className="flex items-center gap-1 text-sm text-[#5E5E7A] hover:text-white transition mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Playlists
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className={`w-20 h-20 rounded-xl bg-gradient-to-br ${GRADIENTS[playlists.findIndex((p) => p.id === selectedPlaylist.id) % GRADIENTS.length]} flex items-center justify-center`}>
            <Music className="w-8 h-8 text-white/40" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{selectedPlaylist.name}</h1>
            {selectedPlaylist.description && (
              <p className="text-sm text-[#5E5E7A] mt-1">{selectedPlaylist.description}</p>
            )}
            <p className="text-xs text-[#5E5E7A] mt-1">{selectedPlaylist.track_count} tracks</p>
          </div>
        </div>

        {loadingTracks ? (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
            <p className="text-[#5E5E7A]">Loading tracks...</p>
          </div>
        ) : playlistTracks.length === 0 ? (
          <div className="text-center py-16">
            <Music className="w-12 h-12 text-[#1A1A28] mx-auto mb-4" />
            <p className="text-[#5E5E7A]">This playlist is empty. Use the + button on any track to add it here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlistTracks.map((ptItem, idx) => {
              const t = ptItem.track;
              const isThis = currentTrack?.source_id === t.source_id;
              return (
                <div
                  key={ptItem.id}
                  className="flex items-center gap-4 bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] rounded-lg px-4 py-3 transition group"
                >
                  <span className="text-xs text-[#5E5E7A] w-6 text-right shrink-0">{idx + 1}</span>
                  <button
                    onClick={() => handlePlayTrack(t)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
                      isThis ? 'bg-[#FF2D87]' : 'bg-[#1A1A28] group-hover:bg-[#FF2D87]'
                    }`}
                  >
                    {isThis && isPlaying
                      ? <Pause className="w-4 h-4" />
                      : <Play className="w-4 h-4 ml-0.5" />
                    }
                  </button>
                  {t.thumbnail_url && (
                    <img src={t.thumbnail_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isThis ? 'text-[#FF2D87]' : ''}`}>{t.title}</p>
                    <p className="text-xs text-[#5E5E7A] truncate">{t.artist || 'Unknown Artist'}</p>
                  </div>
                  <span className="text-xs font-medium text-[#FF2D87] bg-[#FF2D87]/10 px-2 py-1 rounded shrink-0">
                    {PLATFORM_LABELS[t.source_platform] || t.source_platform}
                  </span>
                  {t.duration_seconds && (
                    <span className="text-xs text-[#5E5E7A] flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" /> {formatTime(t.duration_seconds)}
                    </span>
                  )}
                  <button
                    onClick={() => handleRemoveTrack(ptItem)}
                    className="text-[#5E5E7A] hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                    title="Remove from playlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Grid view ──────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Your Playlists</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#FF2D87] hover:bg-[#E01570] px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
          <p className="text-[#5E5E7A]">Loading playlists...</p>
        </div>
      ) : playlists.length === 0 ? (
        <div className="text-center py-20">
          <ListMusic className="w-12 h-12 text-[#1A1A28] mx-auto mb-4" />
          <p className="text-[#5E5E7A] mb-4">No playlists yet. Create one to organize your audio.</p>
          <button onClick={() => setShowModal(true)} className="bg-[#FF2D87] hover:bg-[#E01570] px-5 py-2.5 rounded-lg text-sm font-semibold transition">
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map((pl, i) => (
            <div
              key={pl.id}
              className="bg-[#0B0B12] border border-[#1A1A28] hover:border-[#FF2D87]/30 rounded-xl overflow-hidden transition cursor-pointer group relative"
              onClick={() => handleOpenPlaylist(pl)}
            >
              <div className={`h-32 bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} flex items-center justify-center relative`}>
                <Music className="w-10 h-10 text-white/40" />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(pl.id); }}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-red-500/80 text-white/70 hover:text-white w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                  title="Delete playlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-sm mb-1">{pl.name}</h3>
                <p className="text-xs text-[#5E5E7A]">{pl.track_count} tracks</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#1A1A28]">
              <h2 className="text-lg font-bold">Create Playlist</h2>
              <button onClick={() => setShowModal(false)} className="text-[#5E5E7A] hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name</label>
                <input
                  value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="My Playlist"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full bg-[#050509] border border-[#1A1A28] focus:border-[#FF2D87] rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder:text-[#5E5E7A]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What's this playlist about?"
                  rows={3}
                  className="w-full bg-[#050509] border border-[#1A1A28] focus:border-[#FF2D87] rounded-lg px-4 py-2.5 text-sm outline-none transition resize-none placeholder:text-[#5E5E7A]"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#1A1A28]">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-[#1A1A28] hover:bg-[#333] rounded-lg text-sm font-medium transition">Cancel</button>
              <button onClick={handleCreate} disabled={!newName.trim() || creating} className="flex-1 py-2.5 bg-[#FF2D87] hover:bg-[#E01570] disabled:opacity-40 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2">
                {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
