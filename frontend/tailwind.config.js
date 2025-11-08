/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
        }
      },
      animation: {
        'blob': 'blob 7s infinite',
        'gradient': 'gradient 8s ease infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'wave': 'wave 15s ease-in-out infinite',
        'gooey': 'gooeyMove 20s ease-in-out infinite',
        'viscous': 'viscousFlow 10s ease-in-out infinite',
        'ripple': 'ripple 3s ease-out infinite',
        'pulse-3d': 'pulse3D 2s ease-in-out infinite',
        'zoom-pulse': 'zoomPulse 20s ease-in-out infinite',
        'fade-in': 'fadeIn 0.8s ease-out forwards',
        'futuristic-slide': 'futuristicSlide 1s ease-out forwards',
        'futuristic-exit': 'futuristicExit 0.8s ease-in forwards',
        'glitch': 'glitchEffect 0.5s ease-in-out infinite',
      },
      keyframes: {
        blob: {
          '0%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9)',
          },
          '100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
        },
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
    },
  },
  plugins: [],
}
