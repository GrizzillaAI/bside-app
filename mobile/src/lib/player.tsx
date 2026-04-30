// Mixd Mobile — Player context
// Uses expo-av for audio playback. YouTube handled via WebView in the UI layer.
import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { Audio } from 'expo-av';

export interface PlayerTrack {
  id: string;
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
  position: number;        // seconds
  duration: number;        // seconds
  volume: number;          // 0–1
  queue: PlayerTrack[];
  playbackError: string | null;
  /** True when current track uses YouTube iframe (not expo-av) */
  isYouTubeTrack: boolean;

  play: (track: PlayerTrack) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  stop: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  setVolume: (vol: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrev: () => void;
  replaceQueue: (tracks: PlayerTrack[]) => void;
  addToQueue: (track: PlayerTrack) => void;
  /** Called by YouTubePlayer component to sync progress */
  updateYouTubeProgress: (pos: number, dur: number) => void;
  /** Called by YouTubePlayer component on state change */
  handleYouTubeStateChange: (state: string) => void;
}

const PlayerContext = createContext<PlayerState | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const historyRef = useRef<PlayerTrack[]>([]);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const play = useCallback(async (track: PlayerTrack) => {
    setPlaybackError(null);

    // Save current to history for skipPrev
    if (currentTrack) {
      historyRef.current.push(currentTrack);
      if (historyRef.current.length > 50) historyRef.current.shift();
    }

    setCurrentTrack(track);
    setPosition(0);
    setDuration(track.duration_seconds || 0);

    // YouTube and embed-based sources use WebView — no expo-av needed
    if (['youtube', 'tiktok', 'bandcamp'].includes(track.source_platform)) {
      await cleanup();
      setIsPlaying(true);
      return;
    }

    // For Spotify, we need the SDK (mobile uses deep link or WebView)
    if (track.source_platform === 'spotify') {
      await cleanup();
      setIsPlaying(true);
      // Spotify playback will be handled by the Spotify SDK / WebView component
      return;
    }

    // Audio playback via expo-av (SoundCloud, podcasts, direct URLs)
    try {
      await cleanup();
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.audio_url || track.source_url },
        { shouldPlay: true, volume },
        (status) => {
          if (!status.isLoaded) return;
          setPosition(Math.floor((status.positionMillis ?? 0) / 1000));
          setDuration(Math.floor((status.durationMillis ?? 0) / 1000));
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            // Auto-advance queue
            advanceQueue();
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    } catch (err) {
      console.error('Playback error:', err);
      setPlaybackError('Playback failed. Try another track.');
      setIsPlaying(false);
    }
  }, [currentTrack, volume, cleanup]);

  const advanceQueue = useCallback(async () => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      await play(next);
    } else {
      setIsPlaying(false);
    }
  }, [queue, play]);

  const togglePlayPause = useCallback(async () => {
    if (!soundRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
    } else {
      await soundRef.current.playAsync();
    }
  }, [isPlaying]);

  const stop = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.setPositionAsync(0);
    }
    setIsPlaying(false);
    setPosition(0);
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(seconds * 1000);
    }
    setPosition(seconds);
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    setVolumeState(vol);
    if (soundRef.current) {
      await soundRef.current.setVolumeAsync(vol);
    }
  }, []);

  const skipNext = useCallback(async () => {
    await advanceQueue();
  }, [advanceQueue]);

  const skipPrev = useCallback(() => {
    if (historyRef.current.length > 0) {
      const prev = historyRef.current.pop()!;
      if (currentTrack) {
        setQueue((q) => [currentTrack, ...q]);
      }
      play(prev);
    }
  }, [currentTrack, play]);

  const replaceQueue = useCallback((tracks: PlayerTrack[]) => {
    setQueue(tracks);
  }, []);

  const addToQueue = useCallback((track: PlayerTrack) => {
    setQueue((q) => [...q, track]);
  }, []);

  const isYouTubeTrack = currentTrack?.source_platform === 'youtube';

  const updateYouTubeProgress = useCallback((pos: number, dur: number) => {
    setPosition(Math.floor(pos));
    if (dur > 0) setDuration(Math.floor(dur));
  }, []);

  const handleYouTubeStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      advanceQueue();
    } else if (state === 'playing') {
      setIsPlaying(true);
    } else if (state === 'paused') {
      setIsPlaying(false);
    }
  }, [advanceQueue]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack, isPlaying, position, duration, volume, queue, playbackError,
        isYouTubeTrack,
        play, togglePlayPause, stop, seekTo, setVolume, skipNext, skipPrev,
        replaceQueue, addToQueue, updateYouTubeProgress, handleYouTubeStateChange,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

export function formatTime(s: number): string {
  if (!s || !Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
