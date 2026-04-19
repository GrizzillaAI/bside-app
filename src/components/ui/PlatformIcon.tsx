/**
 * PlatformIcon — monochromatic brand marks for the platforms Mixd aggregates.
 * Inline SVG, renders in `currentColor` so the parent text color wins.
 */

export type PlatformKey = 'youtube' | 'spotify' | 'soundcloud' | 'applemusic' | 'tiktok';

interface PlatformIconProps {
  platform: PlatformKey;
  size?: number;
  className?: string;
  'aria-label'?: string;
}

export function PlatformIcon({ platform, size = 18, className = '', 'aria-label': ariaLabel }: PlatformIconProps) {
  const label = ariaLabel ?? PLATFORM_LABELS[platform];
  const common = { width: size, height: size, viewBox: '0 0 24 24', className, role: 'img', 'aria-label': label };

  switch (platform) {
    case 'youtube':
      return (
        <svg {...common} fill="currentColor">
          <path d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 4 12 4 12 4s-7.5 0-9.4.4A3 3 0 0 0 .5 6.5C0 8.4 0 12 0 12s0 3.6.5 5.5a3 3 0 0 0 2.1 2.1C4.5 20 12 20 12 20s7.5 0 9.4-.4a3 3 0 0 0 2.1-2.1C24 15.6 24 12 24 12s0-3.6-.5-5.5ZM9.7 15.6V8.4L15.9 12l-6.2 3.6Z" />
        </svg>
      );
    case 'spotify':
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0Zm5.5 17.3a.74.74 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 0 1-.3-1.5c4.5-1 8.4-.56 11.5 1.35.36.22.46.7.2 1.1Zm1.5-3.1a.94.94 0 0 1-1.3.3c-3.2-2-8.2-2.5-12-1.4a.94.94 0 1 1-.5-1.8c4.5-1.3 10-.7 13.6 1.5a.94.94 0 0 1 .3 1.3Zm.1-3.2c-3.9-2.3-10.3-2.5-14-1.4a1.13 1.13 0 1 1-.65-2.15C8.8 6.3 15.9 6.5 20.4 9.2a1.13 1.13 0 0 1-1.2 1.9Z" />
        </svg>
      );
    case 'soundcloud':
      return (
        <svg {...common} fill="currentColor">
          <path d="M7 9.5V18h2V9.5a4 4 0 0 1 4-4 4 4 0 0 1 4 3.55c.3-.07.6-.1.9-.1a4 4 0 0 1 4 4c0 2.3-1.9 4-4.2 4H9v-1h8.7c1.7 0 3-1.3 3-3s-1.3-3-3-3c-.5 0-1 .1-1.4.3a3 3 0 0 0-3.1-3 3 3 0 0 0-3 3V18h-1V9.8a3 3 0 0 0-2 .2V18h-1V10a2 2 0 0 0-1 0V18H4V11a2 2 0 0 0-1 .3V18H2V13a2 2 0 0 0 0 3.7V18H1v-1a3 3 0 0 1 1-5.83A4 4 0 0 1 7 9.5Z" />
        </svg>
      );
    case 'applemusic':
      return (
        <svg {...common} fill="currentColor">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm4.5 14.7c-.4 1-1.3 1.8-2.3 1.8-1 0-1.3-.6-2.4-.6s-1.5.6-2.4.6c-1 0-1.8-.9-2.3-1.8a7.5 7.5 0 0 1-.9-3.6c0-2.4 1.5-3.6 3-3.6 1 0 1.8.6 2.4.6.6 0 1.5-.7 2.6-.6a2.8 2.8 0 0 1 2.2 1.2 2.75 2.75 0 0 0-1.3 2.3 2.7 2.7 0 0 0 1.6 2.5 6.6 6.6 0 0 1-.8 1.2Zm-2.4-8.2a2.5 2.5 0 0 1-.5-1.8 2.9 2.9 0 0 1 1.8-.7 3 3 0 0 1-.8 2 2.5 2.5 0 0 1-.5.5Z" />
        </svg>
      );
    case 'tiktok':
      return (
        <svg {...common} fill="currentColor">
          <path d="M19.6 6.3a5.6 5.6 0 0 1-3.3-1.9 5.5 5.5 0 0 1-1.4-2.4h-2.8v12.5a2.7 2.7 0 1 1-2-2.6V9a5.4 5.4 0 1 0 4.8 5.4V9.1a8.3 8.3 0 0 0 4.7 1.5Z" />
        </svg>
      );
  }
}

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  youtube: 'YouTube',
  spotify: 'Spotify',
  soundcloud: 'SoundCloud',
  applemusic: 'Apple Music',
  tiktok: 'TikTok',
};

export { PLATFORM_LABELS };
