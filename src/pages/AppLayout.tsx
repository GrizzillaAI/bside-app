import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, ListMusic, Settings, Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Crown, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePlayer, formatTime } from '../lib/player';

const navItems = [
  { to: '/app', icon: Home, label: 'Home', end: true },
  { to: '/app/search', icon: Search, label: 'Search' },
  { to: '/app/library', icon: Library, label: 'Library' },
  { to: '/app/playlists', icon: ListMusic, label: 'Playlists' },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, currentTime, duration, volume,
    togglePlayPause, seek, setVolume, skipNext, skipPrev,
  } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex h-screen bg-[#08080C] text-[#EEEEF2] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-[#0E0E14] border-r border-[#FAFAFC]/[0.06] flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-1">
          <span className="font-display text-xl font-bold text-[#FAFAFC]" style={{ letterSpacing: '-0.5px' }}>B<span className="text-[#FF4F2B]">-</span>Side</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive ? 'bg-[#FF4F2B] text-white' : 'text-[#9898AA] hover:bg-[#16161F] hover:text-[#FAFAFC]'
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
                isActive ? 'bg-[#FF4F2B] text-white' : 'text-[#9898AA] hover:bg-[#16161F] hover:text-[#FAFAFC]'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            Settings
          </NavLink>
          <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#6930FF] to-[#7C4DFF] hover:opacity-90 px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 mb-2 text-white">
            <Crown className="w-4 h-4" />
            Upgrade to Premium
          </button>
          {user && (
            <div className="flex items-center gap-3 px-2 pt-3 border-t border-[#FAFAFC]/[0.06]">
              <div className="w-8 h-8 rounded-full bg-[#FF4F2B] flex items-center justify-center text-xs font-bold shrink-0 text-white">
                {(user.email?.[0] ?? 'U').toUpperCase()}
              </div>
              <span className="text-xs text-[#9898AA] truncate flex-1">{user.email}</span>
              <button onClick={handleSignOut} className="text-[#5A5A72] hover:text-[#FAFAFC] transition" title="Sign out">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>

        {/* Player bar */}
        <div className="h-20 bg-[#0E0E14] border-t border-[#FAFAFC]/[0.06] px-6 flex items-center gap-6 shrink-0">
          {/* Track info */}
          <div className="flex items-center gap-3 w-64 shrink-0">
            <div className="w-12 h-12 rounded-lg bg-[#16161F] flex items-center justify-center shrink-0 overflow-hidden">
              {currentTrack?.thumbnail_url ? (
                <img src={currentTrack.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music className="w-5 h-5 text-[#5A5A72]" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate text-[#FAFAFC]">
                {currentTrack?.title ?? 'No track playing'}
              </p>
              <p className="text-xs text-[#5A5A72] truncate">
                {currentTrack?.artist ?? 'Search or paste a link to start'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-4">
              <button onClick={skipPrev} className="text-[#5A5A72] hover:text-[#FAFAFC] transition">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlayPause}
                disabled={!currentTrack}
                className="w-10 h-10 rounded-full bg-[#FF4F2B] flex items-center justify-center hover:bg-[#FF6B4A] hover:scale-105 transition disabled:opacity-40"
              >
                {isPlaying
                  ? <Pause className="w-5 h-5 text-white" />
                  : <Play className="w-5 h-5 text-white ml-0.5" />
                }
              </button>
              <button onClick={skipNext} className="text-[#5A5A72] hover:text-[#FAFAFC] transition">
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 w-full max-w-md">
              <span className="text-xs text-[#5A5A72] w-10 text-right font-mono">{formatTime(currentTime)}</span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-[#5A5A72] w-10 font-mono">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-36 shrink-0">
            <button
              onClick={() => setVolume(volume > 0 ? 0 : 0.75)}
              className="text-[#5A5A72] hover:text-[#FAFAFC] transition"
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
    </div>
  );
}
