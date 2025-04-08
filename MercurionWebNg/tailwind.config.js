/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      colors: {
        light: {
          'surface-main': '#F9FAFB',
          'surface-secondary': '#F3F4F6',
          'on-surface-main': '#111827',
          'on-surface-secondary': '#4B5563',
          'accent-primary': '#2563EB',
          'accent-secondary': '#10B981',
          'warning': '#F59E0B',
          'error': '#F43F5E',
          'border': '#E5E7EB',
        },
        dark: {
          'surface-main': '#1F2937',
          'surface-secondary': '#374151',
          'on-surface-main': '#F3F4F6',
          'on-surface-secondary': '#D1D5DB',
          'accent-primary': '#60A5FA',
          'accent-secondary': '#34D399',
          'warning': '#FBBF24',
          'error': '#FB7185',
          'border': '#4B5563',
        }
      }
    },
  },
  plugins: [],
}
