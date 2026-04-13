// B-Side Global Audio Player Context
// Manages audio playback state across the entire app — one audio element, shared everywhere

import { createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode } from 'react';

export interface PlayerTrack {
  id?: string;           // DB track id (if saved)
  title: string;
  artist: string;
  thumbnail_url: string;
  audio_url: string;
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

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.75);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [historyStack, setHistoryStack] = useState<PlayerTrack[]>([]);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.75;
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('durationchange', () => setDuration(audio.duration || 0));
    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      // Auto-play next in queue
      setQueue((q) => {
        if (q.length > 0) {
          const [next, ...rest] = q;
          setTimeout(() => playTrack(next), 0);
          return rest;
        }
        return q;
      });
    });
    audio.addEventListener('play', () => setIsPlaying(true));
    audio.addEventListener('pause', () => setIsPlaying(false));
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playTrack = useCallback((track: PlayerTrack) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Push current track to history
    setCurrentTrack((prev) => {
      if (prev) setHistoryStack((h) => [prev, ...h.slice(0, 49)]);
      return track;
    });

    audio.src = track.audio_url;
    audio.play().catch((e) => console.warn('Playback blocked:', e));
  }, []);

  const pause = useCallback(() => audioRef.current?.pause(), []);
  const resume = useCallback(() => { audioRef.current?.play(); }, []);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) pause();
    else resume();
  }, [isPlaying, pause, resume]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
    if (audioRef.current) audioRef.current.volume = vol;
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
