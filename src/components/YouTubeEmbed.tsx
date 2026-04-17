// YouTubeEmbed — Persistent YouTube IFrame player for the Mixd player bar.
//
// Renders a small thumbnail-sized YouTube player (80×60) that expands on
// hover (desktop) or tap (mobile). Uses the official YouTube IFrame Player
// API for ToS-compliant playback with full JS control (play/pause/seek).
//
// The component loads the IFrame API script once and reuses the same player
// instance across track changes via loadVideoById().

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Types for the YouTube IFrame API (global YT namespace) ──────────────
// We declare the bare minimum to keep things typed without pulling in a
// full @types/youtube package.

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          height?: string | number;
          width?: string | number;
          videoId?: string;
          host?: string;
          playerVars?: Record<string, string | number>;
          events?: Record<string, (e: any) => void>;
        },
      ) => YTPlayer;
      PlayerState: {
        UNSTARTED: number;
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string, startSeconds?: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (vol: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

// ── Script loader (singleton) ───────────────────────────────────────────
let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  if (window.YT?.Player) return Promise.resolve();

  apiLoadPromise = new Promise<void>((resolve) => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(tag, firstScript);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiLoadPromise;
}

// ── Component ───────────────────────────────────────────────────────────
export interface YouTubeEmbedProps {
  videoId: string | null;
  isPlaying: boolean;
  volume: number;               // 0-1
  onStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onReady: () => void;
}

// Ref handle so the parent (player context) can call seek/play/pause
export interface YouTubeEmbedRef {
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

import { forwardRef, useImperativeHandle } from 'react';

const YouTubeEmbed = forwardRef<YouTubeEmbedRef, YouTubeEmbedProps>(
  ({ videoId, isPlaying, volume, onStateChange, onTimeUpdate, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YTPlayer | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [apiReady, setApiReady] = useState(false);

    // Expose imperative methods to parent
    useImperativeHandle(ref, () => ({
      seek(seconds: number) {
        playerRef.current?.seekTo(seconds, true);
      },
      play() {
        playerRef.current?.playVideo();
      },
      pause() {
        playerRef.current?.pauseVideo();
      },
    }));

    // Load the IFrame API on mount
    useEffect(() => {
      loadYouTubeAPI().then(() => setApiReady(true));
    }, []);

    // Create the player once the API is loaded
    useEffect(() => {
      if (!apiReady || !containerRef.current) return;
      // Don't recreate if already exists
      if (playerRef.current) return;

      const player = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId ?? undefined,
        playerVars: {
          autoplay: 1,
          controls: 1,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,    // Critical for iOS — plays inline instead of fullscreen
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            playerRef.current = player;
            player.setVolume(Math.round(volume * 100));
            onReady();
          },
          onStateChange: (e: any) => {
            const YT = window.YT;
            switch (e.data) {
              case YT.PlayerState.PLAYING:
                onStateChange('playing');
                break;
              case YT.PlayerState.PAUSED:
                onStateChange('paused');
                break;
              case YT.PlayerState.ENDED:
                onStateChange('ended');
                break;
              case YT.PlayerState.BUFFERING:
                onStateChange('buffering');
                break;
            }
          },
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiReady]);

    // Load new video when videoId changes
    useEffect(() => {
      if (!playerRef.current || !videoId) return;
      playerRef.current.loadVideoById(videoId);
    }, [videoId]);

    // Sync play/pause from parent state
    useEffect(() => {
      if (!playerRef.current) return;
      const state = playerRef.current.getPlayerState();
      const YT = window.YT;
      if (isPlaying && state !== YT.PlayerState.PLAYING) {
        playerRef.current.playVideo();
      } else if (!isPlaying && state === YT.PlayerState.PLAYING) {
        playerRef.current.pauseVideo();
      }
    }, [isPlaying]);

    // Sync volume
    useEffect(() => {
      playerRef.current?.setVolume(Math.round(volume * 100));
    }, [volume]);

    // Poll current time (YouTube API doesn't have a timeupdate event)
    useEffect(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        if (!playerRef.current) return;
        const state = playerRef.current.getPlayerState();
        if (state === window.YT?.PlayerState?.PLAYING) {
          onTimeUpdate(
            playerRef.current.getCurrentTime(),
            playerRef.current.getDuration(),
          );
        }
      }, 500);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }, [onTimeUpdate]);

    // If there's no video, hide the embed
    if (!videoId) return null;

    return (
      <div
        className="relative w-20 h-[60px] shrink-0"
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onClick={() => setExpanded((e) => !e)}
      >
        <div
          className={`
            absolute rounded-lg overflow-hidden bg-black transition-all duration-300 ease-in-out cursor-pointer
            ${expanded
              ? 'w-80 h-[180px] z-50 shadow-2xl shadow-black/60 bottom-0 left-0'
              : 'w-20 h-[60px] bottom-0 left-0'
            }
          `}
        >
          {/* The YouTube iframe gets injected here by the API */}
          <div
            ref={containerRef}
            id="mixd-yt-player"
            className="absolute inset-0 w-full h-full"
          />
          {/* Subtle expand hint when collapsed */}
          {!expanded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-1 py-0.5">
                <span className="text-[8px] text-white/60 font-mono">YT</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

YouTubeEmbed.displayName = 'YouTubeEmbed';

export default YouTubeEmbed;
