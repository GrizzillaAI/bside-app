import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Library, ListMusic, Download, Settings, Crown, LogOut, Search, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePlayer } from '../lib/player';
import { LogoMark, Wordmark } from '../components/Logo';
import YouTubeEmbed from '../components/YouTubeEmbed';
import SoundCloudEmbed from '../components/SoundCloudEmbed';
import TikTokEmbed from '../components/TikTokEmbed';
import BandcampEmbed from '../components/BandcampEmbed';
import CassetteDeck from '../components/CassetteDeck';

// Nav items — Search removed (search bar is above cassette), Settings added
const navItems = [
  { to: '/app', icon: Home, label: 'Home', end: true },
  { to: '/app/library', icon: Library, label: 'Library' },
  { to: '/app/playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/app/import', icon: Download, label: 'Import' },
  { to: '/app/settings', icon: Settings, label: 'Settings' },
];

/** Detect mobile via JS so we only render ONE layout. */
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
    currentTrack, isPlaying, volume, playbackError,
    youtubeVideoId, onYouTubeStateChange, onYouTubeTimeUpdate, onYouTubeReady, youtubeRef,
    soundcloudTrackUrl, onSoundCloudStateChange, onSoundCloudTimeUpdate, onSoundCloudReady, soundcloudRef,
    tiktokVideoId, onTikTokStateChange, onTikTokTimeUpdate, onTikTokReady, tiktokRef,
    bandcampEmbedUrl, bandcampRef,
  } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // ── YouTube embed — rendered VISIBLY (YouTube ToS requires visible player) ──
  const youtubeBlock = youtubeVideoId ? (
    <YouTubeEmbed
      ref={youtubeRef}
      videoId={youtubeVideoId}
      isPlaying={isPlaying}
      volume={volume}
      onStateChange={onYouTubeStateChange}
      onTimeUpdate={onYouTubeTimeUpdate}
      onReady={onYouTubeReady}
    />
  ) : null;

  // ── Non-YouTube embeds (hidden — no PiP ToS requirement) ──
  const hiddenEmbedBlock = (
    <>
      {soundcloudTrackUrl ? (
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
      ) : null}
    </>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT — left column (deck panel) + right column (content)
  // ═══════════════════════════════════════════════════════════════════════
  if (!isMobile) {
    return (
      <div className="flex h-screen bg-ink text-pearl overflow-hidden">
        {/* ── Left Column: Deck Panel ── */}
        <aside className="w-[340px] min-w-[340px] bg-void border-r border-slate flex flex-col shrink-0">
          {/* Logo */}
          <div className="p-5 pb-3 flex items-center gap-2">
            <LogoMark size={28} />
            <Wordmark size={22} />
          </div>

          {/* Nav */}
          <nav className="px-3 space-y-0.5">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? 'bg-pink text-white' : 'text-silver hover:bg-graphite hover:text-pearl'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px]" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Search bar */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ash" />
              <input
                type="text"
                placeholder="Search tracks..."
                className="w-full bg-graphite border border-slate rounded-lg pl-9 pr-3 py-2.5 text-sm text-pearl placeholder-ash focus:border-pink focus:outline-none transition"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) navigate(`/app/search?q=${encodeURIComponent(val)}`);
                  }
                }}
              />
            </div>
          </div>

          {/* ── Cassette Deck (pushed lower — YouTube PIP moved to content area) ── */}
          <div className="flex-1 flex flex-col justify-end min-h-0 px-1 pb-2">
            <CassetteDeck embedBlock={hiddenEmbedBlock} compact={false} />
          </div>

          {/* Bottom: Premium + user */}
          <div className="p-3 pt-0">
            <button className="w-full flex items-center justify-center gap-2 bg-lime hover:bg-lime-600 text-ink px-4 py-2.5 rounded-lg text-sm font-bold transition mb-2">
              <Crown className="w-4 h-4" />
              Go Premium
            </button>
            {user && (
              <div className="flex items-center gap-3 px-2 pt-2 border-t border-slate">
                <div className="w-7 h-7 rounded-full bg-pink flex items-center justify-center text-xs font-bold shrink-0 text-white">
                  {(user.user_metadata?.username?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="text-xs text-silver truncate flex-1">{user.user_metadata?.username || user.email?.split('@')[0] || 'User'}</span>
                <button onClick={handleSignOut} className="text-ash hover:text-pearl transition" title="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* ── Right Column: Content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {playbackError && (
            <div className="bg-red-500/15 border-b border-red-500/30 px-4 py-2 text-sm text-red-300 text-center">
              {playbackError}
            </div>
          )}
          <main className="flex-1 overflow-y-auto p-6 relative">
            {/* ── Floating YouTube PIP (top-right, hover to enlarge) ── */}
            {youtubeBlock && (
              <div className="yt-pip-float" style={{
                position: 'sticky', top: 0, float: 'right',
                zIndex: 40, marginLeft: 16, marginBottom: 12,
              }}>
                <div className="yt-pip-container">
                  {youtubeBlock}
                </div>
              </div>
            )}
            <Outlet />
          </main>

          {/* ── Banner Ad Slot (below content, never overlaps video) ── */}
          <div className="shrink-0 border-t border-slate bg-void/60">
            <div className="ad-banner" style={{
              maxWidth: 728, margin: '0 auto', padding: '8px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 60,
            }}>
              {/* Self-promo placeholder — swap to <ins class="adsbygoogle" ... /> for AdSense */}
              <a
                href="https://grizzillaconsulting.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '6px 16px', borderRadius: 8,
                  background: 'linear-gradient(135deg, rgba(255,45,135,.08), rgba(168,255,120,.06))',
                  border: '1px solid rgba(255,45,135,.12)',
                  textDecoration: 'none', color: '#A0A0B8',
                  fontSize: 12, transition: 'border-color .2s, color .2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,45,135,.3)'; e.currentTarget.style.color = '#EDEDF3'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,45,135,.12)'; e.currentTarget.style.color = '#A0A0B8'; }}
              >
                <span style={{ fontFamily: '"Archivo Black", sans-serif', color: '#FF2D87', fontSize: 13 }}>GRIZZILLA</span>
                <span style={{ width: 1, height: 16, background: 'rgba(255,45,135,.15)' }} />
                <span>Digital consulting for creators & brands</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MOBILE LAYOUT — top bar + content + cassette deck + bottom tabs
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen bg-ink text-pearl overflow-hidden">
      {/* Mobile top bar */}
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

      {/* Slide-out menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-void border-r border-slate flex flex-col animate-slide-in">
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LogoMark size={28} />
                <Wordmark size={22} />
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-ash hover:text-pearl transition p-1">
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
            </nav>
            <div className="p-4">
              <button className="w-full flex items-center justify-center gap-2 bg-lime hover:bg-lime-600 text-ink px-4 py-3 rounded-lg text-sm font-bold transition mb-3">
                <Crown className="w-4 h-4" />
                Go Premium
              </button>
              {user && (
                <div className="flex items-center gap-3 px-2 pt-3 border-t border-slate">
                  <div className="w-8 h-8 rounded-full bg-pink flex items-center justify-center text-xs font-bold shrink-0 text-white">
                    {(user.user_metadata?.username?.[0] ?? user.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <span className="text-xs text-silver truncate flex-1">{user.user_metadata?.username || user.email?.split('@')[0] || 'User'}</span>
                  <button onClick={handleSignOut} className="text-ash hover:text-pearl transition" title="Sign out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4">
        <Outlet />
      </main>

      {/* Playback error */}
      {playbackError && (
        <div className="bg-red-500/15 border-t border-red-500/30 px-4 py-2 text-sm text-red-300 text-center shrink-0">
          {playbackError.toLowerCase().includes('spotify')
            ? 'Spotify playback requires a desktop browser. Try YouTube or SoundCloud on mobile.'
            : playbackError
          }
        </div>
      )}

      {/* ── Mobile Banner Ad (above cassette, never overlaps video) ── */}
      <div className="shrink-0 border-t border-slate bg-void/60">
        <div style={{ maxWidth: 320, margin: '0 auto', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50 }}>
          <a
            href="https://grizzillaconsulting.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 12px', borderRadius: 6,
              background: 'linear-gradient(135deg, rgba(255,45,135,.08), rgba(168,255,120,.06))',
              border: '1px solid rgba(255,45,135,.12)',
              textDecoration: 'none', color: '#A0A0B8', fontSize: 11,
            }}
          >
            <span style={{ fontFamily: '"Archivo Black", sans-serif', color: '#FF2D87', fontSize: 11 }}>GRIZZILLA</span>
            <span style={{ width: 1, height: 14, background: 'rgba(255,45,135,.15)' }} />
            <span>Digital consulting</span>
          </a>
        </div>
      </div>

      {/* Cassette Deck — mobile compact, cassette body collapsible, YouTube inside tape window */}
      <CassetteDeck embedBlock={hiddenEmbedBlock} youtubeBlock={youtubeBlock} compact={true} />

      {/* Bottom tab bar */}
      <nav className="flex items-center bg-void border-t border-slate shrink-0 safe-bottom">
        {navItems.filter(n => n.label !== 'Settings').map(({ to, icon: Icon, label, end }) => (
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
    </div>
  );
}
