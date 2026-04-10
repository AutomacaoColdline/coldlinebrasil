/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          900:   '#051e31',
          dark:  '#0A3D62',
          700:   '#0e4f7e',
          mid:   '#1E5FAF',
          500:   '#2d74c8',
          light: '#3B82F6',
          200:   '#93c5fd',
          ice:   '#E8F4FD',
          'ice-2': '#D0EAF8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #051e31 0%, #0A3D62 55%, #1E5FAF 100%)',
        'cta-gradient':  'linear-gradient(135deg, #0A3D62 0%, #1E5FAF 100%)',
      },
      boxShadow: {
        'glow':    '0 0 24px rgba(30, 95, 175, 0.35)',
        'glow-lg': '0 0 48px rgba(30, 95, 175, 0.30)',
        'card':    '0 2px 16px rgba(10, 61, 98, 0.07)',
        'card-hover': '0 8px 32px rgba(10, 61, 98, 0.14)',
        'soft':    '0 1px 4px rgba(10, 61, 98, 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}
