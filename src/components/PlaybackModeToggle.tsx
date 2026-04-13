// Compact 2-state toggle between Watch and Listen playback modes.
// Drop anywhere — header, now-playing strip, settings screen.

import { Eye, Headphones } from 'lucide-react';
import { usePlaybackMode } from '../lib/playbackMode';

interface PlaybackModeToggleProps {
  compact?: boolean;
  className?: string;
}

export default function PlaybackModeToggle({
  compact = false,
  className = '',
}: PlaybackModeToggleProps) {
  const { mode, setMode } = usePlaybackMode();

  const baseBtn =
    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors';
  const active = 'bg-white text-[#050509]';
  const inactive = 'text-white/70 hover:text-white';

  return (
    <div
      className={`inline-flex items-center rounded-lg border border-white/10 bg-white/5 p-0.5 ${className}`}
      role="radiogroup"
      aria-label="Playback mode"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'watch'}
        onClick={() => setMode('watch')}
        className={`${baseBtn} ${mode === 'watch' ? active : inactive}`}
        title="Watch mode — video plays when available. On mobile, YouTube pauses when screen locks."
      >
        <Eye className="h-3.5 w-3.5" />
        {!compact && <span>Watch</span>}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'listen'}
        onClick={() => setMode('listen')}
        className={`${baseBtn} ${mode === 'listen' ? active : inactive}`}
        title="Listen mode — audio-first. YouTube tracks are auto-skipped when screen locks so the queue keeps flowing."
      >
        <Headphones className="h-3.5 w-3.5" />
        {!compact && <span>Listen</span>}
      </button>
    </div>
  );
}
