/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        court: {
          wood: '#c98b4b',
          sand: '#e0b97d',
          line: '#f8fafc',
        },
        panel: {
          950: '#070b14',
          900: '#0b1120',
          850: '#111827',
          800: '#151d2e',
          700: '#1e293b',
          600: '#334155',
        },
        accent: {
          DEFAULT: '#38bdf8',
          warm: '#f59e0b',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
