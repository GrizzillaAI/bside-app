import { useState, useEffect } from 'react';
import { Play, Pause, Clock, Music, Link as LinkIcon, Loader2, Trash2, Plus } from 'lucide-react';
import { usePlayer, formatTime } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import { extractAudio, saveTrackToLibrary } from '../lib/api';
import { supabase } from '../lib/supabase';

/** Detect platform from URL */
function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
  if (url.includes('rss') || url.includes('feed') || url.includes('.xml')) return 'podcast';
  return null;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YT',
  tiktok: 'TT',
  instagram: 'IG',
  twitter: 'X',
  podcast: 'POD',
  upload: 'UP',
};

interface LibraryItem {
  id: string;
  track_id: string;
  added_at: string;
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

export default function Library() {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LibraryItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);

  // Load library tracks
  useEffect(() => {
    loadTracks();
  }, []);

  async function loadTracks() {
    setLoadingTracks(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingTracks(false); return; }

    const { data, error } = await supabase
      .from('library_tracks')
      .select('id, track_id, added_at, track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (!error && data) setTracks(data as unknown as LibraryItem[]);
    setLoadingTracks(false);
  }

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setDetectedPlatform(detectPlatform(value));
    setExtractError(null);
  };

  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    setExtractError(null);

    try {
      // Extract audio
      const result = await extractAudio(url);

      // Save to DB
      await saveTrackToLibrary({
        title: result.title || 'Untitled Track',
        artist: result.artist || 'Unknown Artist',
        source_platform: result.source_platform,
        source_url: result.source_url,
        source_id: result.source_id,
        thumbnail_url: result.thumbnail_url,
        duration_seconds: result.duration_seconds,
      });

      // Play it
      const playerTrack: PlayerTrack = {
        title: result.title || 'Untitled Track',
        artist: result.artist || 'Unknown Artist',
        thumbnail_url: result.thumbnail_url,
        audio_url: result.audio_url,
        duration_seconds: result.duration_seconds,
        source_platform: result.source_platform,
        source_id: result.source_id,
        source_url: result.source_url,
      };
      play(playerTrack);

      // Refresh library list
      await loadTracks();
      setUrl('');
      setDetectedPlatform(null);
    } catch (e) {
      setExtractError((e as Error).message);
    }
    setLoading(false);
  };

  const handlePlayTrack = async (item: LibraryItem) => {
    const t = item.track;
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) {
      togglePlayPause();
      return;
    }

    // Need to extract audio URL
    try {
      const result = await extractAudio(t.source_url);
      play({
        id: t.id,
        title: t.title,
        artist: t.artist || 'Unknown Artist',
        thumbnail_url: t.thumbnail_url || '',
        audio_url: result.audio_url,
        duration_seconds: t.duration_seconds || 0,
        source_platform: t.source_platform,
        source_id: t.source_id || '',
        source_url: t.source_url,
      });
    } catch (e) {
      console.error('Playback failed:', e);
    }
  };

  const handleRemove = async (libraryTrackId: string) => {
    await supabase.from('library_tracks').delete().eq('id', libraryTrackId);
    setTracks((t) => t.filter((item) => item.id !== libraryTrackId));
  };

  const formatAdded = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-4xl">
      {/* Link paste */}
      <div className="bg-[#0E0E14] border border-[#1E1E2A] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-[#FF4F2B]" />
          Paste a Link
        </h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full bg-[#08080C] border border-[#1E1E2A] focus:border-[#FF4F2B] rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-[#5A5A72]"
            />
            {detectedPlatform && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#FF4F2B] bg-[#FF4F2B]/10 px-2 py-1 rounded capitalize">
                {detectedPlatform} detected
              </span>
            )}
          </div>
          <button
            onClick={handleExtract}
            disabled={!url || loading}
            className="bg-[#FF4F2B] hover:bg-[#E63D1A] disabled:opacity-40 px-6 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music className="w-4 h-4" />}
            {loading ? 'Extracting...' : 'Extract Audio'}
          </button>
        </div>
        {extractError && (
          <p className="text-xs text-red-400 mt-2">{extractError}</p>
        )}
      </div>

      {/* Library */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Your Library</h2>
        <span className="text-sm text-[#5A5A72]">{tracks.length} tracks</span>
      </div>

      {loadingTracks ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF4F2B] animate-spin mx-auto mb-4" />
          <p className="text-[#5A5A72]">Loading your library...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#1E1E2A] mx-auto mb-4" />
          <p className="text-[#5A5A72]">Your library is empty. Paste a link above or search to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((item) => {
            const t = item.track;
            const isThis = currentTrack?.source_id === t.source_id;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-[#0E0E14] hover:bg-[#16161F] border border-[#1E1E2A] rounded-lg px-4 py-3 transition group"
              >
                <button
                  onClick={() => handlePlayTrack(item)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
                    isThis ? 'bg-[#FF4F2B]' : 'bg-[#1E1E2A] group-hover:bg-[#FF4F2B]'
                  }`}
                >
                  {isThis && isPlaying
                    ? <Pause className="w-4 h-4" />
                    : <Play className="w-4 h-4 ml-0.5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isThis ? 'text-[#FF4F2B]' : ''}`}>{t.title}</p>
                  <p className="text-xs text-[#5A5A72] truncate">{t.artist || 'Unknown Artist'}</p>
                </div>
                <span className="text-xs font-medium text-[#FF4F2B] bg-[#FF4F2B]/10 px-2 py-1 rounded shrink-0 uppercase">
                  {PLATFORM_LABELS[t.source_platform] || t.source_platform}
                </span>
                {t.duration_seconds && (
                  <span className="text-xs text-[#5A5A72] flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {formatTime(t.duration_seconds)}
                  </span>
                )}
                <span className="text-xs text-[#5A5A72] shrink-0 w-24 text-right">{formatAdded(item.added_at)}</span>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-[#5A5A72] hover:text-red-400 transition opacity-0 group-hover:opacity-100"
                  title="Remove from library"
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
