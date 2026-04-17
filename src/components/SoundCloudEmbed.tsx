// SoundCloudEmbed — Persistent SoundCloud Widget player for the Mixd player bar.
//
// Uses the official SoundCloud Widget API (iframe + JS API) for playback.
// On mobile (iOS Safari), programmatic play() calls are blocked by autoplay
// policy, so the widget auto-expands to expose SoundCloud's native play button.

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── Types for the SoundCloud Widget API ──────────────────────────────────
interface SCWidget {
  bind: (event: string, cb: (...args: any[]) => void) => void;
  unbind: (event: string) => void;
  load: (url: string, options?: Record<string, any>) => void;
  play: () => void;
  pause: () => void;
  seekTo: (ms: number) => void;
  setVolume: (vol: number) => void; // 0-100
  getPosition: (cb: (pos: number) => void) => void;
  getDuration: (cb: (dur: number) => void) => void;
  isPaused: (cb: (paused: boolean) => void) => void;
}

interface SCWidgetAPI {
  (iframe: HTMLIFrameElement): SCWidget;
  Events: {
    READY: string;
    PLAY: string;
    PAUSE: string;
    FINISH: string;
    PLAY_PROGRESS: string;
    LOAD_PROGRESS: string;
    ERROR: string;
  };
}

declare global {
  interface Window {
    SC?: { Widget: SCWidgetAPI };
  }
}

// ── Script loader (singleton) ───────────────────────────────────────────
let apiLoadPromise: Promise<void> | null = null;

function loadSoundCloudAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  if (window.SC?.Widget) return Promise.resolve();

  apiLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load SoundCloud Widget API'));
    document.body.appendChild(script);
  });
  return apiLoadPromise;
}

