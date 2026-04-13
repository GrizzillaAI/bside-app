// Playback Mode context — wraps the pure queue-manager logic with React
// state + browser-specific visibility detection. On React Native mobile
// this file will be replaced by a version that listens to AppState and
// KeyguardManager; the queue-manager.ts policy logic remains unchanged.

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode,
} from 'react';
import {
  PlaybackMode,
  DeviceState,
  SkippedEntry,
  defaultModeForPlatform,
} from './queue-manager';
import { supabase } from './supabase';

interface PlaybackModeContextValue {
  mode: PlaybackMode;
  deviceState: DeviceState;
  setMode: (m: PlaybackMode) => void;
  toggleMode: () => void;

  skippedWhileAway: SkippedEntry[];
  pushSkipped: (entries: SkippedEntry[]) => void;
  clearSkipped: () => void;

  haltedForTooManySkips: boolean;
  setHaltedForTooManySkips: (v: boolean) => void;
}

const PlaybackModeContext = createContext<PlaybackModeContextValue | undefined>(undefined);

const STORAGE_KEY = 'mixd.playback_mode';

function loadPersistedMode(): PlaybackMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'watch' || stored === 'listen') return stored;
  } catch { /* ignore */ }
  return defaultModeForPlatform('web');
}

export function PlaybackModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<PlaybackMode>(loadPersistedMode);
  const [deviceState, setDeviceState] = useState<DeviceState>('foreground');
  const [skippedWhileAway, setSkippedWhileAway] = useState<SkippedEntry[]>([]);
  const [haltedForTooManySkips, setHaltedForTooManySkips] = useState(false);

  // Persist mode choice locally + remotely (best effort)
  const setMode = useCallback((m: PlaybackMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
    // Fire-and-forget remote save so the choice syncs across devices.
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase
          .from('profiles')
          .update({ preferred_playback_mode: m })
          .eq('id', user.id);
      } catch { /* non-fatal — local pref still works */ }
    })();
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'watch' ? 'listen' : 'watch');
  }, [mode, setMode]);

  const pushSkipped = useCallback((entries: SkippedEntry[]) => {
    if (entries.length === 0) return;
    setSkippedWhileAway((prev) => [...entries, ...prev].slice(0, 50));
  }, []);

  const clearSkipped = useCallback(() => {
    setSkippedWhileAway([]);
    setHaltedForTooManySkips(false);
  }, []);

  // Device state detection — web uses Page Visibility API.
  // On mobile (RN) this effect is replaced with AppState + KeyguardManager.
  useEffect(() => {
    const compute = (): DeviceState => {
      if (typeof document === 'undefined') return 'foreground';
      return document.visibilityState === 'hidden' ? 'background' : 'foreground';
    };
    setDeviceState(compute());

    const handler = () => setDeviceState(compute());
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('blur', handler);
    window.addEventListener('focus', handler);

    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('blur', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);

  // Load server-side mode preference after auth settles (best effort)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('profiles')
          .select('preferred_playback_mode')
          .eq('id', user.id)
          .single();
        const remote = data?.preferred_playback_mode as PlaybackMode | undefined;
        if (remote === 'watch' || remote === 'listen') {
          setModeState(remote);
          try { localStorage.setItem(STORAGE_KEY, remote); } catch { /* ignore */ }
        }
      } catch { /* ignore — profile column may not exist yet */ }
    })();
  }, []);

  return (
    <PlaybackModeContext.Provider
      value={{
        mode,
        deviceState,
        setMode,
        toggleMode,
        skippedWhileAway,
        pushSkipped,
        clearSkipped,
        haltedForTooManySkips,
        setHaltedForTooManySkips,
      }}
    >
      {children}
    </PlaybackModeContext.Provider>
  );
}

export function usePlaybackMode() {
  const ctx = useContext(PlaybackModeContext);
  if (!ctx) throw new Error('usePlaybackMode must be used within a PlaybackModeProvider');
  return ctx;
}
