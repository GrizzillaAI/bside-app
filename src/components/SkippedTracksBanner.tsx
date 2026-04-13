// Shown at the top of the app when YouTube tracks were auto-skipped while
// the screen was off / tab was in the background. Clicking "Play them now"
// inserts the skipped tracks at the head of the queue for the user to catch up on.
//
// Also handles the "too many consecutive skips" halt state — when 3+ video-only
// tracks in a row hit the Listen-mode skip rule, playback halts and this banner
// becomes a call to action rather than a passive notice.

import { X, PlayCircle, AlertTriangle } from 'lucide-react';
import { usePlaybackMode } from '../lib/playbackMode';
import { usePlayer } from '../lib/player';

export default function SkippedTracksBanner() {
  const {
    skippedWhileAway,
    clearSkipped,
    haltedForTooManySkips,
    setHaltedForTooManySkips,
  } = usePlaybackMode();
  const { addToQueue, play } = usePlayer();

  if (skippedWhileAway.length === 0 && !haltedForTooManySkips) return null;

  const count = skippedWhileAway.length;

  const handlePlayNow = () => {
    if (skippedWhileAway.length === 0) return;
    const [first, ...rest] = skippedWhileAway;
    rest.reverse().forEach((s) => addToQueue({
      ...s.track,
      source_platform: s.track.source_platform,
    }));
    play({
      id: first.track.id,
      title: first.track.title,
      artist: first.track.artist,
      thumbnail_url: first.track.thumbnail_url,
      audio_url: first.track.audio_url,
      duration_seconds: first.track.duration_seconds,
      source_platform: first.track.source_platform,
      source_id: first.track.source_id,
      source_url: first.track.source_url,
    });
    clearSkipped();
  };

  const handleDismiss = () => {
    clearSkipped();
    setHaltedForTooManySkips(false);
  };

  if (haltedForTooManySkips) {
    return (
      <div
        role="alert"
        className="flex items-center gap-3 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1">
          <strong className="font-semibold">Playback paused — </strong>
          your queue has several video tracks in a row. Switch to Watch mode or
          unlock your screen to continue.
        </div>
        {count > 0 && (
          <button
            type="button"
            onClick={handlePlayNow}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-200 px-3 py-1 font-medium text-amber-900 hover:bg-amber-100"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            Play {count} skipped
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="rounded p-1 hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-white/10 bg-[#1F3DFF]/15 px-4 py-2.5 text-sm text-white"
    >
      <div className="h-2 w-2 shrink-0 rounded-full bg-[#DAFF00]" />
      <div className="flex-1">
        <strong className="font-semibold">{count} video {count === 1 ? 'track was' : 'tracks were'} skipped</strong>{' '}
        <span className="text-white/70">while your screen was off. Creators still got credit.</span>
      </div>
      <button
        type="button"
        onClick={handlePlayNow}
        className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1 font-medium text-[#050509] hover:bg-white/90"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        Play them now
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleDismiss}
        className="rounded p-1 hover:bg-white/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
