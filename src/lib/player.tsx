// Mixd Global Audio Player Context
// Dispatches between two playback backends:
//   1) HTML Audio element — YouTube (extracted), SoundCloud streams
//   2) Spotify Web Playback SDK — for spotify:track:XXX URIs (Premium users)
// One shared state surface, so the rest of the UI stays simple.

import {
  createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode,
} from 'react';
import {
  playSpotifyTrack, pauseSpotify, resumeSpotify, seekSpotify,
  setSpotifyVolume, onSpotifyStateChanged,
} from './spotify';

export interface PlayerTrack {
  id?: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  audio_url: string;      // HTML audio URL, OR spotify:track:XXX URI
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
  play: (track: PlayerTrack) => void;
  pause: () => void;
  resume: () => void;
  togglePlayPause: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  addToQueue: (track: PlayerTrack) => void;
}

const PlayerContext = createContext<PlayerState | undefined>(undefined);

type Backend = 'html' | 'spotify';

function backendFor(track: PlayerTrack): Backend {
  if (track.source_platform === 'spotify') return 'spotify';
  if (track.audio_url.startsWith('spotify:')) return 'spotify';
  return 'html';
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const backendRef = useRef<Backend>('html');
  const spotifyStateCleanupRef = useRef<(() => void) | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [historyStack, setHistoryStack] = useState<PlayerTrack[]>([]);

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
        setQueue((q) => {
          if (q.length > 0) {
            const [next, ...rest] = q;
            setTimeout(() => playTrack(next), 0);
            return rest;
          }
          return q;
        });
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
      // Auto-advance from queue on track end (Spotify SDK emits a final state)
      if (state.paused && state.position === 0 && state.duration > 0) {
        setQueue((q) => {
          if (q.length > 0) {
            const [next, ...rest] = q;
            setTimeout(() => playTrack(next), 0);
            return rest;
          }
          return q;
        });
      }
    });
    spotifyStateCleanupRef.current = cleanup;
  }, []);

  const playTrack = useCallback(async (track: PlayerTrack) => {
    const audio = audioRef.current;
    const nextBackend = backendFor(track);

    // Stop the "other" backend when switching
    if (backendRef.current !== nextBackend) {
      if (backendRef.current === 'html') audio?.pause();
      if (backendRef.current === 'spotify') await pauseSpotify();
    }
    backendRef.current = nextBackend;

    // Push current track to history
    setCurrentTrack((prev) => {
      if (prev) setHistoryStack((h) => [prev, ...h.slice(0, 49)]);
      return track;
    });

    if (nextBackend === 'spotify') {
      const ok = await playSpotifyTrack(track.audio_url);
      if (!ok) {
        console.warn('Spotify playback failed — user may not be Premium or not connected');
        setIsPlaying(false);
        return;
      }
      subscribeSpotifyState();
      setDuration(track.duration_seconds);
      setCurrentTime(0);
      setIsPlaying(true);
      return;
    }

    // HTML audio path
    if (!audio) return;
    audio.src = track.audio_url;
    audio.play().catch((e) => console.warn('Playback blocked:', e));
  }, [subscribeSpotifyState]);

  const pause = useCallback(() => {
    if (backendRef.current === 'spotify') pauseSpotify();
    else audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    if (backendRef.current === 'spotify') resumeSpotify();
    else audioRef.current?.play();
  }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    if (backendRef.current === 'spotify') {
      seekSpotify(time * 1000);
    } else if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
    setSpotifyVolume(vol).catch(() => { /* ignore */ });
  }, []);

  const skipNext = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const [next, ...rest] = q;
      playTrack(next);
      return rest;
    });
  }, [playTrack]);

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
        play: playTrack,
        pause,
        resume,
        togglePlayPause,
        seek,
        setVolume,
        skipNext,
        skipPrev,
        addToQueue,
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
