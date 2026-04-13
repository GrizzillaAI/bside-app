/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mixd — Signal Mix palette
        // Neutral Stage (dark)
        ink: '#050509',          // App canvas
        void: '#0B0B12',         // Cards
        graphite: '#12121C',     // Elevated surfaces
        slate: '#1A1A28',        // Borders
        smoke: '#252538',        // Dividers
        ash: '#5E5E7A',          // Muted text
        silver: '#A0A0B8',       // Body text
        cloud: '#D0D0DE',        // Emphasis
        pearl: '#EDEDF3',        // Headlines
        white: '#FAFAFC',        // Primary text

        // Primary — Signal Pink
        pink: {
          50: '#FFEFF6', 100: '#FFD0E6', 200: '#FFA1CD', 300: '#FF72B4',
          400: '#FF4D9E', DEFAULT: '#FF2D87', 600: '#E01570', 700: '#B00B57', 800: '#7D0640',
        },
        // Secondary — Acid Lime
        lime: {
          50: '#FBFFE0', 100: '#F0FF9D', 200: '#E5FF5A', DEFAULT: '#DAFF00',
          600: '#B8D900', 700: '#8FA800',
        },
        // Tertiary — Cobalt
        cobalt: {
          50: '#E5E9FF', 100: '#B3BEFF', 200: '#8193FF', 300: '#5068FF',
          DEFAULT: '#1F3DFF', 600: '#1230D4', 700: '#0920A0',
        },
        // Semantic
        success: '#00E6A0',
        warning: '#FFB020',
        error: '#FF4757',
        info: '#1F3DFF',

        // Legacy aliases (so existing components keep compiling)
        obsidian: '#050509',
        bg: '#050509',
        surface: '#0B0B12',
        'surface-light': '#12121C',
        border: '#1A1A28',
        accent: '#FF2D87',
        'accent-light': '#FF4D9E',
        'accent-dark': '#E01570',
        'text-primary': '#FAFAFC',
        'text-secondary': '#A0A0B8',
        'text-muted': '#5E5E7A',
        coral: { DEFAULT: '#FF2D87', 400: '#FF4D9E', 600: '#E01570' },
        violet: { DEFAULT: '#1F3DFF', 400: '#5068FF' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Archivo Black"', 'Archivo', 'system-ui', 'sans-serif'],
        archivo: ['Archivo', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        tighter: '-0.03em',
      },
    },
  },
  plugins: [],
};
