/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          card: '#1e293b',
          border: '#334155',
          hover: '#475569',
          active: '#1e40af',
          text: {
            primary: '#f1f5f9',
            secondary: '#94a3b8'
          }
        }
      },
      boxShadow: {
        'dark-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.35)',
        'dark': '0 1px 3px 0 rgba(0, 0, 0, 0.35), 0 1px 2px -1px rgba(0, 0, 0, 0.35)',
        'dark-md': '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.35)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.35)',
        'dark-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.35)',
        'dark-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        'dark-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.35)'
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.flip-x': {
          transform: 'scaleX(-1)',
        },
        '.dark-glass': {
          'backdrop-filter': 'blur(16px)',
          'background-color': 'rgba(30, 41, 59, 0.8)',
        },
        '.light-glass': {
          'backdrop-filter': 'blur(16px)',
          'background-color': 'rgba(255, 255, 255, 0.8)',
        }
      };
      addUtilities(newUtilities);
    },
  ],
};