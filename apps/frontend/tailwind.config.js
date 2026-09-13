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
          950: 'rgb(var(--panel-950) / <alpha-value>)',
          900: 'rgb(var(--panel-900) / <alpha-value>)',
          850: 'rgb(var(--panel-850) / <alpha-value>)',
          800: 'rgb(var(--panel-800) / <alpha-value>)',
          700: 'rgb(var(--panel-700) / <alpha-value>)',
          600: 'rgb(var(--panel-600) / <alpha-value>)',
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
