// Mixd Global Audio Player Context
// Dispatches between five playback backends:
//   1) HTML Audio element — fallback
//   2) Spotify Web Playback SDK — for spotify:track:XXX URIs (Premium users)
//   3) YouTube IFrame Player API — official ToS-compliant video embed
//   4) SoundCloud Widget API — official iframe-based player
//   5) TikTok Embed Player API — official iframe-based player

import {
  createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode,
} from 'react';
import {
  playSpotifyTrack, pauseSpotify, resumeSpotify, seekSpotify,
  setSpotifyVolume, onSpotifyStateChanged,
} from './spotify';
import { logB3Event } from './api';

// Compatibility type — the existing app passes "PlayerTrack" objects that
// are a superset of QueueTrack. We accept either and narrow as needed.
export interface PlayerTrack {
  id?: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  audio_url: string;      // HTML audio URL, spotify:track:XXX URI, or empty for YouTube
  duration_seconds: number;
  source_platform: string;
  source_id: string;
  source_url: string;
}

interface PlayerState {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: PlayerTrack[];
  playbackError: string | null;
  // YouTube embed state — exposed so AppLayout can render the embed
  youtubeVideoId: string | null;
  // SoundCloud embed state — exposed so AppLayout can render the embed
  soundcloudTrackUrl: string | null;
  // TikTok embed state — exposed so AppLayout can render the embed
  tiktokVideoId: string | null;
  // Bandcamp embed state — exposed so AppLayout can render the embed
  bandcampEmbedUrl: string | null;
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  addToQueue: (track: PlayerTrack) => void;
  replaceQueue: (tracks: PlayerTrack[]) => void;
  // YouTube embed callbacks — called by the YouTubeEmbed component
  onYouTubeStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onYouTubeTimeUpdate: (currentTime: number, duration: number) => void;
  onYouTubeReady: () => void;
  youtubeRef: React.MutableRefObject<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>;
  // SoundCloud embed callbacks — called by the SoundCloudEmbed component
  onSoundCloudStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onSoundCloudTimeUpdate: (currentTime: number, duration: number) => void;
  onSoundCloudReady: () => void;
  soundcloudRef: React.MutableRefObject<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>;
  // TikTok embed callbacks — called by the TikTokEmbed component
  onTikTokStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onTikTokTimeUpdate: (currentTime: number, duration: number) => void;
  onTikTokReady: () => void;
  tiktokRef: React.MutableRefObject<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>;
  // Bandcamp embed ref (no-op — Bandcamp embed has no JS API)
  bandcampRef: React.MutableRefObject<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>;
}

const PlayerContext = createContext<PlayerState | undefined>(undefined);

type Backend = 'html' | 'spotify' | 'youtube' | 'soundcloud' | 'tiktok' | 'bandcamp';

function backendFor(track: PlayerTrack): Backend {
  if (track.source_platform === 'spotify') return 'spotify';
  if (track.audio_url?.startsWith('spotify:')) return 'spotify';
  if (track.source_platform === 'youtube') return 'youtube';
  if (track.source_platform === 'soundcloud') return 'soundcloud';
  if (track.source_platform === 'tiktok') return 'tiktok';
  if (track.source_platform === 'bandcamp') return 'bandcamp';
  return 'html';
}

