/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Midnight Frequency palette
        obsidian: '#08080C',
        void: '#0E0E14',
        graphite: '#16161F',
        slate: '#1E1E2A',
        smoke: '#2A2A3A',
        ash: '#5A5A72',
        silver: '#9898AA',
        cloud: '#CCCCD8',
        pearl: '#EEEEF2',
        white: '#FAFAFC',
        // Primary — Electric Coral
        coral: { 50: '#FFF1EE', 100: '#FFD9D0', 200: '#FFB3A1', 300: '#FF8C72', 400: '#FF6B4A', DEFAULT: '#FF4F2B', 600: '#E63D1A', 700: '#B82E12', 800: '#8A200C' },
        // Secondary — Deep Violet
        violet: { 50: '#F3EEFF', 100: '#DDD0FF', 200: '#BBA1FF', 300: '#9972FF', 400: '#7C4DFF', DEFAULT: '#6930FF', 600: '#5020D9', 700: '#3C18A8', 800: '#2A1078' },
        // Accents
        amber: { DEFAULT: '#FFB020', light: '#FFD080' },
        mint: { DEFAULT: '#00E6A0', light: '#80FFD4' },
        // Semantic
        success: '#00D68F',
        warning: '#FFB020',
        error: '#FF4757',
        info: '#7C4DFF',
        // Legacy aliases for existing components
        bg: '#08080C',
        surface: '#0E0E14',
        'surface-light': '#16161F',
        border: '#1E1E2A',
        accent: '#FF4F2B',
        'accent-light': '#FF6B4A',
        'accent-dark': '#E63D1A',
        'text-primary': '#FAFAFC',
        'text-secondary': '#9898AA',
        'text-muted': '#5A5A72',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
