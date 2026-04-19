import { forwardRef, ButtonHTMLAttributes } from 'react';

/**
 * Mixd Button — the single source of truth for all buttons in the app.
 *
 * Variants:
 *   primary   — pink background, INK text (a11y: Ink-on-pink = 5.4:1, passes AA)
 *   secondary — graphite background, pearl text, subtle border
 *   ghost     — transparent, pearl text, no border — use for nav / dismissals
 *   lime      — acid-lime background, ink text — use for Premium upsell only
 *   danger    — error red border + red text — use for destructive confirmations
 *
 * Sizes: sm (32px tall), md (40px tall, default), lg (48px tall)
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'lime' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-pink hover:bg-pink-400 text-ink font-semibold disabled:opacity-40',
  secondary: 'bg-graphite hover:bg-smoke text-pearl border border-slate font-medium disabled:opacity-40',
  ghost:     'bg-transparent hover:bg-graphite text-silver hover:text-pearl font-medium disabled:opacity-40',
  lime:      'bg-lime hover:bg-lime-600 text-ink font-bold disabled:opacity-40',
  danger:    'bg-transparent border border-error/50 hover:bg-error/10 text-error font-medium disabled:opacity-40',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs rounded-md',
  md: 'h-10 px-4 text-sm rounded-lg',
  lg: 'h-12 px-6 text-sm rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading = false, fullWidth = false, disabled, className = '', children, ...rest },
  ref
) {
  const base = 'inline-flex items-center justify-center gap-2 transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-pink focus-visible:ring-offset-2 focus-visible:ring-offset-ink';
  const w = fullWidth ? 'w-full' : '';
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${w} ${className}`}
      {...rest}
    >
      {loading ? (
        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {children}
    </button>
  );
});
