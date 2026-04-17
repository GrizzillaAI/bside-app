// BandcampEmbed — Bandcamp iframe embed for the Mixd player bar.
//
// Bandcamp's embedded player doesn't expose a JavaScript API (no postMessage
// control for play/pause/seek), so this is a display-only iframe. The user
// interacts with playback directly inside the embed. The global player
// context treats bandcamp as a "fire-and-forget" backend — it sets the embed
// URL and the user controls playback within the iframe.
//
// Embed URL format:
//   Track: https://bandcamp.com/EmbeddedPlayer/track={id}/size=small/bgcol=0B0B12/linkcol=FF2D87
//   Album: https://bandcamp.com/EmbeddedPlayer/album={id}/size=small/bgcol=0B0B12/linkcol=FF2D87

import { forwardRef, useImperativeHandle } from 'react';

export interface BandcampEmbedProps {
  embedUrl: string | null; // Full Bandcamp EmbeddedPlayer URL
}

export interface BandcampEmbedRef {
  seek: (seconds: number) => void;
  play: () => void;
  pause: () => void;
}

const BandcampEmbed = forwardRef<BandcampEmbedRef, BandcampEmbedProps>(
  ({ embedUrl }, ref) => {
    // Expose no-op controls — Bandcamp embed has no JS API
    useImperativeHandle(ref, () => ({
      seek: () => {},
      play: () => {},
      pause: () => {},
    }));

    if (!embedUrl) return null;

    return (
      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#0B0B12]">
        <iframe
          src={embedUrl}
          style={{ border: 0, width: 48, height: 48 }}
          seamless
          title="Bandcamp Player"
          allow="autoplay"
        />
      </div>
    );
  },
);

BandcampEmbed.displayName = 'BandcampEmbed';
export default BandcampEmbed;
