/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core brand - neon pink
        neon: {
          pink: '#FF2D78',
          mint: '#00FFB3',
          yellow: '#FFE600',
          orange: '#FF6B2B',
        },
        // Surface hierarchy (dark)
        surface: {
          0: '#0A0A0A',
          1: '#111111',
          2: '#1A1A1A',
          3: '#222222',
          4: '#2A2A2A',
        },
        // Semantic
        danger: {
          DEFAULT: '#FF3B5C',
          pale: 'rgba(255,59,92,0.12)',
        },
        success: {
          DEFAULT: '#00FFB3',
          pale: 'rgba(0,255,179,0.12)',
        },
        warning: {
          DEFAULT: '#FFE600',
          pale: 'rgba(255,230,0,0.12)',
        },
        info: {
          DEFAULT: '#38BDF8',
          pale: 'rgba(56,189,248,0.12)',
        },
        // Text
        ink: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          muted: '#505050',
          disabled: '#333333',
        },
        // Border
        edge: '#2A2A2A',
        // Legacy aliases for backward compat  
        brand: {
          dark: '#CC0058',
          mid: '#E0006A',
          main: '#FF2D78',
          light: '#FF7AAD',
          pale: 'rgba(255,45,120,0.12)',
        },
        accent: '#00FFB3',
        border: '#2A2A2A',
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          muted: '#505050',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '16px',
      },
      boxShadow: {
        // Brutalist 3D offset shadows
        'brutal': '4px 4px 0px #FF2D78',
        'brutal-mint': '4px 4px 0px #00FFB3',
        'brutal-yellow': '4px 4px 0px #FFE600',
        'brutal-sm': '2px 2px 0px #FF2D78',
        'brutal-pressed': '1px 1px 0px #FF2D78',
        // Neon glows
        'glow-pink': '0 0 20px rgba(255,45,120,0.4)',
        'glow-mint': '0 0 20px rgba(0,255,179,0.4)',
        'glow-yellow': '0 0 20px rgba(255,230,0,0.4)',
        // Legacy
        'card': '4px 4px 0px #FF2D78',
        'card-hover': '6px 6px 0px #FF2D78',
        'modal': '8px 8px 0px #FF2D78',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'blink': 'blink 1s step-end infinite',
        'shake': 'shake 0.4s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(255,45,120,0.6)' },
          '50%': { boxShadow: '0 0 24px rgba(255,45,120,0.9)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      backgroundImage: {
        'dot-grid': 'radial-gradient(circle, #2A2A2A 1px, transparent 1px)',
        'line-grid': 'linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-20': '20px 20px',
        'line-40': '40px 40px',
      },
    },
  },
  plugins: [],
}
