/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js,css}"],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        inter: 'Inter',
        segoe: 'Segoe UI',
        mono: 'JetBrainsMono',
      },
      colors: {
        light: '#ECECEC',
        dark: '#121212'
      }
    },
  },
  plugins: [ require("daisyui") ],
  daisyui: {
    themes: ["light", "dark"]    
  }
}

