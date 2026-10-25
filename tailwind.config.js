/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#07080b',
          900: '#0a0b0f',
          850: '#0e0f14',
          800: '#13141a',
          750: '#171920',
          700: '#1d1f28',
          600: '#272a35',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          strong: 'rgb(var(--accent-strong) / <alpha-value>)',
          contrast: 'rgb(var(--accent-contrast) / <alpha-value>)',
        },
        positive: '#8ee0b0',
        warning: '#f0c987',
        negative: '#f19a9a',
      },
      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'SF Pro Text',
          'Segoe UI Variable',
          'Segoe UI',
          'system-ui',
          'sans-serif',
        ],
        display: ['Instrument Serif', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'SF Mono', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 50px -24px rgba(0,0,0,0.7)',
        lift: '0 24px 60px -24px rgba(0,0,0,0.8)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(-4%, -2%, 0) scale(1)' },
          '50%': { transform: 'translate3d(4%, 3%, 0) scale(1.08)' },
        },
        'soft-pulse': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-110%)' },
          '100%': { transform: 'translateY(1100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2.2s linear infinite',
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.8s ease-in-out infinite',
        'scan-line': 'scan-line 6s linear infinite',
      },
    },
  },
  plugins: [],
};