export function PlayerProvider({ children }: { children: ReactNode }) {

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendRef = useRef<Backend>('html');
  const spotifyStateCleanupRef = useRef<(() => void) | null>(null);
  const youtubeRef = useRef<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>(null);
  const soundcloudRef = useRef<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>(null);
  const tiktokRef = useRef<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>(null);
  const bandcampRef = useRef<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [historyStack, setHistoryStack] = useState<PlayerTrack[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [soundcloudTrackUrl, setSoundcloudTrackUrl] = useState<string | null>(null);
  const [tiktokVideoId, setTiktokVideoId] = useState<string | null>(null);
  const [bandcampEmbedUrl, setBandcampEmbedUrl] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // YouTube embed callbacks — these are called by the YouTubeEmbed component
  const onYouTubeStateChange = useCallback((state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    if (backendRef.current !== 'youtube') return;
    if (state === 'playing') setIsPlaying(true);
    if (state === 'paused') setIsPlaying(false);
    if (state === 'ended') {
      // Don't flicker to paused if there's a next track — advance immediately
      setTimeout(() => advanceQueue(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onYouTubeTimeUpdate = useCallback((time: number, dur: number) => {
    if (backendRef.current !== 'youtube') return;
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const onYouTubeReady = useCallback(() => {
    // Player is initialized and ready to accept commands
  }, []);

  // SoundCloud embed callbacks — these are called by the SoundCloudEmbed component
  const onSoundCloudStateChange = useCallback((state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    if (backendRef.current !== 'soundcloud') return;
    if (state === 'playing') setIsPlaying(true);
    if (state === 'paused') setIsPlaying(false);
    if (state === 'ended') {
      setTimeout(() => advanceQueue(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSoundCloudTimeUpdate = useCallback((time: number, dur: number) => {
    if (backendRef.current !== 'soundcloud') return;
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const onSoundCloudReady = useCallback(() => {
    // Widget is initialized and ready to accept commands
  }, []);

  // TikTok embed callbacks — these are called by the TikTokEmbed component
  const onTikTokStateChange = useCallback((state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    if (backendRef.current !== 'tiktok') return;
    if (state === 'playing') setIsPlaying(true);
    if (state === 'paused') setIsPlaying(false);
    if (state === 'ended') {
      setTimeout(() => advanceQueue(), 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onTikTokTimeUpdate = useCallback((time: number, dur: number) => {
    if (backendRef.current !== 'tiktok') return;
    setCurrentTime(time);
    setDuration(dur);
  }, []);

  const onTikTokReady = useCallback(() => {
    // Player is initialized and ready to accept commands
  }, []);

  // Advance to the next track in the queue.
  // Keeps isPlaying=true during transitions so the UI doesn't flicker.
  // Also logs play.completed for the track that just ended.
  const advanceQueue = useCallback(() => {
    // B3: log play.completed for the current track (fire-and-forget)
    setCurrentTrack((ct) => {
      if (ct) {
        logB3Event('play.completed', {
          source_platform: ct.source_platform,
          source_id: ct.source_id,
          title: ct.title,
        });
      }
      return ct; // don't change the value — just reading it
    });
    setQueue((q) => {
      if (q.length === 0) {
        setIsPlaying(false);
        return q;
      }
      const [next, ...rest] = q;
      // Play next track immediately — no pause gap
      playTrack(next);
      return rest;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create HTML audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.75;
    audio.addEventListener('timeupdate', () => {
      if (backendRef.current === 'html') setCurrentTime(audio.currentTime);
    });
    audio.addEventListener('durationchange', () => {
      if (backendRef.current === 'html') setDuration(audio.duration || 0);
    });
    audio.addEventListener('ended', () => {
      if (backendRef.current === 'html') {
        advanceQueue();
      }
    });
    audio.addEventListener('play', () => {
      if (backendRef.current === 'html') setIsPlaying(true);
    });
    audio.addEventListener('pause', () => {
      if (backendRef.current === 'html') setIsPlaying(false);
    });
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
      spotifyStateCleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to Spotify SDK state changes when backend is spotify
  const subscribeSpotifyState = useCallback(() => {
    spotifyStateCleanupRef.current?.();
    const cleanup = onSpotifyStateChanged((state: any) => {
      if (!state) return;
      setIsPlaying(!state.paused);
      setCurrentTime((state.position ?? 0) / 1000);
      setDuration((state.duration ?? 0) / 1000);
      // Auto-advance on Spotify track end (SDK emits a final paused-at-0 state)
      if (state.paused && state.position === 0 && state.duration > 0) {
        advanceQueue();
      }
    });
    spotifyStateCleanupRef.current = cleanup;
  }, [advanceQueue]);

  const playTrack = useCallback(async (track: PlayerTrack) => {
    const audio = audioRef.current;
    const nextBackend = backendFor(track);
    setPlaybackError(null);

    // Stop the "other" backend(s) when switching
    if (backendRef.current !== nextBackend) {
      if (backendRef.current === 'html') audio?.pause();
      if (backendRef.current === 'spotify') await pauseSpotify();
      if (backendRef.current === 'youtube') youtubeRef.current?.pause();
      if (backendRef.current === 'soundcloud') soundcloudRef.current?.pause();
      if (backendRef.current === 'tiktok') tiktokRef.current?.pause();
      if (backendRef.current === 'bandcamp') bandcampRef.current?.pause();
    }
    backendRef.current = nextBackend;

    // Push previous current to history
    setCurrentTrack((prev) => {
      if (prev) setHistoryStack((h) => [prev, ...h.slice(0, 49)]);
      return track;
    });

    // B3: log play.started event (fire-and-forget)
    logB3Event('play.started', {
      source_platform: track.source_platform,
      source_id: track.source_id,
      title: track.title,
    });

    if (nextBackend === 'spotify') {
      // Clear other embeds when switching away
      setYoutubeVideoId(null);
      setSoundcloudTrackUrl(null);
      setTiktokVideoId(null);
      setBandcampEmbedUrl(null);
      const result = await playSpotifyTrack(track.audio_url);
      if (!result.ok) {
        console.warn('Spotify playback failed:', result.reason);
        setPlaybackError(`Spotify: ${result.reason}`);
        setIsPlaying(false);
        return;
      }
      subscribeSpotifyState();
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (nextBackend === 'youtube') {
      // Set the video ID — the YouTubeEmbed component will handle playback
      setSoundcloudTrackUrl(null);
      setTiktokVideoId(null);
      setBandcampEmbedUrl(null);
      setYoutubeVideoId(track.source_id);
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (nextBackend === 'soundcloud') {
      // Set the track permalink URL — the SoundCloudEmbed component will handle playback
      setYoutubeVideoId(null);
      setTiktokVideoId(null);
      setBandcampEmbedUrl(null);
      setSoundcloudTrackUrl(track.source_url);
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (nextBackend === 'tiktok') {
      // Set the video ID — the TikTokEmbed component will handle playback
      setYoutubeVideoId(null);
      setSoundcloudTrackUrl(null);
      setBandcampEmbedUrl(null);
      setTiktokVideoId(track.source_id);
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    if (nextBackend === 'bandcamp') {
      // Bandcamp: build the embed URL from source_id (format: "track:12345" or "album:12345")
      setYoutubeVideoId(null);
      setSoundcloudTrackUrl(null);
      setTiktokVideoId(null);
      const [embedType, embedId] = (track.source_id || '').split(':');
      const bcUrl = `https://bandcamp.com/EmbeddedPlayer/${embedType}=${embedId}/size=small/bgcol=0B0B12/linkcol=FF2D87/transparent=true/`;
      setBandcampEmbedUrl(bcUrl);
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true); // Bandcamp auto-plays in embed
      return;
    }

    // HTML audio path (fallback — podcast, applemusic, etc.)
    setYoutubeVideoId(null);
    setSoundcloudTrackUrl(null);
    setTiktokVideoId(null);
    setBandcampEmbedUrl(null);
    if (!audio) return;
    audio.src = track.audio_url;
    audio.play().catch((e) => console.warn('Playback blocked:', e));
  }, [subscribeSpotifyState]);

  // External "play" entrypoint — directly starts playback of the given track.
  const play = useCallback((track: PlayerTrack) => {
    playTrack(track);
  }, [playTrack]);

  const pause = useCallback(() => {
    if (backendRef.current === 'spotify') pauseSpotify();
    else if (backendRef.current === 'youtube') youtubeRef.current?.pause();
    else if (backendRef.current === 'soundcloud') soundcloudRef.current?.pause();
    else if (backendRef.current === 'tiktok') tiktokRef.current?.pause();
    else if (backendRef.current === 'bandcamp') bandcampRef.current?.pause();
    else audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (backendRef.current === 'spotify') resumeSpotify();
    else if (backendRef.current === 'youtube') youtubeRef.current?.play();
    else if (backendRef.current === 'soundcloud') soundcloudRef.current?.play();
    else if (backendRef.current === 'tiktok') tiktokRef.current?.play();
    else if (backendRef.current === 'bandcamp') bandcampRef.current?.play();
    else audioRef.current?.play();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    if (backendRef.current === 'spotify') {
      seekSpotify(time * 1000);
    } else if (backendRef.current === 'youtube') {
      youtubeRef.current?.seek(time);
    } else if (backendRef.current === 'soundcloud') {
      soundcloudRef.current?.seek(time);
    } else if (backendRef.current === 'tiktok') {
      tiktokRef.current?.seek(time);
    } else if (backendRef.current === 'bandcamp') {
      bandcampRef.current?.seek(time);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    setSpotifyVolume(vol).catch(() => { /* ignore */ });
    // YouTube volume is synced via the YouTubeEmbed prop
  }, []);

  const skipNext = useCallback(() => {
    // B3: log skip event
    if (currentTrack) {
      logB3Event('play.skipped', {
        source_platform: currentTrack.source_platform,
        source_id: currentTrack.source_id,
        title: currentTrack.title,
        position_seconds: currentTime,
      });
    }
    advanceQueue();
  }, [advanceQueue, currentTrack, currentTime]);

  const skipPrev = useCallback(() => {
    setHistoryStack((h) => {
      if (h.length === 0) return h;
      const [prev, ...rest] = h;
      playTrack(prev);
      return rest;
    });
  }, [playTrack]);

  const addToQueue = useCallback((track: PlayerTrack) => {
    setQueue((q) => [...q, track]);
  }, []);

  const replaceQueue = useCallback((tracks: PlayerTrack[]) => {
    setQueue(tracks);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        playbackError,
        youtubeVideoId,
        soundcloudTrackUrl,
        tiktokVideoId,
        bandcampEmbedUrl,
        play,
        pause,
        resume,
        togglePlayPause,
        seek,
        setVolume,
        skipNext,
        skipPrev,
        addToQueue,
        replaceQueue,
        onYouTubeStateChange,
        onYouTubeTimeUpdate,
        onYouTubeReady,
        youtubeRef,
        onSoundCloudStateChange,
        onSoundCloudTimeUpdate,
        onSoundCloudReady,
        soundcloudRef,
        onTikTokStateChange,
        onTikTokTimeUpdate,
        onTikTokReady,
        tiktokRef,
        bandcampRef,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
}

/** Format seconds to mm:ss or h:mm:ss */
export function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
