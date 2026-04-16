// Mixd Global Audio Player Context
// Dispatches between three playback backends:
//   1) HTML Audio element — SoundCloud streams
//   2) Spotify Web Playback SDK — for spotify:track:XXX URIs (Premium users)
//   3) YouTube IFrame Player API — official ToS-compliant video embed

import {
  createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode,
} from 'react';
import {
  playSpotifyTrack, pauseSpotify, resumeSpotify, seekSpotify,
  setSpotifyVolume, onSpotifyStateChanged,
} from './spotify';

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
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  addToQueue: (track: PlayerTrack) => void;
  // YouTube embed callbacks — called by the YouTubeEmbed component
  onYouTubeStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onYouTubeTimeUpdate: (currentTime: number, duration: number) => void;
  onYouTubeReady: () => void;
  youtubeRef: React.MutableRefObject<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>;
}

const PlayerContext = createContext<PlayerState | undefined>(undefined);

type Backend = 'html' | 'spotify' | 'youtube';

function backendFor(track: PlayerTrack): Backend {
  if (track.source_platform === 'spotify') return 'spotify';
  if (track.audio_url?.startsWith('spotify:')) return 'spotify';
  if (track.source_platform === 'youtube') return 'youtube';
  return 'html';
}

export function PlayerProvider({ children }: { children: ReactNode }) {

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendRef = useRef<Backend>('html');
  const spotifyStateCleanupRef = useRef<(() => void) | null>(null);
  const youtubeRef = useRef<{ seek: (s: number) => void; play: () => void; pause: () => void } | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [historyStack, setHistoryStack] = useState<PlayerTrack[]>([]);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  // YouTube embed callbacks — these are called by the YouTubeEmbed component
  const onYouTubeStateChange = useCallback((state: 'playing' | 'paused' | 'ended' | 'buffering') => {
    if (backendRef.current !== 'youtube') return;
    if (state === 'playing') setIsPlaying(true);
    if (state === 'paused') setIsPlaying(false);
    if (state === 'ended') {
      setIsPlaying(false);
      // Use setTimeout to avoid state-update-during-render
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

  // Advance to the next track in the queue.
  const advanceQueue = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) {
        setIsPlaying(false);
        return q;
      }
      const [next, ...rest] = q;
      setTimeout(() => playTrack(next), 0);
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
        setIsPlaying(false);
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
    }
    backendRef.current = nextBackend;

    // Push previous current to history
    setCurrentTrack((prev) => {
      if (prev) setHistoryStack((h) => [prev, ...h.slice(0, 49)]);
      return track;
    });

    if (nextBackend === 'spotify') {
      // Clear YouTube video when switching away
      setYoutubeVideoId(null);
      const ok = await playSpotifyTrack(track.audio_url);
      if (!ok) {
        console.warn('Spotify playback failed — user may not be Premium or not connected');
        setPlaybackError('Spotify playback failed. Make sure you have a Premium account and are connected in Settings.');
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
      setYoutubeVideoId(track.source_id);
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    // HTML audio path (SoundCloud, etc.)
    setYoutubeVideoId(null);
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
    else audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (backendRef.current === 'spotify') resumeSpotify();
    else if (backendRef.current === 'youtube') youtubeRef.current?.play();
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
    advanceQueue();
  }, [advanceQueue]);

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
        play,
        pause,
        resume,
        togglePlayPause,
        seek,
        setVolume,
        skipNext,
        skipPrev,
        addToQueue,
        onYouTubeStateChange,
        onYouTubeTimeUpdate,
        onYouTubeReady,
        youtubeRef,
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
