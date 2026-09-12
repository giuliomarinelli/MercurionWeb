/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'selector',
  content: [
    "./src/**/*.{html,ts,scss}",
  ],
  theme: {
    extend: {
      /*
       * Semantic token contract:
       * - color: surface/on-surface/accent/control/status/border/focus
       * - spacing: component padding and gaps
       * - radius: component shape
       * - shadow: elevation
       * - typography: UI text roles
       *
       * Callers select a role, never a light/dark value. Runtime CSS
       * variables are used only for the light/dark role mapping in styles.css.
       */
      fontFamily: {
        spacegrotesk: ['"Space Grotesk"', 'sans-serif'],
      },
      fontSize: {
        'token-body': ['0.875rem', { lineHeight: '1.45' }],
        'token-body-sm': ['0.8125rem', { lineHeight: '1.35' }],
        'token-heading': ['1.125rem', { lineHeight: '1.3' }],
      },
      spacing: {
        'token-1': '0.25rem',
        'token-2': '0.5rem',
        'token-3': '0.75rem',
        'token-4': '1rem',
        'token-6': '1.5rem',
      },
      borderRadius: {
        'token-control': '0.5rem',
        'token-surface': '1rem',
        'token-pill': '9999px',
      },
      boxShadow: {
        'token-control': 'var(--shadow-control)',
        'token-surface': 'var(--shadow-surface)',
        'btn-dark': 'var(--shadow-control)',
      },
      screens: {
        "3xs": "321px",
        "2xs": "376px",
        "xs": "426px"
      },
      colors: {
        surface: {
          main: 'var(--color-surface-main)',
          secondary: 'var(--color-surface-secondary)',
          elevated: 'var(--color-surface-elevated)',
        },
        'on-surface': {
          main: 'var(--color-on-surface-main)',
          secondary: 'var(--color-on-surface-secondary)',
          muted: 'var(--color-on-surface-muted)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          'primary-hover': 'var(--color-accent-primary-hover)',
          secondary: 'var(--color-accent-secondary)',
          'secondary-hover': 'var(--color-accent-secondary-hover)',
        },
        control: {
          primary: 'var(--color-control-primary)',
          'primary-hover': 'var(--color-control-primary-hover)',
          secondary: 'var(--color-control-secondary)',
          'secondary-hover': 'var(--color-control-secondary-hover)',
          destructive: 'var(--color-control-destructive)',
          'destructive-hover': 'var(--color-control-destructive-hover)',
        },
        status: {
          success: 'var(--color-status-success)',
          warning: 'var(--color-status-warning)',
          error: 'var(--color-status-error)',
        },
        'token-border': 'var(--color-border)',
        'token-focus': 'var(--color-focus)',
        light: {
          'surface-main': '#F9FAFB',
          'surface-secondary': '#F3F4F6',
          'on-surface-main': '#11141D',
          'on-surface-secondary': '#4B5563',
          'accent-primary': '#2563EB',
          'accent-primary-hq': '#0f3b99',
          'accent-primary-hc': '#1147BB',
          'accent-secondary': '#006128',
          'warning': '#8F3900',
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
          'accent-primary-btn': '#0B6DE5',
          'accent-secondary': '#28B883',
          'accent-secondary-surface': '219C6F',
          'accent-secondary-hc': '#3FD59E',
          'accent-primary-btn-hc': '#BFD8F8',
          'warning': '#FCCF5F',
          'error': '#FF7A7D',
          'error-hc': '#FFC7CB',
          'border': '#4B5563',
          "custbg-offcanvas": '#1b2333',
          'slate-detail': '#BDC9D6'
        }
      }
    },
  },
  plugins: [],
}
