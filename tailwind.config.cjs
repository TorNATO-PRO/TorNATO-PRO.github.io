// tailwind.config.cjs
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...defaultTheme.colors,
      },
    },
  },
  plugins: [],
};
