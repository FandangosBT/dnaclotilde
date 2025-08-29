/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        coder: [
          'var(--font-coder)',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
        area: [
          'var(--font-area)',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          '"Liberation Sans"',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '16px',
        pill: '9999px',
        xl2: '1.25rem',
      },
      ringColor: {
        gold: 'var(--color-accent-gold)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.32, 0, 0, 1)',
      },
      transitionDuration: {
        fast: '200ms',
        normal: '300ms',
        slow: '500ms',
      },
      keyframes: {
        'fade-slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-slide-up':
          'fade-slide-up var(--motion-duration-normal, 300ms) var(--motion-ease-standard, cubic-bezier(0.2, 0, 0, 1)) both',
      },
      colors: {
        brand: {
          DEFAULT: 'var(--color-accent-gold)',
          hover: 'var(--color-accent-gold-hover)',
        },
        ink: 'var(--color-bg-1)',
        border: 'var(--color-border)',
        muted: 'var(--color-text-secondary)',
      },
      boxShadow: {
        soft: '0 6px 20px rgba(0,0,0,.25)',
      },
    },
  },
  plugins: [],
}
