/** u/type {import('tailwindcss').Config} */
module.exports = {
  content: ['./renderer/index.html', './renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Press Start 2P"', 'cursive'],
        mono: ['"Roboto Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
