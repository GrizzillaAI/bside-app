import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search as SearchIcon, Play, Pause, Plus, Loader2,
  ExternalLink, Music, Youtube, Lock, Crown, ListMusic, Download,
} from 'lucide-react';
import { usePlayer } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import { searchAll, saveTrackToLibrary, logB3Event, PHASE_1_SOURCES } from '../lib/api';
import type { UnifiedResult, SourcePlatform, MultiSourceStatus } from '../lib/api';
import {
  beginSpotifyOAuth, getMySpotifyConnection, type SpotifyConnection,
} from '../lib/spotify';
import AddToPlaylistModal from '../components/AddToPlaylistModal';
import type { TrackForPlaylist } from '../components/AddToPlaylistModal';

// ── Platform metadata ───────────────────────────────────────────────────
const PLATFORM_META: Record<SourcePlatform, { label: string; badge: string; accent: string }> = {
  youtube:    { label: 'YouTube',     badge: 'YT',   accent: 'bg-red-500/20 text-red-300 border-red-500/30' },
  spotify:    { label: 'Spotify',     badge: 'SP',   accent: 'bg-green-500/20 text-green-300 border-green-500/30' },
  applemusic: { label: 'Apple Music', badge: 'AM',   accent: 'bg-pink/20 text-pink-400 border-pink/30' },
  soundcloud: { label: 'SoundCloud',  badge: 'SC',   accent: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  podcast:    { label: 'Podcast',     badge: 'POD',  accent: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  bandcamp:   { label: 'Bandcamp',    badge: 'BC',   accent: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
};

// ── Unified Result Card ─────────────────────────────────────────────────
function ResultCard({
  result,
  spotifyConnection,
}: {
  result: UnifiedResult;
  spotifyConnection: SpotifyConnection | null;
}) {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const isThisPlaying = currentTrack?.source_id === result.source_id
    && currentTrack?.source_platform === result.source_platform;

  const meta = PLATFORM_META[result.source_platform];

  // Spotify-specific gating ------------------------------------------------
  const isSpotify = result.source_platform === 'spotify';
  const spotifyGated = isSpotify && (!spotifyConnection || !spotifyConnection.is_premium);
  const needsConnect = isSpotify && !spotifyConnection;
  const needsPremium = isSpotify && spotifyConnection && !spotifyConnection.is_premium;

  const handlePlay = async () => {
    if (isThisPlaying) {
      togglePlayPause();
      return;
    }

    // Spotify gating: don't attempt playback if user can't play it
    if (spotifyGated) return;

    setError(null);
    setLoading(true);
    try {
      if (result.source_platform === 'spotify') {
        // Full-track playback via Web Playback SDK. Audio URL is the Spotify URI.
        const track: PlayerTrack = {
          title: result.title,
          artist: result.artist,
          thumbnail_url: result.thumbnail_url,
          audio_url: `spotify:track:${result.source_id}`,
          duration_seconds: result.duration_seconds,
          source_platform: 'spotify',
          source_id: result.source_id,
          source_url: result.external_url,
        };
        play(track);
        setLoading(false);
        return;
      }

      // SoundCloud: use Widget API (iframe) — pass permalink URL, no audio_url needed
      if (result.source_platform === 'soundcloud') {
        const track: PlayerTrack = {
          title: result.title,
          artist: result.artist,
          thumbnail_url: result.thumbnail_url,
          audio_url: '',  // SoundCloud Widget handles playback via iframe
          duration_seconds: result.duration_seconds,
          source_platform: 'soundcloud',
          source_id: result.source_id,
          source_url: result.external_url,
        };
        play(track);
        setLoading(false);
        return;
      }

      // Podcast: full episode playback via HTML5 audio (stream_url or preview_url)
      if (result.source_platform === 'podcast') {
        const audioSrc = result.stream_url || result.preview_url || '';
        const track: PlayerTrack = {
          title: result.title,
          artist: result.artist,
          thumbnail_url: result.thumbnail_url,
          audio_url: audioSrc,
          duration_seconds: result.duration_seconds,
          source_platform: 'podcast',
          source_id: result.source_id,
          source_url: result.external_url,
        };
        play(track);
        setLoading(false);
        return;
      }

      // Apple Music: 30-second preview via HTML5 audio
      if (result.source_platform === 'applemusic') {
        const audioSrc = result.preview_url || '';
        const track: PlayerTrack = {
          title: result.title,
          artist: result.artist,
          thumbnail_url: result.thumbnail_url,
          audio_url: audioSrc,
          duration_seconds: result.duration_seconds,
          source_platform: 'applemusic',
          source_id: result.source_id,
          source_url: result.external_url,
        };
        play(track);
        setLoading(false);
        return;
      }

      // YouTube: pass video ID directly — the YouTube IFrame embed handles playback
      const track: PlayerTrack = {
        title: result.title,
        artist: result.artist,
        thumbnail_url: result.thumbnail_url,
        audio_url: '',  // YouTube doesn't use audio_url — the iframe plays the video
        duration_seconds: result.duration_seconds,
        source_platform: result.source_platform,
        source_id: result.source_id,
        source_url: result.external_url,
      };
      play(track);
    } catch (e) {
      console.error('Playback failed:', e);
      setError((e as Error).message);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveTrackToLibrary({
        title: result.title,
        artist: result.artist,
        source_platform: result.source_platform,
        source_url: result.external_url,
        source_id: result.source_id,
        thumbnail_url: result.thumbnail_url,
        duration_seconds: result.duration_seconds,
      });
      setSaved(true);
    } catch (e) {
      console.error('Save failed:', e);
    }
    setSaving(false);
  };

  return (
    <div className={`bg-void border rounded-xl overflow-hidden transition ${
      spotifyGated ? 'border-slate/40 opacity-80' : 'border-slate hover:border-graphite'
    }`}>
      <div className="flex items-center gap-4 p-4 group">
        {/* Thumbnail with play overlay */}
        <button
          onClick={handlePlay}
          disabled={loading || spotifyGated}
          className={`w-24 h-24 rounded-lg bg-gradient-to-br from-pink/30 to-pink-700/10 flex items-center justify-center shrink-0 relative overflow-hidden group/thumb ${
            spotifyGated ? 'cursor-not-allowed' : ''
          }`}
        >
          {result.thumbnail_url ? (
            <img src={result.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Music className="w-6 h-6 text-ash" />
          )}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition ${
            spotifyGated ? 'opacity-100' : 'opacity-0 group-hover/thumb:opacity-100'
          }`}>
            {spotifyGated ? (
              <Lock className="w-5 h-5 text-white" />
            ) : loading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : isThisPlaying && isPlaying ? (
              <Pause className="w-6 h-6 text-white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-0.5" />
            )}
          </div>
          <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-mono text-white">
            {result.duration_display}
          </span>
          {isThisPlaying && (
            <div className="absolute top-1 left-1 bg-pink text-[9px] px-1.5 py-0.5 rounded font-bold text-white uppercase tracking-wider">
              {isPlaying ? 'Playing' : 'Paused'}
            </div>
          )}
        </button>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.accent}`}>
              {meta.label}
            </span>
            {needsConnect && (
              <span className="text-[10px] font-semibold text-pink border border-pink/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> Connect Spotify to play
              </span>
            )}
            {needsPremium && (
              <span className="text-[10px] font-semibold text-warning border border-warning/40 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Crown className="w-2.5 h-2.5" /> Spotify Premium required
              </span>
            )}
            {result.explicit && (
              <span className="text-[10px] font-bold text-ash border border-ash/40 px-1.5 py-0.5 rounded">E</span>
            )}
          </div>
          <p className="text-sm font-medium text-pearl truncate">{result.title}</p>
          <div className="flex items-center gap-3 text-xs text-ash mt-1">
            <span className="truncate">{result.artist}</span>
            {result.album && <span className="truncate">• {result.album}</span>}
          </div>
          {error && <p className="text-xs text-error mt-1">{error}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={result.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-ash hover:text-pearl hover:bg-graphite transition"
            title={`Open in ${meta.label}`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* Podcast download button */}
          {result.source_platform === 'podcast' && (result.stream_url || result.preview_url) && (
            <a
              href={result.stream_url || result.preview_url || ''}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-ash hover:text-pearl hover:bg-graphite transition"
              title="Download episode for offline listening"
            >
              <Download className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={() => setShowPlaylistModal(true)}
            className="p-2 rounded-lg text-ash hover:text-pearl hover:bg-graphite transition"
            title="Add to playlist"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shrink-0 ${
              saved
                ? 'bg-success/20 text-success cursor-default'
                : 'bg-pink hover:bg-pink-600 text-white disabled:opacity-40'
            }`}
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              '✓ Saved'
            ) : (
              <><Plus className="w-3.5 h-3.5" /> Save</>
            )}
          </button>
        </div>
      </div>

      {showPlaylistModal && (
        <AddToPlaylistModal
          track={{
            title: result.title,
            artist: result.artist,
            source_platform: result.source_platform,
            source_url: result.external_url,
            source_id: result.source_id,
            thumbnail_url: result.thumbnail_url,
            duration_seconds: result.duration_seconds,
          }}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
}

// ── Source filter pills ─────────────────────────────────────────────────
const VISIBLE_SOURCES: SourcePlatform[] = PHASE_1_SOURCES;

// ── Main Search Page ────────────────────────────────────────────────────
export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | SourcePlatform>('all');
  const [status, setStatus] = useState<MultiSourceStatus | null>(null);
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({});
  const [spotifyConnection, setSpotifyConnection] = useState<SpotifyConnection | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      const conn = await getMySpotifyConnection();
      setSpotifyConnection(conn);
    })();
  }, []);

  // Core search runner — callable from either the form submit or a URL param change
  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const data = await searchAll(trimmed, VISIBLE_SOURCES, 25);
      setResults(data.results);
      setStatus(data.status);
      setSourceErrors(data.errors);

      // B3: log search event (fire-and-forget)
      logB3Event('search.performed', {
        query: trimmed,
        result_count: data.results.length,
        sources: VISIBLE_SOURCES,
      });
    } catch (err) {
      console.error('Search failed:', err);
      setError((err as Error).message);
      setResults([]);
    }
    setSearching(false);
  };

  // If we land on /app/search?q=... (e.g. from Home's "Try this" chips), auto-run the search.
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) setQuery(q);
    if (q && !hasSearched) runSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    // Keep URL in sync so searches are shareable / bookmarkable
    setSearchParams({ q: query.trim() }, { replace: true });
    await runSearch(query);
  };

  const handleConnectSpotify = async () => {
    setConnecting(true);
    try { await beginSpotifyOAuth('/app/search'); }
    catch (e) { setConnecting(false); setError((e as Error).message); }
  };

  const filteredResults = activeFilter === 'all'
    ? results
    : results.filter((r) => r.source_platform === activeFilter);

  const countBySource = (src: SourcePlatform) =>
    results.filter((r) => r.source_platform === src).length;

  const spotifyConnected = !!spotifyConnection;
  const spotifyPremium = !!spotifyConnection?.is_premium;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-black text-3xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>
        Find anything.
      </h1>
      <p className="text-sm text-silver mb-6">
        Search across YouTube, Spotify, SoundCloud, Apple Music, and Podcasts — all in one feed.
      </p>

      {/* Spotify connection banner */}
      {!spotifyConnected && (
        <div className="bg-gradient-to-r from-green-900/20 to-pink/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Music className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-pearl">Connect Spotify for full-track playback</p>
            <p className="text-xs text-silver">Requires Spotify Premium. YouTube + SoundCloud play for everyone.</p>
          </div>
          <button
            onClick={handleConnectSpotify}
            disabled={connecting}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition shrink-0"
          >
            {connecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect Spotify'}
          </button>
        </div>
      )}
      {spotifyConnected && !spotifyPremium && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Crown className="w-5 h-5 text-warning shrink-0" />
          <p className="text-xs text-silver flex-1">
            Spotify connected — but your account is Free. Upgrade to Spotify Premium to play full tracks in Mixd.
          </p>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ash" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, artists, sessions across every platform..."
              className="w-full bg-void border border-slate focus:border-pink rounded-lg pl-12 pr-4 py-3 text-sm outline-none transition placeholder:text-ash text-pearl"
            />
          </div>
          <button
            type="submit"
            disabled={!query.trim() || searching}
            className="bg-pink hover:bg-pink-600 disabled:opacity-40 px-6 py-3 rounded-lg text-sm font-semibold text-white transition shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </div>
      </form>

      {/* Source filter tabs */}
      {hasSearched && results.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeFilter === 'all'
                ? 'bg-pink text-white'
                : 'bg-void border border-slate text-silver hover:text-pearl hover:border-graphite'
            }`}
          >
            All ({results.length})
          </button>
          {VISIBLE_SOURCES.map((src) => {
            const count = countBySource(src);
            const srcStatus = status?.[src];
            return (
              <button
                key={src}
                onClick={() => setActiveFilter(src)}
                disabled={count === 0 && srcStatus !== 'error'}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeFilter === src
                    ? 'bg-pink text-white'
                    : 'bg-void border border-slate text-silver hover:text-pearl hover:border-graphite disabled:opacity-40 disabled:cursor-not-allowed'
                }`}
              >
                {PLATFORM_META[src].label} ({count})
                {srcStatus === 'error' && <span className="ml-1 text-error">•</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Per-source errors */}
      {Object.keys(sourceErrors).length > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-lg px-4 py-3 mb-4 text-xs text-warning">
          <p className="font-semibold mb-1">Some sources unavailable:</p>
          {Object.entries(sourceErrors).map(([src, msg]) => (
            <p key={src}>• {PLATFORM_META[src as SourcePlatform]?.label ?? src}: {msg}</p>
          ))}
        </div>
      )}

      {searching ? (
        <div className="text-center py-20">
          <Loader2 className="w-8 h-8 text-pink animate-spin mx-auto mb-4" />
          <p className="text-silver">Mixing results from every source...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-error mb-2">Search failed</p>
          <p className="text-sm text-ash">{error}</p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-3">
          {filteredResults.map((r) => (
            <ResultCard
              key={`${r.source_platform}-${r.source_id}`}
              result={r}
              spotifyConnection={spotifyConnection}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <SearchIcon className="w-12 h-12 text-slate mx-auto mb-4" />
          <p className="text-silver">
            {hasSearched ? 'No results found. Try different keywords.' : 'Search all platforms at once.'}
          </p>
          {!hasSearched && (
            <>
              <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-xl mx-auto">
                {['Tyler the Creator', 'Tiny Desk', 'Boiler Room', 'Fred again', 'Colors Show', 'KEXP Live'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag)}
                    className="bg-void border border-slate hover:border-pink text-xs text-silver hover:text-pearl px-3 py-1.5 rounded-full transition"
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ash flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5" /> YouTube
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Spotify
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> SoundCloud
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Apple Music
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Podcasts
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
