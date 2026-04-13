// Mixd Global Audio Player Context
// Dispatches between two playback backends:
//   1) HTML Audio element — YouTube (extracted), SoundCloud streams
//   2) Spotify Web Playback SDK — for spotify:track:XXX URIs (Premium users)
//
// Playback Mode integration (Watch / Listen):
//   - Listen mode + device background → YouTube tracks auto-skip via
//     queue-manager.nextPlayableTrack. Skipped entries are pushed to the
//     PlaybackMode context so the UI can show "played while you were away".
//   - Creator attribution events are fired for every skipped track.
//
// This context is designed to be portable: the queue-manager.ts logic is
// framework-agnostic and the platform-specific pieces (HTML audio, Spotify
// Web SDK) are swapped for native equivalents on React Native.

import {
  createContext, useContext, useRef, useState, useCallback, useEffect, ReactNode,
} from 'react';
import {
  playSpotifyTrack, pauseSpotify, resumeSpotify, seekSpotify,
  setSpotifyVolume, onSpotifyStateChanged,
} from './spotify';
import {
  QueueTrack, nextPlayableTrack, attributionEventFromSkip,
} from './queue-manager';
import { usePlaybackMode } from './playbackMode';
import { supabase } from './supabase';

// Compatibility type — the existing app passes "PlayerTrack" objects that
// are a superset of QueueTrack. We accept either and narrow as needed.
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

// Coerce a PlayerTrack into the QueueTrack shape expected by the queue manager
function toQueueTrack(t: PlayerTrack): QueueTrack {
  return {
    id: t.id ?? `${t.source_platform}:${t.source_id}`,
    title: t.title,
    artist: t.artist,
    thumbnail_url: t.thumbnail_url,
    audio_url: t.audio_url,
    duration_seconds: t.duration_seconds,
    source_platform: (t.source_platform as QueueTrack['source_platform']),
    source_id: t.source_id,
    source_url: t.source_url,
  };
}

// Fire an attribution event to the analytics table. Non-blocking, best-effort.
function recordAttributionEvents(events: ReturnType<typeof attributionEventFromSkip>[]) {
  if (events.length === 0) return;
  (async () => {
    try {
      await supabase.from('play_events').insert(
        events.map((e) => ({
          track_id: e.track_id,
          source_platform: e.source_platform,
          source_id: e.source_id,
          event_type: e.event_type,
          playback_mode: e.playback_mode,
          device_state: e.device_state,
          occurred_at: e.occurred_at,
        }))
      );
    } catch {
      // Attribution is best-effort — the UI should not fail if analytics does.
    }
  })();
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { mode, deviceState, pushSkipped, setHaltedForTooManySkips } = usePlaybackMode();

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

  // Live refs so our callbacks always see the latest mode/deviceState
  // without having to be re-memoized on every change.
  const modeRef = useRef(mode);
  const deviceStateRef = useRef(deviceState);
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { deviceStateRef.current = deviceState; }, [deviceState]);

  // Advance to the next playable track under current mode + device state.
  // Any skipped tracks are recorded for attribution + surfaced to the UI.
  const advanceQueue = useCallback(() => {
    setQueue((q) => {
      if (q.length === 0) return q;
      const qt = q.map(toQueueTrack);
      const { track, skipped, remainingQueue, haltReason } =
        nextPlayableTrack(qt, modeRef.current, deviceStateRef.current);

      if (skipped.length > 0) {
        pushSkipped(skipped);
        recordAttributionEvents(
          skipped.map((s) => attributionEventFromSkip(s, modeRef.current))
        );
      }

      if (haltReason === 'too_many_consecutive_skips') {
        setHaltedForTooManySkips(true);
        setIsPlaying(false);
        return q; // Keep the queue intact — user unlocks and unhalts.
      }

      if (!track) {
        setIsPlaying(false);
        return [];
      }

      // Find the original PlayerTrack (preserve any extra fields the queue
      // manager's pure type doesn't know about).
      const idx = q.findIndex(
        (x) => (x.id ?? `${x.source_platform}:${x.source_id}`) === track.id
      );
      const original = idx >= 0 ? q[idx] : q[0];
      setTimeout(() => playTrack(original), 0);
      // Rebuild queue as the remainingQueue, mapped back to PlayerTrack.
      const remainingIds = new Set(remainingQueue.map((r) => r.id));
      return q.filter(
        (x) => remainingIds.has(x.id ?? `${x.source_platform}:${x.source_id}`)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pushSkipped, setHaltedForTooManySkips]);

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

    // Stop the "other" backend when switching
    if (backendRef.current !== nextBackend) {
      if (backendRef.current === 'html') audio?.pause();
      if (backendRef.current === 'spotify') await pauseSpotify();
    }
    backendRef.current = nextBackend;

    // Push previous current to history
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

  // External "play" entrypoint: runs the skip-policy check BEFORE playing.
  // If the track itself should be skipped (e.g., user tapped a YouTube track
  // while already in Listen + background), the manager skips and advances.
  const play = useCallback((track: PlayerTrack) => {
    const qt = toQueueTrack(track);
    const { track: chosen, skipped } = nextPlayableTrack(
      [qt],
      modeRef.current,
      deviceStateRef.current
    );
    if (skipped.length > 0) {
      pushSkipped(skipped);
      recordAttributionEvents(
        skipped.map((s) => attributionEventFromSkip(s, modeRef.current))
      );
    }
    if (chosen) playTrack(track);
  }, [playTrack, pushSkipped]);

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

  // If the currently-playing track is a video-only source and the device
  // just went to background in Listen mode, pause (we don't force-skip
  // the track the user explicitly started, we just halt it). On unfocus
  // back to foreground, the user can resume; the queue-advance logic
  // handles subsequent tracks.
  useEffect(() => {
    if (!currentTrack) return;
    const isVideoOnly = currentTrack.source_platform === 'youtube';
    if (modeRef.current === 'listen' && deviceState !== 'foreground' && isVideoOnly) {
      pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceState, currentTrack]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        currentTime,
        duration,
        volume,
        queue,
        play,
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