/** Simple mobile check — touch device + small screen */
function isMobileDevice(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

// ── Component ───────────────────────────────────────────────────────────
export interface SoundCloudEmbedProps {
  trackUrl: string | null;          // SoundCloud permalink URL
  isPlaying: boolean;
  volume: number;                   // 0-1
  onStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onReady: () => void;
}

export interface SoundCloudEmbedRef {
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

const SoundCloudEmbed = forwardRef<SoundCloudEmbedRef, SoundCloudEmbedProps>(
  ({ trackUrl, isPlaying, volume, onStateChange, onTimeUpdate, onReady }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const widgetRef = useRef<SCWidget | null>(null);
    const [apiReady, setApiReady] = useState(false);
    const [widgetReady, setWidgetReady] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
    const currentUrlRef = useRef<string | null>(null);
    const mobile = isMobileDevice();

    // Expose imperative methods to parent
    useImperativeHandle(ref, () => ({
      seek(seconds: number) {
        widgetRef.current?.seekTo(seconds * 1000);
      },
      play() {
        widgetRef.current?.play();
      },
      pause() {
        widgetRef.current?.pause();
      },
    }));

    // Load the Widget API script on mount
    useEffect(() => {
      loadSoundCloudAPI().then(() => setApiReady(true)).catch((err) => {
        console.error('SoundCloud API load failed:', err);
      });
    }, []);

    // Initialize the widget once API is loaded and iframe exists
    useEffect(() => {
      if (!apiReady || !iframeRef.current || !window.SC?.Widget) return;
      if (widgetRef.current) return;

      const widget = window.SC.Widget(iframeRef.current);
      widgetRef.current = widget;

      const Events = window.SC.Widget.Events;

      widget.bind(Events.READY, () => {
        setWidgetReady(true);
        widget.setVolume(Math.round(volume * 100));
        onReady();
      });

      widget.bind(Events.PLAY, () => {
        onStateChange('playing');
        // Once SC starts playing, collapse the widget on mobile
        if (!hasPlayedOnce) setHasPlayedOnce(true);
        if (mobile) setExpanded(false);
      });

      widget.bind(Events.PAUSE, () => {
        onStateChange('paused');
      });

      widget.bind(Events.FINISH, () => {
        onStateChange('ended');
      });

      widget.bind(Events.PLAY_PROGRESS, (data: any) => {
        const currentMs = data?.currentPosition ?? 0;
        widget.getDuration((durMs: number) => {
          onTimeUpdate(currentMs / 1000, durMs / 1000);
        });
      });

      widget.bind(Events.ERROR, () => {
        console.warn('SoundCloud Widget error');
      });

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiReady]);

    // Load new track when trackUrl changes
    useEffect(() => {
      if (!widgetRef.current || !trackUrl) return;
      if (currentUrlRef.current === trackUrl) return;
      currentUrlRef.current = trackUrl;
      setHasPlayedOnce(false);

      // On mobile, auto-expand so user can tap the widget's native play button
      if (mobile) setExpanded(true);

      widgetRef.current.load(trackUrl, {
        auto_play: true,
        show_artwork: true,
        show_comments: false,
        show_playcount: false,
        show_user: false,
        hide_related: true,
        visual: false,
        buying: false,
        sharing: false,
        download: false,
        callback: () => {
          widgetRef.current?.setVolume(Math.round(volume * 100));
        },
      });
    }, [trackUrl, volume, mobile]);

    // Sync play/pause from parent state (works on desktop, best-effort on mobile)
    useEffect(() => {
      if (!widgetRef.current || !widgetReady) return;
      widgetRef.current.isPaused((paused: boolean) => {
        if (isPlaying && paused) {
          widgetRef.current?.play();
        } else if (!isPlaying && !paused) {
          widgetRef.current?.pause();
        }
      });
    }, [isPlaying, widgetReady]);

    // Sync volume
    useEffect(() => {
      widgetRef.current?.setVolume(Math.round(volume * 100));
    }, [volume]);

    if (!trackUrl) return null;

    // Use key={trackUrl} to force iframe reload on track change — gives
    // auto_play the best chance of working since it's a fresh navigation
    const iframeSrc = `https://w.soundcloud.com/player/?url=${encodeURIComponent(trackUrl)}&auto_play=true&show_artwork=true&show_comments=false&show_playcount=false&show_user=false&hide_related=true&visual=false&buying=false&sharing=false&download=false`;

    return (
      <div
        className={`relative shrink-0 ${mobile ? 'w-10 h-10' : 'w-20 h-[60px]'}`}
        onMouseEnter={() => !mobile && setExpanded(true)}
        onMouseLeave={() => !mobile && setExpanded(false)}
        onClick={() => !mobile && setExpanded((e) => !e)}
      >
        <div
          className={`
            absolute rounded-lg overflow-hidden bg-[#f50] transition-all duration-300 ease-in-out cursor-pointer
            ${expanded
              ? mobile
                ? 'w-[280px] h-[160px] z-50 shadow-2xl shadow-black/60 bottom-0 left-0'
                : 'w-80 h-[120px] z-50 shadow-2xl shadow-black/60 bottom-0 left-0'
              : mobile
                ? 'w-10 h-10 bottom-0 left-0'
                : 'w-20 h-[60px] bottom-0 left-0'
            }
          `}
        >
          <iframe
            ref={iframeRef}
            key={trackUrl}
            src={iframeSrc}
            width="100%"
            height="100%"
            allow="autoplay"
            style={{ border: 'none' }}
            title="SoundCloud Player"
          />
          {/* Tap hint on mobile when expanded */}
          {mobile && expanded && !hasPlayedOnce && (
            <div className="absolute top-1 left-1 right-1 flex justify-center pointer-events-none">
              <span className="bg-black/70 text-white text-[10px] font-medium px-2 py-1 rounded">
                Tap the play button below to start
              </span>
            </div>
          )}
          {/* Label when collapsed */}
          {!expanded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-1 py-0.5">
                <span className="text-[8px] text-white/60 font-mono">SC</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

SoundCloudEmbed.displayName = 'SoundCloudEmbed';

export default SoundCloudEmbed;
