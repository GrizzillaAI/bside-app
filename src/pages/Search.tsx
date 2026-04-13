import { useState } from 'react';
import {
  Search as SearchIcon, Play, Pause, Plus, Loader2,
  ExternalLink, Music, Youtube,
} from 'lucide-react';
import { usePlayer } from '../lib/player';
import type { PlayerTrack } from '../lib/player';
import { searchAll, extractAudio, saveTrackToLibrary } from '../lib/api';
import type { UnifiedResult, SourcePlatform, MultiSourceStatus } from '../lib/api';

// ── Platform metadata ───────────────────────────────────────────────────
const PLATFORM_META: Record<SourcePlatform, { label: string; badge: string; accent: string }> = {
  youtube:    { label: 'YouTube',     badge: 'YT',   accent: 'bg-red-500/20 text-red-300 border-red-500/30' },
  spotify:    { label: 'Spotify',     badge: 'SP',   accent: 'bg-green-500/20 text-green-300 border-green-500/30' },
  applemusic: { label: 'Apple Music', badge: 'AM',   accent: 'bg-pink/20 text-pink-400 border-pink/30' },
  soundcloud: { label: 'SoundCloud',  badge: 'SC',   accent: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
};

// ── Unified Result Card ─────────────────────────────────────────────────
function ResultCard({ result }: { result: UnifiedResult }) {
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isThisPlaying = currentTrack?.source_id === result.source_id
    && currentTrack?.source_platform === result.source_platform;

  const meta = PLATFORM_META[result.source_platform];

  const handlePlay = async () => {
    if (isThisPlaying) {
      togglePlayPause();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let audioUrl: string | null = null;

      if (result.source_platform === 'youtube') {
        // YouTube needs extraction for full audio
        const audio = await extractAudio(result.source_id);
        audioUrl = audio.audio_url;
      } else if (result.preview_url) {
        // Spotify / Apple Music: 30s preview
        audioUrl = result.preview_url;
      } else if (result.stream_url) {
        // SoundCloud: progressive stream (needs client_id resolution server-side)
        audioUrl = result.stream_url;
      }

      if (!audioUrl) {
        setError('No preview available for this track');
        setLoading(false);
        return;
      }

      const track: PlayerTrack = {
        title: result.title,
        artist: result.artist,
        thumbnail_url: result.thumbnail_url,
        audio_url: audioUrl,
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

  const isPreviewOnly = (result.source_platform === 'spotify' || result.source_platform === 'applemusic')
    && result.preview_url;

  return (
    <div className="bg-void border border-slate rounded-xl overflow-hidden transition hover:border-graphite">
      <div className="flex items-center gap-4 p-4 group">
        {/* Thumbnail with play overlay */}
        <button
          onClick={handlePlay}
          disabled={loading}
          className="w-24 h-24 rounded-lg bg-gradient-to-br from-pink/30 to-pink-700/10 flex items-center justify-center shrink-0 relative overflow-hidden group/thumb"
        >
          {result.thumbnail_url ? (
            <img src={result.thumbnail_url} alt="" className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Music className="w-6 h-6 text-ash" />
          )}
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition">
            {loading ? (
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
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${meta.accent}`}>
              {meta.label}
            </span>
            {isPreviewOnly && (
              <span className="text-[10px] text-ash font-mono">30s preview</span>
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
    </div>
  );
}

// ── Source filter pills ─────────────────────────────────────────────────
const ALL_SOURCES: SourcePlatform[] = ['youtube', 'spotify', 'applemusic', 'soundcloud'];

// ── Main Search Page ────────────────────────────────────────────────────
export default function Search() {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<UnifiedResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'all' | SourcePlatform>('all');
  const [status, setStatus] = useState<MultiSourceStatus | null>(null);
  const [sourceErrors, setSourceErrors] = useState<Record<string, string>>({});

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setError(null);

    try {
      const data = await searchAll(query.trim(), ALL_SOURCES, 10);
      setResults(data.results);
      setStatus(data.status);
      setSourceErrors(data.errors);
    } catch (err) {
      console.error('Search failed:', err);
      setError((err as Error).message);
      setResults([]);
    }
    setSearching(false);
  };

  const filteredResults = activeFilter === 'all'
    ? results
    : results.filter((r) => r.source_platform === activeFilter);

  const countBySource = (src: SourcePlatform) =>
    results.filter((r) => r.source_platform === src).length;

  return (
    <div className="max-w-5xl">
      <h1 className="font-display font-black text-3xl text-pearl mb-2" style={{ letterSpacing: '-0.03em' }}>
        Mix everything.
      </h1>
      <p className="text-sm text-silver mb-6">
        Search across YouTube, Spotify, Apple Music, and SoundCloud — all in one feed.
      </p>

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
          {ALL_SOURCES.map((src) => {
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
          <p className="text-silver">Mixing results from all sources...</p>
        </div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-error mb-2">Search failed</p>
          <p className="text-sm text-ash">{error}</p>
        </div>
      ) : filteredResults.length > 0 ? (
        <div className="space-y-3">
          {filteredResults.map((r) => (
            <ResultCard key={`${r.source_platform}-${r.source_id}`} result={r} />
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
              <div className="mt-8 flex items-center justify-center gap-6 text-xs text-ash">
                <div className="flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5" /> YouTube
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Spotify
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> Apple Music
                </div>
                <div className="flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" /> SoundCloud
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
