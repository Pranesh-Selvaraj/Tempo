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
          950: '#000000',
          900: '#050505',
          850: '#0a0a0a',
          800: '#101010',
          700: '#1c1c1c',
          600: '#2e2e2e',
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
