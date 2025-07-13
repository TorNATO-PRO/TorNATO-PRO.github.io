// tailwind.config.cjs
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ...defaultTheme.colors,
      },
      fontfamily: {
        sans: [ 'Roboto', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', ...defaultTheme.fontFamily.sans ],
      }
    },
  },
  plugins: [],
  corePlugins: {
    scrollSnapType: true,
    scrollSnapAlign: true,
  },
};
