/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#09090b',
        surface: '#111114',
        surface2: '#18181d',
        surface3: '#1e1e25',
        border: '#222228',
        accent: '#e8ff47',
        accent2: '#ff6b35',
        accent3: '#5b8cff',
        muted: '#55555f',
        muted2: '#33333a',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Unbounded', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
