/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#06b6d4',
        accent: '#10b981',
        bgdark: '#0f172a',
        'surface-elevated': '#101526',
        'surface-muted': '#1f2937'
      },
      fontFamily: {
        sans: ['Inter', 'System']
      }
    }
  },
  plugins: []
};
