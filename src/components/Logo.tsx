// Mixd Logo — primary mark (X-mark) + wordmark lockup
// Per brand kit: two crossing bars (one pink, one white/black), wordmark has scaled-X.

interface LogoMarkProps {
  size?: number;
  className?: string;
  /** "dark" → white counter-bar on pink. "light" → ink counter-bar on pink. */
  variant?: 'dark' | 'light';
}

export function LogoMark({ size = 32, className = '', variant = 'dark' }: LogoMarkProps) {
  const counterColor = variant === 'dark' ? '#FAFAFC' : '#050509';
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mixd"
    >
      <rect x="14" y="50" width="92" height="20" rx="2" transform="rotate(34 60 60)" fill="#FF2D87" />
      <rect x="14" y="50" width="92" height="20" rx="2" transform="rotate(-34 60 60)" fill={counterColor} />
    </svg>
  );
}

interface WordmarkProps {
  /** Text pixel size */
  size?: number;
  className?: string;
  /** If true, render the "x" bigger (brand kit's display lockup). */
  display?: boolean;
  /** Text color for "Mi" and "d" — pink is always used for the "x". */
  color?: string;
}

export function Wordmark({ size = 22, className = '', display = false, color = '#FAFAFC' }: WordmarkProps) {
  return (
    <span
      className={`font-display leading-none inline-block ${className}`}
      style={{
        fontFamily: "'Archivo Black', Archivo, sans-serif",
        fontSize: size,
        letterSpacing: display ? '-0.04em' : '-0.02em',
        color,
      }}
    >
      Mi<span className={display ? 'mixd-x-lg' : 'mixd-x'}>x</span>d
    </span>
  );
}

interface LockupProps {
  markSize?: number;
  wordSize?: number;
  className?: string;
  color?: string;
  variant?: 'dark' | 'light';
}

export function Lockup({ markSize = 32, wordSize = 22, className = '', color = '#FAFAFC', variant = 'dark' }: LockupProps) {
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={markSize} variant={variant} />
      <Wordmark size={wordSize} color={color} />
    </div>
  );
}
