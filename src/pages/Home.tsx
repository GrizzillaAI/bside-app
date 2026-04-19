import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Play, Pause, Music, Search as SearchIcon, Sparkles, ListMusic, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePlayer, formatTime } from '../lib/player';
import { extractAudio } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Chip, EmptyState, PlatformIcon, PLATFORM_LABELS } from '../components/ui';
import type { PlatformKey } from '../components/ui';

/**
 * Home — the "what do I want to do right now?" launchpad.
 * Replaces default-Library-as-Home with a greeting + three glance-able sections:
 *   1) Continue        — the current/last track in a pill
 *   2) Recently added  — most recently saved library items
 *   3) Try this        — curated search starters
 */

interface HomeTrack {
  id: string;
  title: string;
  artist: string | null;
  source_platform: string;
  source_url: string;
  source_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
}

const KNOWN_PLATFORMS: PlatformKey[] = ['youtube', 'spotify', 'soundcloud', 'applemusic', 'tiktok'];
const isKnownPlatform = (p: string | null | undefined): p is PlatformKey =>
  !!p && (KNOWN_PLATFORMS as string[]).includes(p);

function greeting(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Late night';
}

const STARTER_SEARCHES = ['Tiny Desk', 'Boiler Room', 'Fred again', 'Tyler the Creator', 'Colors Show', 'KEXP Live'];

