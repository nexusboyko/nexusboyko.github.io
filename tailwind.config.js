/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./**/*.{html,js,css}"],
  theme: {
    extend: {
      fontFamily: {
        inter: 'Inter',
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
    themes: ["dark", "light"]
  }
}

