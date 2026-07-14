/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        needs: {
          DEFAULT: '#2a78d6',
          dark: '#3987e5',
          soft: '#e3eefb',
          softdark: '#16283f',
        },
        wants: {
          DEFAULT: '#eb6834',
          dark: '#d95926',
          soft: '#fdeee6',
          softdark: '#3a2013',
        },
        savings: {
          DEFAULT: '#1baf7a',
          dark: '#199e70',
          soft: '#e2f6ee',
          softdark: '#0f2f23',
        },
        danger: {
          DEFAULT: '#d03b3b',
          dark: '#e66767',
          soft: '#fbe9e9',
          softdark: '#3a1616',
        },
        surface: {
          light: '#fcfcfb',
          dark: '#1a1a19',
        },
        page: {
          light: '#f5f5f2',
          dark: '#0d0d0d',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '1.25rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,11,11,0.04), 0 4px 16px rgba(11,11,11,0.06)',
        'card-dark': '0 1px 2px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.35)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
      },
    },
  },
  plugins: [],
}
