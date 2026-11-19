/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4fb',
          100: '#d6e4f5',
          500: '#2f6fb3',
          600: '#245a95',
          700: '#1d4877',
          900: '#0f2540',
        },
        cement: { 50: '#f7f7f5', 100: '#ecebe7', 200: '#d9d7cf', 500: '#8a877c', 700: '#55534b' },
        accent: { 500: '#e8930c', 600: '#c77b06' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
