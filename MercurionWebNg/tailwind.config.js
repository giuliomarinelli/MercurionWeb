/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      fontFamily: {
        spacegrotesk: ['"Space Grotesk"', 'sans-serif'],
      },
      screens: {
        "3xs": "321px",
        "2xs": "376px",
        "xs": "426px"
      },
      colors: {
        light: {
          'surface-main': '#F9FAFB',
          'surface-secondary': '#F3F4F6',
          'on-surface-main': '#11141D',
          'on-surface-secondary': '#4B5563',
          'accent-primary': '#2563EB',
          'accent-secondary': '#08755C',
          'warning': '#F59E0B',
          'error': '#A80006',
          'border': '#E5E7EB',
          'slate-detail': '#3E4160'
        },
        dark: {
          'surface-main': '#1F2937',
          'surface-secondary': '#374151',
          'on-surface-main': '#F3F4F6',
          'on-surface-secondary': '#D1D5DB',
          'accent-primary': '#60A5FA',
          'accent-secondary': '#28B883',
          'accent-secondary-surface': '219C6F',
          'warning': '#FBBF24',
          'error': '#FF7A7D',
          'border': '#4B5563',
          "custbg-offcanvas": '#1b2333',
          'slate-detail': '#BDC9D6'
        }
      }
    },
  },
  plugins: [],
}
