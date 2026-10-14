/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: '#0F172A',
        gold: '#F59E0B',
        success: '#10B981',
        pending: '#F97316',
        danger: '#EF4444',
      }
    }
  },
  plugins: [],
}