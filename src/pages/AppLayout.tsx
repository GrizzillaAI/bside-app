import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, ListMusic, Download, Settings, Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Crown, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePlayer, formatTime } from '../lib/player';
import { LogoMark, Wordmark } from '../components/Logo';
import YouTubeEmbed from '../components/YouTubeEmbed';
import SoundCloudEmbed from '../components/SoundCloudEmbed';
import TikTokEmbed from '../components/TikTokEmbed';
import BandcampEmbed from '../components/BandcampEmbed';
import TrackReactions from '../components/TrackReactions';

const navItems = [
  { to: '/app', icon: Home, label: 'Home', end: true },
  { to: '/app/search', icon: Search, label: 'Search' },
  { to: '/app/library', icon: Library, label: 'Library' },
  { to: '/app/playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/app/import/youtube', icon: Download, label: 'Import' },
];

/** Detect mobile via JS so we only render ONE set of embeds (never two). */
function useIsMobile() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
}

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const {
    currentTrack, isPlaying, currentTime, duration, volume, playbackError,
    togglePlayPause, seek, setVolume, skipNext, skipPrev,
    youtubeVideoId, onYouTubeStateChange, onYouTubeTimeUpdate, onYouTubeReady, youtubeRef,
    soundcloudTrackUrl, onSoundCloudStateChange, onSoundCloudTimeUpdate, onSoundCloudReady, soundcloudRef,
    tiktokVideoId, onTikTokStateChange, onTikTokTimeUpdate, onTikTokReady, tiktokRef,
    bandcampEmbedUrl, bandcampRef,
  } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // ── Shared embed block (rendered ONCE — never duplicated) ──
  const embedBlock = (
    <>
      {youtubeVideoId ? (
        <YouTubeEmbed
          ref={youtubeRef}
          videoId={youtubeVideoId}
          isPlaying={isPlaying}
          volume={volume}
          onStateChange={onYouTubeStateChange}
          onTimeUpdate={onYouTubeTimeUpdate}
          onReady={onYouTubeReady}
        />
      ) : soundcloudTrackUrl ? (
        <SoundCloudEmbed
          ref={soundcloudRef}
          trackUrl={soundcloudTrackUrl}
          isPlaying={isPlaying}
          volume={volume}
          onStateChange={onSoundCloudStateChange}
          onTimeUpdate={onSoundCloudTimeUpdate}
          onReady={onSoundCloudReady}
        />
      ) : tiktokVideoId ? (
        <TikTokEmbed
          ref={tiktokRef}
          videoId={tiktokVideoId}
          isPlaying={isPlaying}
          volume={volume}
          onStateChange={onTikTokStateChange}
          onTimeUpdate={onTikTokTimeUpdate}
          onReady={onTikTokReady}
        />
      ) : bandcampEmbedUrl ? (
        <BandcampEmbed
          ref={bandcampRef}
          embedUrl={bandcampEmbedUrl}
        />
      ) : (
        <div className={`${isMobile ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg bg-graphite flex items-center justify-center shrink-0 overflow-hidden`}>
          {currentTrack?.thumbnail_url ? (
            <img src={currentTrack.thumbnail_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Music className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} text-ash`} />
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-ink text-pearl overflow-hidden">
      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      {!isMobile && (
        <aside className="w-60 bg-void border-r border-slate flex flex-col shrink-0">
          <div className="p-6 flex items-center gap-2">
            <LogoMark size={28} />
            <Wordmark size={22} />
          </div>

          <nav className="flex-1 px-3 space-y-1">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-pink text-white' : 'text-silver hover:bg-graphite hover:text-pearl'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4">
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 mb-3 ${
                  isActive ? 'bg-pink text-white' : 'text-silver hover:bg-graphite hover:text-pearl'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Settings
            </NavLink>
            <button className="w-full flex items-center justify-center gap-2 bg-lime hover:bg-lime-600 text-ink px-4 py-3 rounded-lg text-sm font-bold transition mb-2">
              <Crown className="w-4 h-4" />
              Go Premium
            </button>
            {user && (
              <div className="flex items-center gap-3 px-2 pt-3 border-t border-slate">
                <div className="w-8 h-8 rounded-full bg-pink flex items-center justify-center text-xs font-bold shrink-0 text-white">
                  {(user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="text-xs text-silver truncate flex-1">{user.email}</span>
                <button onClick={handleSignOut} className="text-ash hover:text-pearl transition" title="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Mobile slide-out menu overlay ── */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-void border-r border-slate flex flex-col animate-slide-in">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoMark size={28} />
                <Wordmark size={22} />
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-ash hover:text-pearl transition p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <nav className="flex-1 px-3 space-y-1">
              {navItems.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive ? 'bg-pink text-white' : 'text-silver hover:bg-graphite hover:text-pearl'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/app/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-pink text-white' : 'text-silver hover:bg-graphite hover:text-pearl'
                  }`
                }
              >
                <Settings className="w-5 h-5" />
                Settings
              </NavLink>
            </nav>

            <div className="p-4">
              <button className="w-full flex items-center justify-center gap-2 bg-lime hover:bg-lime-600 text-ink px-4 py-3 rounded-lg text-sm font-bold transition mb-3">
                <Crown className="w-4 h-4" />
                Go Premium
              </button>
              {user && (
                <div className="flex items-center gap-3 px-2 pt-3 border-t border-slate">
                  <div className="w-8 h-8 rounded-full bg-pink flex items-center justify-center text-xs font-bold shrink-0 text-white">
                    {(user.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <span className="text-xs text-silver truncate flex-1">{user.email}</span>
                  <button onClick={handleSignOut} className="text-ash hover:text-pearl transition" title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        {isMobile && (
          <div className="flex items-center gap-3 px-4 py-3 bg-void border-b border-slate shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-ash hover:text-pearl transition p-1"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <LogoMark size={22} />
              <Wordmark size={18} />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>

        {/* Playback error banner */}
        {playbackError && (
          <div className="bg-red-500/15 border-t border-red-500/30 px-4 py-2 text-sm text-red-300 text-center">
            {/* Show helpful message for Spotify on mobile */}
            {isMobile && playbackError.toLowerCase().includes('spotify')
              ? 'Spotify playback requires a desktop browser. Try YouTube or SoundCloud on mobile.'
              : playbackError
            }
          </div>
        )}

        {/* ── Player bar — ONE version, adapts via isMobile ── */}
        {isMobile ? (
          /* ── Mobile compact player ── */
          <div className="bg-void border-t border-slate shrink-0">
            <div className="flex items-center gap-3 px-3 py-2">
              {/* Single embed instance */}
              <div className="w-10 h-10 shrink-0">
                {embedBlock}
              </div>

              {/* Track info */}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate text-pearl">
                  {currentTrack?.title ?? 'No track playing'}
                </p>
                <p className="text-[10px] text-ash truncate">
                  {currentTrack?.artist ?? 'Search or paste a link'}
                </p>
              </div>

              {/* Compact controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={skipPrev} className="text-ash hover:text-pearl transition p-1.5">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlayPause}
                  disabled={!currentTrack}
                  className="w-9 h-9 rounded-full bg-pink flex items-center justify-center transition disabled:opacity-40"
                >
                  {isPlaying
                    ? <Pause className="w-4 h-4 text-white" />
                    : <Play className="w-4 h-4 text-white ml-0.5" />
                  }
                </button>
                <button onClick={skipNext} className="text-ash hover:text-pearl transition p-1.5">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thin progress bar */}
            {currentTrack && (
              <div className="px-3 pb-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="w-full h-1"
                  style={{ accentColor: '#FF2D87' }}
                />
              </div>
            )}
          </div>
        ) : (
          /* ── Desktop full player bar ── */
          <div className="h-20 bg-void border-t border-slate px-6 flex items-center gap-6 shrink-0">
            {/* Track info + single embed instance */}
            <div className="flex items-center gap-3 w-64 shrink-0">
              {embedBlock}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate text-pearl">
                  {currentTrack?.title ?? 'No track playing'}
                </p>
                <p className="text-xs text-ash truncate">
                  {currentTrack?.artist ?? 'Search or paste a link to start'}
                </p>
              </div>
              <TrackReactions track={currentTrack} />
            </div>

            {/* Controls */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <button onClick={skipPrev} className="text-ash hover:text-pearl transition">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button
                  onClick={togglePlayPause}
                  disabled={!currentTrack}
                  className="w-10 h-10 rounded-full bg-pink flex items-center justify-center hover:bg-pink-400 hover:scale-105 transition disabled:opacity-40"
                >
                  {isPlaying
                    ? <Pause className="w-5 h-5 text-white" />
                    : <Play className="w-5 h-5 text-white ml-0.5" />
                  }
                </button>
                <button onClick={skipNext} className="text-ash hover:text-pearl transition">
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-3 w-full max-w-md">
                <span className="text-xs text-ash w-10 text-right font-mono">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs text-ash w-10 font-mono">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 w-36">
                <button
                  onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
                  className="text-ash hover:text-pearl transition"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile bottom tab bar ── */}
        {isMobile && (
          <nav className="flex items-center bg-void border-t border-slate shrink-0 safe-bottom">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                    isActive ? 'text-pink' : 'text-ash'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            ))}
            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition ${
                  isActive ? 'text-pink' : 'text-ash'
                }`
              }
            >
              <Settings className="w-5 h-5" />
              Settings
            </NavLink>
          </nav>
        )}
      </div>
    </div>
  );
}
