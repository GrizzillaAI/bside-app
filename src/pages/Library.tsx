import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Clock, Music, Link as LinkIcon, Loader2, Trash2, Plus, ListMusic, ArrowUpDown, Filter, Download } from 'lucide-react';
import { usePlayer, formatTime } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import { saveTrackToLibrary, resolveTikTokUrl, resolveBandcampUrl } from '../lib/api';
import { supabase } from '../lib/supabase';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import type { TrackForPlaylist } from '../components/AddToPlaylistModal';

/** Detect platform from URL */
function detectPlatform(url: string): string | null {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('bandcamp.com')) return 'bandcamp';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
  if (url.includes('rss') || url.includes('feed') || url.includes('.xml')) return 'podcast';
  return null;
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  applemusic: 'Apple Music',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'X',
  podcast: 'Podcast',
  bandcamp: 'Bandcamp',
  upload: 'Upload',
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
  const { play, currentTrack, isPlaying, togglePlayPause, replaceQueue } = usePlayer();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  const [tracks, setTracks] = useState<LibraryItem[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [playlistTrack, setPlaylistTrack] = useState<TrackForPlaylist | null>(null);

  // Sort & filter
  type SortKey = 'recent' | 'title' | 'artist' | 'platform' | 'duration';
  type FilterPlatform = 'all' | string;
  const [sortBy, setSortBy] = useState<SortKey>('recent');
  const [filterPlatform, setFilterPlatform] = useState<FilterPlatform>('all');

  // Derive unique platforms from library
  const availablePlatforms = useMemo(() => {
    const set = new Set(tracks.map((t) => t.track.source_platform));
    return Array.from(set).sort();
  }, [tracks]);

  // Sorted + filtered tracks
  const displayTracks = useMemo(() => {
    let filtered = tracks;
    if (filterPlatform !== 'all') {
      filtered = filtered.filter((t) => t.track.source_platform === filterPlatform);
    }
    const sorted = [...filtered];
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => (a.track.title || '').localeCompare(b.track.title || ''));
        break;
      case 'artist':
        sorted.sort((a, b) => (a.track.artist || '').localeCompare(b.track.artist || ''));
        break;
      case 'platform':
        sorted.sort((a, b) => a.track.source_platform.localeCompare(b.track.source_platform));
        break;
      case 'duration':
        sorted.sort((a, b) => (b.track.duration_seconds || 0) - (a.track.duration_seconds || 0));
        break;
      case 'recent':
      default:
        sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
        break;
    }
    return sorted;
  }, [tracks, sortBy, filterPlatform]);

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

  /** Extract a YouTube video ID from a URL */
  function extractYouTubeId(urlStr: string): string | null {
    try {
      const u = new URL(urlStr);
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    } catch { /* not a valid URL */ }
    return null;
  }


  const handleExtract = async () => {
    if (!url) return;
    setLoading(true);
    setExtractError(null);

    try {
      const platform = detectPlatform(url);

      if (platform === 'youtube') {
        // YouTube: parse video ID from URL, play via iframe (no extraction needed)
        const videoId = extractYouTubeId(url);
        if (!videoId) {
          setExtractError('Could not parse a YouTube video ID from this URL');
          setLoading(false);
          return;
        }

        const thumbUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

        await saveTrackToLibrary({
          title: 'YouTube Video',  // We don't have metadata without an API call
          artist: 'Unknown',
          source_platform: 'youtube',
          source_url: url,
          source_id: videoId,
          thumbnail_url: thumbUrl,
          duration_seconds: null,
        });

        play({
          title: 'YouTube Video',
          artist: 'Unknown',
          thumbnail_url: thumbUrl,
          audio_url: '',
          duration_seconds: 0,
          source_platform: 'youtube',
          source_id: videoId,
          source_url: url,
        });

        await loadTracks();
        setUrl('');
        setDetectedPlatform(null);
      } else if (platform === 'tiktok') {
        // TikTok: resolve via oEmbed API (handles short links, /t/ links, and full URLs)
        const resolved = await resolveTikTokUrl(url);

        await saveTrackToLibrary({
          title: resolved.title || 'TikTok Video',
          artist: resolved.author || 'Unknown',
          source_platform: 'tiktok',
          source_url: url,
          source_id: resolved.video_id,
          thumbnail_url: resolved.thumbnail_url || '',
          duration_seconds: null,
        });

        play({
          title: resolved.title || 'TikTok Video',
          artist: resolved.author || 'Unknown',
          thumbnail_url: resolved.thumbnail_url || '',
          audio_url: '',
          duration_seconds: 0,
          source_platform: 'tiktok',
          source_id: resolved.video_id,
          source_url: url,
        });

        await loadTracks();
        setUrl('');
        setDetectedPlatform(null);
      } else if (platform === 'bandcamp') {
        // Bandcamp: resolve via oEmbed API to get title, artist, embed info
        const resolved = await resolveBandcampUrl(url);

        // source_id stores "track:12345" or "album:12345" for embed URL construction
        const sourceId = `${resolved.embed_type}:${resolved.embed_id}`;

        await saveTrackToLibrary({
          title: resolved.title || 'Bandcamp Track',
          artist: resolved.artist || 'Unknown Artist',
          source_platform: 'bandcamp',
          source_url: url,
          source_id: sourceId,
          thumbnail_url: resolved.thumbnail_url || '',
          duration_seconds: null,
        });

        play({
          title: resolved.title || 'Bandcamp Track',
          artist: resolved.artist || 'Unknown Artist',
          thumbnail_url: resolved.thumbnail_url || '',
          audio_url: '',
          duration_seconds: 0,
          source_platform: 'bandcamp',
          source_id: sourceId,
          source_url: url,
        });

        await loadTracks();
        setUrl('');
        setDetectedPlatform(null);
      } else {
        setExtractError('Paste a YouTube, TikTok, or Bandcamp URL to add it. For Spotify, SoundCloud, Apple Music, and Podcasts, use Search.');
      }
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

    // Build the correct audio_url per platform:
    // - Spotify: needs spotify:track:XXX URI for Web Playback SDK
    // - YouTube / SoundCloud / TikTok / Bandcamp: empty (iframe handles playback)
    // - Podcast / Apple Music: preview_url or stream_url (handled by HTML audio)
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

    // Populate the queue with remaining tracks so skip buttons work
    const idx = displayTracks.findIndex((dt) => dt.track.id === t.id);
    if (idx >= 0 && idx < displayTracks.length - 1) {
      const remaining = displayTracks.slice(idx + 1).map((dt) => {
        const tr = dt.track;
        let aUrl = '';
        if (tr.source_platform === 'spotify' && tr.source_id) {
          aUrl = `spotify:track:${tr.source_id}`;
        }
        return {
          id: tr.id,
          title: tr.title,
          artist: tr.artist || 'Unknown Artist',
          thumbnail_url: tr.thumbnail_url || '',
          audio_url: aUrl,
          duration_seconds: tr.duration_seconds || 0,
          source_platform: tr.source_platform,
          source_id: tr.source_id || '',
          source_url: tr.source_url,
        } as PlayerTrack;
      });
      replaceQueue(remaining);
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
      <div className="bg-[#0B0B12] border border-[#1A1A28] rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-[#FF2D87]" />
          Paste a Link
        </h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="url"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="YouTube, TikTok, or Bandcamp URL..."
              className="w-full bg-[#050509] border border-[#1A1A28] focus:border-[#FF2D87] rounded-lg px-4 py-3 text-sm outline-none transition placeholder:text-[#5E5E7A]"
            />
            {detectedPlatform && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#FF2D87] bg-[#FF2D87]/10 px-2 py-1 rounded capitalize">
                {detectedPlatform} detected
              </span>
            )}
          </div>
          <button
            onClick={handleExtract}
            disabled={!url || loading}
            className="bg-[#FF2D87] hover:bg-[#E01570] disabled:opacity-40 px-6 py-3 rounded-lg text-sm font-semibold transition flex items-center gap-2 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {loading ? 'Adding...' : 'Add to Library'}
          </button>
        </div>
        {extractError && (
          <p className="text-xs text-red-400 mt-2">{extractError}</p>
        )}
      </div>

      {/* Library header + sort/filter controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Your Library</h2>
          <span className="text-sm text-[#5E5E7A]">
            {filterPlatform !== 'all'
              ? `${displayTracks.length} of ${tracks.length} tracks`
              : `${tracks.length} tracks`
            }
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort dropdown */}
          <div className="flex items-center gap-1.5 bg-[#0B0B12] border border-[#1A1A28] rounded-lg px-3 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#5E5E7A]" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="bg-transparent text-xs text-[#EDEDF3] outline-none cursor-pointer"
            >
              <option value="recent">Recently Added</option>
              <option value="title">Title A-Z</option>
              <option value="artist">Artist A-Z</option>
              <option value="platform">Platform</option>
              <option value="duration">Duration</option>
            </select>
          </div>

          {/* Platform filter pills */}
          {availablePlatforms.length > 1 && (
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#5E5E7A]" />
              <button
                onClick={() => setFilterPlatform('all')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                  filterPlatform === 'all'
                    ? 'bg-[#FF2D87] text-white'
                    : 'bg-[#1A1A28] text-[#5E5E7A] hover:text-[#EDEDF3]'
                }`}
              >
                All
              </button>
              {availablePlatforms.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPlatform(filterPlatform === p ? 'all' : p)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                    filterPlatform === p
                      ? 'bg-[#FF2D87] text-white'
                      : 'bg-[#1A1A28] text-[#5E5E7A] hover:text-[#EDEDF3]'
                  }`}
                >
                  {PLATFORM_LABELS[p] || p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loadingTracks ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-[#FF2D87] animate-spin mx-auto mb-4" />
          <p className="text-[#5E5E7A]">Loading your library...</p>
        </div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-20">
          <Music className="w-12 h-12 text-[#1A1A28] mx-auto mb-4" />
          <p className="text-[#5E5E7A]">Your library is empty. Paste a link above or search to get started.</p>
        </div>
      ) : displayTracks.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="w-10 h-10 text-[#1A1A28] mx-auto mb-4" />
          <p className="text-[#5E5E7A]">No tracks match this filter.</p>
          <button
            onClick={() => setFilterPlatform('all')}
            className="text-sm text-[#FF2D87] hover:underline mt-2"
          >
            Show all tracks
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayTracks.map((item) => {
            const t = item.track;
            const isThis = currentTrack?.source_id === t.source_id;
            return (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-[#0B0B12] hover:bg-[#12121C] border border-[#1A1A28] rounded-lg px-4 py-3 transition group"
              >
                <button
                  onClick={() => handlePlayTrack(item)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition shrink-0 ${
                    isThis ? 'bg-[#FF2D87]' : 'bg-[#1A1A28] group-hover:bg-[#FF2D87]'
                  }`}
                >
                  {isThis && isPlaying
                    ? <Pause className="w-4 h-4" />
                    : <Play className="w-4 h-4 ml-0.5" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isThis ? 'text-[#FF2D87]' : ''}`}>{t.title}</p>
                  <p className="text-xs text-[#5E5E7A] truncate">{t.artist || 'Unknown Artist'}</p>
                </div>
                <span className="hidden sm:inline text-xs font-medium text-[#FF2D87] bg-[#FF2D87]/10 px-2 py-1 rounded shrink-0">
                  {PLATFORM_LABELS[t.source_platform] || t.source_platform}
                </span>
                {t.duration_seconds && (
                  <span className="hidden sm:flex text-xs text-[#5E5E7A] items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" /> {formatTime(t.duration_seconds)}
                  </span>
                )}
                <span className="hidden md:inline text-xs text-[#5E5E7A] shrink-0 w-24 text-right">{formatAdded(item.added_at)}</span>
                {/* Podcast download button */}
                {t.source_platform === 'podcast' && t.source_url && (
                  <a
                    href={t.source_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5E5E7A] hover:text-green-400 transition sm:opacity-0 sm:group-hover:opacity-100"
                    title="Download episode for offline listening"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={() => setPlaylistTrack({
                    title: t.title,
                    artist: t.artist || 'Unknown Artist',
                    source_platform: t.source_platform,
                    source_url: t.source_url,
                    source_id: t.source_id || '',
                    thumbnail_url: t.thumbnail_url || '',
                    duration_seconds: t.duration_seconds,
                  })}
                  className="text-[#5E5E7A] hover:text-[#FF2D87] transition sm:opacity-0 sm:group-hover:opacity-100"
                  title="Add to playlist"
                >
                  <ListMusic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-[#5E5E7A] hover:text-red-400 transition sm:opacity-0 sm:group-hover:opacity-100"
                  title="Remove from library"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {playlistTrack && (
        <AddToPlaylistModal
          track={playlistTrack}
          onClose={() => setPlaylistTrack(null)}
        />
      )}
    </div>
  );
}
