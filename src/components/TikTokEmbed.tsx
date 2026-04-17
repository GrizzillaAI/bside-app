// TikTokEmbed — Persistent TikTok player for the Mixd player bar.
//
// Uses the official TikTok Embed Player API (iframe + postMessage).
// URL format: https://www.tiktok.com/player/v1/{videoId}
// Docs: https://developers.tiktok.com/doc/embed-player
//
// Exposes play/pause/seek via forwardRef so the global player context
// can control it, mirroring the YouTube and SoundCloud embed patterns.

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

// ── TikTok Player API message types ────────────────────────────────────
// Host → Player messages
interface TikTokOutMessage {
  'x-tiktok-player': true;
  type: 'play' | 'pause' | 'seekTo' | 'mute' | 'unMute';
  value?: number;
}

// Player → Host messages
interface TikTokInMessage {
  'x-tiktok-player': boolean;
  type: 'onPlayerReady' | 'onStateChange' | 'onCurrentTime' | 'onMute' | 'onVolumeChange' | 'onPlayerError';
  value: any;
}

// ── Component ───────────────────────────────────────────────────────────
export interface TikTokEmbedProps {
  videoId: string | null;        // TikTok post ID (numeric string)
  isPlaying: boolean;
  volume: number;                // 0-1
  onStateChange: (state: 'playing' | 'paused' | 'ended' | 'buffering') => void;
  onTimeUpdate: (currentTime: number, duration: number) => void;
  onReady: () => void;
}

export interface TikTokEmbedRef {
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

const TikTokEmbed = forwardRef<TikTokEmbedRef, TikTokEmbedProps>(
  ({ videoId, isPlaying, volume, onStateChange, onTimeUpdate, onReady }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [expanded, setExpanded] = useState(false);
    const [playerReady, setPlayerReady] = useState(false);
    const currentVideoRef = useRef<string | null>(null);

    // Helper to send postMessage to the TikTok iframe
    const sendMessage = useCallback((type: TikTokOutMessage['type'], value?: number) => {
      if (!iframeRef.current?.contentWindow) return;
      const msg: TikTokOutMessage = { 'x-tiktok-player': true, type, value };
      iframeRef.current.contentWindow.postMessage(msg, '*');
    }, []);

    // Expose imperative methods to parent
    useImperativeHandle(ref, () => ({
      seek(seconds: number) {
        sendMessage('seekTo', seconds);
      },
      play() {
        sendMessage('play');
      },
      pause() {
        sendMessage('pause');
      },
    }));

    // Listen for messages from the TikTok player
    useEffect(() => {
      const handler = (event: MessageEvent) => {
        const data = event.data as TikTokInMessage;
        if (!data || !data['x-tiktok-player']) return;

        switch (data.type) {
          case 'onPlayerReady':
            setPlayerReady(true);
            // Mute/unmute based on current volume
            if (volume === 0) sendMessage('mute');
            else sendMessage('unMute');
            onReady();
            break;

          case 'onStateChange': {
            // -1 = init, 0 = ended, 1 = playing, 2 = paused, 3 = buffering
            const state = data.value as number;
            if (state === 1) onStateChange('playing');
            else if (state === 2) onStateChange('paused');
            else if (state === 0) onStateChange('ended');
            else if (state === 3) onStateChange('buffering');
            break;
          }

          case 'onCurrentTime': {
            // { currentTime: number, duration: number } in seconds
            const { currentTime, duration } = data.value || {};
            if (typeof currentTime === 'number' && typeof duration === 'number') {
              onTimeUpdate(currentTime, duration);
            }
            break;
          }

          case 'onPlayerError':
            console.warn('TikTok player error:', data.value);
            break;
        }
      };

      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [volume, sendMessage, onReady, onStateChange, onTimeUpdate]);

    // Sync play/pause from parent state
    useEffect(() => {
      if (!playerReady) return;
      if (isPlaying) sendMessage('play');
      else sendMessage('pause');
    }, [isPlaying, playerReady, sendMessage]);

    // Sync volume (mute/unmute — TikTok doesn't have a setVolume, only mute/unMute)
    useEffect(() => {
      if (!playerReady) return;
      if (volume === 0) sendMessage('mute');
      else sendMessage('unMute');
    }, [volume, playerReady, sendMessage]);

    // Reset ready state when video changes
    useEffect(() => {
      if (videoId !== currentVideoRef.current) {
        currentVideoRef.current = videoId;
        setPlayerReady(false);
      }
    }, [videoId]);

    // If there's no video, hide the embed
    if (!videoId) return null;

    // Build iframe URL with player params
    const iframeSrc = `https://www.tiktok.com/player/v1/${videoId}?autoplay=1&loop=0&controls=1&progress_bar=1&play_button=1&volume_control=1&fullscreen_button=0&timestamp=1&music_info=0&description=0&rel=0&native_context_menu=0&closed_caption=1`;

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
              ? 'w-48 h-[280px] z-50 shadow-2xl shadow-black/60 bottom-0 left-0'
              : 'w-20 h-[60px] bottom-0 left-0'
            }
          `}
        >
          <iframe
            ref={iframeRef}
            key={videoId}
            src={iframeSrc}
            width="100%"
            height="100%"
            allow="fullscreen; autoplay"
            style={{ border: 'none' }}
            title="TikTok Player"
          />
          {/* Subtle label when collapsed */}
          {!expanded && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute bottom-0.5 right-0.5 bg-black/70 rounded px-1 py-0.5">
                <span className="text-[8px] text-white/60 font-mono">TT</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

TikTokEmbed.displayName = 'TikTokEmbed';

export default TikTokEmbed;
