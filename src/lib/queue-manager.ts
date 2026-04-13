// @mixd/queue-manager (inlined for now — will extract to shared package)
// =========================================================================
// Pure TypeScript — no React, no DOM, no platform SDKs. Runs in Node, web,
// React Native, anywhere. Encodes the playback policy:
//
//   - Watch mode: every track plays via its native player. YouTube visible.
//   - Listen mode: non-YouTube tracks play normally. YouTube tracks are
//     auto-skipped when device is locked/backgrounded, because YouTube's
//     SDK + platform rules disallow audio-only background playback.
//
// Creator attribution is preserved: skipped YouTube tracks are recorded
// as "included plays" with a 'skipped-on-lock' flag so creators still get
// credit in analytics.
// =========================================================================

export type PlaybackMode = 'watch' | 'listen';
export type DeviceState = 'foreground' | 'background' | 'locked';

export type TrackSource =
  | 'youtube'
  | 'spotify'
  | 'soundcloud'
  | 'applemusic'
  | 'tiktok'
  | 'podcast';

export interface QueueTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail_url: string;
  audio_url: string;
  duration_seconds: number;
  source_platform: TrackSource;
  source_id: string;
  source_url: string;
}

export interface SkippedEntry {
  track: QueueTrack;
  reason: 'mode_listen_background_youtube';
  skippedAt: number; // epoch ms
}

export type SkipDecisionReason =
  | 'mode_listen_background_youtube';

export interface PlayDecision {
  action: 'play';
  track: QueueTrack;
}

export interface SkipDecision {
  action: 'skip';
  track: QueueTrack;
  reason: SkipDecisionReason;
}

export type Decision = PlayDecision | SkipDecision;

/**
 * Sources that require a visible player surface and cannot play
 * audio-only in the background. Currently just YouTube. Add here
 * if future sources (e.g., TikTok) enforce the same restriction.
 */
export const VIDEO_ONLY_SOURCES: ReadonlySet<TrackSource> = new Set<TrackSource>([
  'youtube',
]);

/**
 * Core policy decision: given a track, the current mode, and the device
 * state, should we play it or skip it?
 */
export function decidePlayback(
  track: QueueTrack,
  mode: PlaybackMode,
  deviceState: DeviceState
): Decision {
  const isVideoOnly = VIDEO_ONLY_SOURCES.has(track.source_platform);
  const deviceCantShowVideo = deviceState !== 'foreground';

  if (mode === 'listen' && isVideoOnly && deviceCantShowVideo) {
    return {
      action: 'skip',
      track,
      reason: 'mode_listen_background_youtube',
    };
  }

  return { action: 'play', track };
}

/**
 * Walk the queue from the start and find the next track we should
 * actually play under the current mode + device state. Any tracks
 * passed over along the way are returned as skipped entries so the
 * UI can show "played while you were away" and attribution can be
 * recorded.
 */
export function nextPlayableTrack(
  queue: QueueTrack[],
  mode: PlaybackMode,
  deviceState: DeviceState,
  maxConsecutiveSkips = 3
): {
  track: QueueTrack | null;
  skipped: SkippedEntry[];
  remainingQueue: QueueTrack[];
  haltReason?: 'too_many_consecutive_skips';
} {
  const skipped: SkippedEntry[] = [];
  let i = 0;

  while (i < queue.length) {
    const candidate = queue[i];
    const decision = decidePlayback(candidate, mode, deviceState);

    if (decision.action === 'play') {
      return {
        track: candidate,
        skipped,
        remainingQueue: queue.slice(i + 1),
      };
    }

    // It's a skip. Record it.
    skipped.push({
      track: candidate,
      reason: decision.reason,
      skippedAt: Date.now(),
    });

    // Halt condition: if we've skipped too many consecutively, stop and
    // surface a prompt to the user instead of walking the entire queue.
    if (skipped.length >= maxConsecutiveSkips) {
      return {
        track: null,
        skipped,
        remainingQueue: queue.slice(i + 1),
        haltReason: 'too_many_consecutive_skips',
      };
    }

    i++;
  }

  return {
    track: null,
    skipped,
    remainingQueue: [],
  };
}

/**
 * Given a track about to be played "normally" (no skip), is it something
 * we can keep playing if the device transitions to background/locked?
 * Used for proactive pause decisions when the device state changes mid-track.
 */
export function canContinueInBackground(track: QueueTrack, mode: PlaybackMode): boolean {
  if (mode === 'watch') {
    // Watch mode: non-video sources continue fine. Video sources pause
    // by platform rule, but we don't "skip" them — just pause until foreground.
    return !VIDEO_ONLY_SOURCES.has(track.source_platform);
  }
  // Listen mode: same rule — only video-only sources are blocked.
  return !VIDEO_ONLY_SOURCES.has(track.source_platform);
}

/**
 * Attribution record for a skipped track. This is what gets sent to
 * the creator analytics pipeline so creators get credit for being
 * in a playlist even when their track was auto-skipped on a locked screen.
 */
export interface AttributionEvent {
  track_id: string;
  source_platform: TrackSource;
  source_id: string;
  event_type: 'full_play' | 'skipped_on_lock' | 'user_skipped';
  playback_mode: PlaybackMode;
  device_state: DeviceState;
  occurred_at: string; // ISO 8601
}

export function attributionEventFromSkip(entry: SkippedEntry, mode: PlaybackMode): AttributionEvent {
  return {
    track_id: entry.track.id,
    source_platform: entry.track.source_platform,
    source_id: entry.track.source_id,
    event_type: 'skipped_on_lock',
    playback_mode: mode,
    device_state: 'background', // we only skip when not-foreground
    occurred_at: new Date(entry.skippedAt).toISOString(),
  };
}

/**
 * Default mode per platform. Web defaults to Watch because browsers
 * generally handle background tabs predictably. Mobile native defaults
 * to Listen because screen locks are the common interruption.
 */
export function defaultModeForPlatform(platform: 'web' | 'ios' | 'android'): PlaybackMode {
  return platform === 'web' ? 'watch' : 'listen';
}
