/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#0a1628',
          surface: '#0f2035',
          card: '#152a42',
          accent: '#00d4aa',
          'accent-dark': '#00a888',
          mark: '#ffffff',
          'o-mark': '#00d4aa',
          gold: '#ffd700',
          danger: '#ff4757',
        },
      },
    },
  },
  plugins: [],
}