const CAPTION = 'text-xs uppercase tracking-wider font-semibold';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { play, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  const [recent, setRecent] = useState<HomeTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const displayName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'there';
  const now = new Date();
  const hello = greeting(now.getHours());

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      const { data } = await supabase
        .from('library_tracks')
        .select('track:tracks(id, title, artist, source_platform, source_url, source_id, thumbnail_url, duration_seconds)')
        .eq('user_id', u.id)
        .order('added_at', { ascending: false })
        .limit(6);
      if (data) {
        const tracks = (data as unknown as { track: HomeTrack }[])
          .map((row) => row.track)
          .filter(Boolean);
        setRecent(tracks);
      }
      setLoading(false);
    })();
  }, []);

  const handlePlayRecent = async (t: HomeTrack) => {
    const isThis = currentTrack?.source_id === t.source_id;
    if (isThis) {
      togglePlayPause();
      return;
    }
    try {
      const result = await extractAudio(t.source_url);
      play({
        id: t.id,
        title: t.title,
        artist: t.artist || 'Unknown artist',
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

  const handleStarter = (q: string) => {
    navigate(`/app/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="max-w-5xl">
      {/* Greeting */}
      <header className="mb-8">
        <p className="text-silver text-sm mb-2">{hello}, {displayName}.</p>
        <h1
          className="font-display font-black text-3xl md:text-5xl text-pearl"
          style={{ letterSpacing: '-0.03em' }}
        >
          What are we mixing today?
        </h1>
      </header>

      {/* Continue / now playing pill */}
      {currentTrack ? (
        <section aria-labelledby="continue-heading" className="mb-10">
          <h2 id="continue-heading" className={`${CAPTION} text-silver mb-3`}>CONTINUE</h2>
          <div className="bg-void border border-slate rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-lg bg-graphite flex items-center justify-center shrink-0 overflow-hidden" aria-hidden="true">
              {currentTrack.thumbnail_url ? (
                <img src={currentTrack.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-6 h-6 text-silver" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-pearl truncate">{currentTrack.title}</p>
              <p className="text-xs text-silver truncate">{currentTrack.artist}</p>
              {isKnownPlatform(currentTrack.source_platform) ? (
                <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-silver">
                  <PlatformIcon platform={currentTrack.source_platform as PlatformKey} size={12} aria-label="" />
                  {PLATFORM_LABELS[currentTrack.source_platform as PlatformKey]}
                </span>
              ) : null}
            </div>
            <Button
              onClick={togglePlayPause}
              variant="primary"
              size="lg"
              aria-label={isPlaying ? `Pause ${currentTrack.title}` : `Play ${currentTrack.title}`}
              aria-pressed={isPlaying}
            >
              {isPlaying ? <Pause className="w-4 h-4" aria-hidden="true" /> : <Play className="w-4 h-4 ml-0.5" aria-hidden="true" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
          </div>
        </section>
      ) : null}

      {/* Quick start */}
      <section aria-labelledby="quick-start-heading" className="mb-10">
        <h2 id="quick-start-heading" className={`${CAPTION} text-silver mb-3`}>QUICK START</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/app/search"
            className="bg-void hover:bg-graphite border border-slate rounded-xl p-5 transition group focus-visible:border-pink"
          >
            <div className="w-10 h-10 rounded-lg bg-pink/15 flex items-center justify-center mb-3 text-pink" aria-hidden="true">
              <SearchIcon className="w-5 h-5" />
            </div>
            <p className="text-pearl font-semibold mb-1">Search every platform</p>
            <p className="text-xs text-silver flex items-center gap-1">
              YouTube, Spotify, SoundCloud <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
          <Link
            to="/app/library"
            className="bg-void hover:bg-graphite border border-slate rounded-xl p-5 transition group focus-visible:border-pink"
          >
            <div className="w-10 h-10 rounded-lg bg-cobalt/15 flex items-center justify-center mb-3 text-cobalt-300" aria-hidden="true">
              <Music className="w-5 h-5" />
            </div>
            <p className="text-pearl font-semibold mb-1">Paste a link</p>
            <p className="text-xs text-silver flex items-center gap-1">
              Save from anywhere on the web <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
          <Link
            to="/app/playlists"
            className="bg-void hover:bg-graphite border border-slate rounded-xl p-5 transition group focus-visible:border-pink"
          >
            <div className="w-10 h-10 rounded-lg bg-lime/15 flex items-center justify-center mb-3 text-lime-600" aria-hidden="true">
              <ListMusic className="w-5 h-5" />
            </div>
            <p className="text-pearl font-semibold mb-1">Build a playlist</p>
            <p className="text-xs text-silver flex items-center gap-1">
              Mix anything from anywhere <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </p>
          </Link>
        </div>
      </section>

      {/* Recently added */}
      <section aria-labelledby="recent-heading" className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 id="recent-heading" className={`${CAPTION} text-silver`}>RECENTLY ADDED</h2>
          {recent.length > 0 ? (
            <Link to="/app/library" className="text-xs text-pink hover:text-pink-400 font-medium inline-flex items-center gap-1">
              See all <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
        {loading ? (
          <div className="text-silver text-sm py-6" aria-live="polite">Loading…</div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<Music className="w-10 h-10 text-ash" aria-hidden="true" />}
            title="Your library is empty — so far."
            description="Paste a link or search to save your first track."
            action={
              <Button onClick={() => navigate('/app/library')} variant="primary" size="md">
                Go to Library
              </Button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" aria-label="Recently added tracks">
            {recent.map((t) => {
              const isThis = currentTrack?.source_id === t.source_id;
              const isPlayingThis = isThis && isPlaying;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handlePlayRecent(t)}
                    aria-label={`${isPlayingThis ? 'Pause' : 'Play'} ${t.title}`}
                    aria-pressed={isPlayingThis}
                    className="w-full text-left bg-void hover:bg-graphite border border-slate rounded-lg overflow-hidden transition group focus-visible:border-pink"
                  >
                    <div className="aspect-square bg-graphite flex items-center justify-center relative">
                      {t.thumbnail_url ? (
                        <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music className="w-8 h-8 text-silver" aria-hidden="true" />
                      )}
                      <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition" aria-hidden="true">
                        <span className="w-10 h-10 rounded-full bg-pink text-ink flex items-center justify-center">
                          {isPlayingThis ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </span>
                      </span>
                      {t.duration_seconds ? (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] px-1.5 py-0.5 rounded font-mono text-pearl tabular-nums">
                          {formatTime(t.duration_seconds)}
                        </span>
                      ) : null}
                    </div>
                    <div className="p-2">
                      <p className={`text-xs font-medium truncate ${isThis ? 'text-pink' : 'text-pearl'}`}>{t.title}</p>
                      <p className="text-[11px] text-silver truncate">{t.artist || 'Unknown artist'}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Try this */}
      <section aria-labelledby="try-heading" className="mb-4">
        <h2 id="try-heading" className={`${CAPTION} text-silver mb-3 inline-flex items-center gap-2`}>
          <Sparkles className="w-3.5 h-3.5 text-pink" aria-hidden="true" /> TRY THIS
        </h2>
        <div className="flex flex-wrap gap-2">
          {STARTER_SEARCHES.map((q) => (
            <Chip
              key={q}
              variant="suggestion"
              prefix={<SearchIcon className="w-3 h-3" aria-hidden="true" />}
              onClick={() => handleStarter(q)}
            >
              {q}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}
