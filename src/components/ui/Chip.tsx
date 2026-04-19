import { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Chip — small clickable label with two variants:
 *   filter:     toggle (on/off). Active = pink fill + ink text; inactive = ghost with slate border.
 *   suggestion: button (action). Subtle slate fill with a prefix icon.
 */

type ChipVariant = 'filter' | 'suggestion';

// Omit native `prefix` (a string attribute on HTMLElement) so we can use it for a ReactNode icon slot.
interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'prefix'> {
  variant?: ChipVariant;
  selected?: boolean;
  prefix?: ReactNode;
}

export function Chip({
  variant = 'filter',
  selected = false,
  prefix,
  className = '',
  children,
  ...rest
}: ChipProps) {
  const base = 'inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink';

  let color = '';
  if (variant === 'filter') {
    color = selected
      ? 'bg-pink text-ink border border-pink'
      : 'bg-transparent text-silver hover:text-pearl border border-slate hover:border-ash';
  } else {
    color = 'bg-graphite hover:bg-smoke text-pearl border border-slate';
  }

  return (
    <button
      type="button"
      aria-pressed={variant === 'filter' ? selected : undefined}
      className={`${base} ${color} ${className}`}
      {...rest}
    >
      {prefix}
      {children}
    </button>
  );
}
