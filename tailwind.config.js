/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        popin: {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(6px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideup: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadein: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        popin: 'popin 0.22s cubic-bezier(0.16,1,0.3,1) both',
        slideup: 'slideup 0.28s cubic-bezier(0.16,1,0.3,1) both',
        fadein: 'fadein 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};
