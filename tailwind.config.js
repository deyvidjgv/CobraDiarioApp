/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Manrope',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        primary: '#1A1917',
        'primary-light': '#3A3733',
        'primary-bg': '#EFECE6',
        gold: '#D9C9A3',
        mora: '#B4653F',
        'al-dia': '#5F7A5B',
        adelanto: '#6E7F98',
        surface: '#FFFFFF',
        'surface-1': '#F7F5F1',
        'surface-2': '#EFECE6',
      },
    },
  },
  plugins: [],
};
