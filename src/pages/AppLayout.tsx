import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Home, Search, Library, ListMusic, Settings, Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Crown, LogOut } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePlayer, formatTime } from '../lib/player';
import { LogoMark, Wordmark } from '../components/Logo';
import YouTubeEmbed from '../components/YouTubeEmbed';
import SoundCloudEmbed from '../components/SoundCloudEmbed';
import TikTokEmbed from '../components/TikTokEmbed';
import TrackReactions from '../components/TrackReactions';

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
    currentTrack, isPlaying, currentTime, duration, volume, playbackError,
    togglePlayPause, seek, setVolume, skipNext, skipPrev,
    youtubeVideoId, onYouTubeStateChange, onYouTubeTimeUpdate, onYouTubeReady, youtubeRef,
    soundcloudTrackUrl, onSoundCloudStateChange, onSoundCloudTimeUpdate, onSoundCloudReady, soundcloudRef,
    tiktokVideoId, onTikTokStateChange, onTikTokTimeUpdate, onTikTokReady, tiktokRef,
  } = usePlayer();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-ink text-pearl overflow-hidden">
      {/* Sidebar */}
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

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>

        {/* Playback error banner */}
        {playbackError && (
          <div className="bg-red-500/15 border-t border-red-500/30 px-4 py-2 text-sm text-red-300 text-center">
            {playbackError}
          </div>
        )}

        {/* Player bar */}
        <div className="h-20 bg-void border-t border-slate px-6 flex items-center gap-6 shrink-0">
          {/* Track info + embed (YouTube / SoundCloud / thumbnail) */}
          <div className="flex items-center gap-3 w-64 shrink-0">
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
            ) : (
              <div className="w-12 h-12 rounded-lg bg-graphite flex items-center justify-center shrink-0 overflow-hidden">
                {currentTrack?.thumbnail_url ? (
                  <img src={currentTrack.thumbnail_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-5 h-5 text-ash" />
                )}
              </div>
            )}
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
      </div>
    </div>
  );
}
