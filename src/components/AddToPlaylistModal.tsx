// AddToPlaylistModal — pick an existing playlist or create a new one to add a track to.
// Used from both Search results and Library tracks.

import { useState, useEffect } from 'react';
import { X, Plus, ListMusic, Check, Loader2 } from 'lucide-react';
import { getMyPlaylists, createPlaylist, addTrackToPlaylist } from '../lib/api';
import type { Playlist } from '../lib/api';

export interface TrackForPlaylist {
  title: string;
  artist: string;
  source_platform: string;
  source_url: string;
  source_id: string;
  thumbnail_url: string;
  duration_seconds: number | null;
}

interface Props {
  track: TrackForPlaylist;
  onClose: () => void;
}

export default function AddToPlaylistModal({ track, onClose }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null); // playlist id being added to
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPlaylists()
      .then(setPlaylists)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (playlist: Playlist) => {
    setAdding(playlist.id);
    setError(null);
    try {
      await addTrackToPlaylist(playlist.id, track);
      setAdded((s) => new Set(s).add(playlist.id));
    } catch (e) {
      setError((e as Error).message);
    }
    setAdding(null);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const pl = await createPlaylist(newName.trim());
      setPlaylists((prev) => [pl, ...prev]);
      setNewName('');
      setShowCreate(false);
      // Automatically add the track to the new playlist
      await addTrackToPlaylist(pl.id, track);
      setAdded((s) => new Set(s).add(pl.id));
    } catch (e) {
      setError((e as Error).message);
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1A1A28]">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Add to Playlist</h2>
            <p className="text-xs text-[#5E5E7A] truncate mt-0.5">{track.title} — {track.artist}</p>
          </div>
          <button onClick={onClose} className="text-[#5E5E7A] hover:text-white transition shrink-0 ml-3">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new playlist inline */}
        <div className="p-4 border-b border-[#1A1A28]">
          {showCreate ? (
            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Playlist name..."
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                className="flex-1 bg-[#050509] border border-[#1A1A28] focus:border-[#FF2D87] rounded-lg px-3 py-2 text-sm outline-none transition placeholder:text-[#5E5E7A]"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="bg-[#FF2D87] hover:bg-[#E01570] disabled:opacity-40 px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-1"
              >
                {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="text-[#5E5E7A] hover:text-white px-2 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#FF2D87] hover:bg-[#FF2D87]/10 transition"
            >
              <Plus className="w-4 h-4" />
              New Playlist
            </button>
          )}
        </div>

        {/* Playlist list */}
        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-[#FF2D87] animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <div className="text-center py-8">
              <ListMusic className="w-8 h-8 text-[#1A1A28] mx-auto mb-2" />
              <p className="text-xs text-[#5E5E7A]">No playlists yet. Create one above!</p>
            </div>
          ) : (
            playlists.map((pl) => {
              const isAdded = added.has(pl.id);
              const isAdding = adding === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => !isAdded && handleAdd(pl)}
                  disabled={isAdding || isAdded}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition ${
                    isAdded
                      ? 'bg-green-500/10 text-green-300'
                      : 'hover:bg-[#1A1A28] text-[#E0E0F0]'
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-gradient-to-br from-[#FF2D87] to-[#E01570] flex items-center justify-center shrink-0">
                    {isAdded ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : isAdding ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <ListMusic className="w-4 h-4 text-white/70" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pl.name}</p>
                    <p className="text-xs text-[#5E5E7A]">{pl.track_count} tracks</p>
                  </div>
                  {isAdded && <span className="text-xs text-green-400 shrink-0">Added</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 pb-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t border-[#1A1A28]">
          <button onClick={onClose} className="w-full py-2.5 bg-[#1A1A28] hover:bg-[#333] rounded-lg text-sm font-medium transition">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
