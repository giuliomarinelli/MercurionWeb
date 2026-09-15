import { validateSemanticColors } from './check-angular-semantic-colors.mjs';

const config = {
  theme: {
    extend: {
      colors: {
        light: { surface: '#ffffff' },
        dark: { surface: '219C6F' },
      },
    },
  },
};
const css = `
:root {
  --color-surface-main: #ffffff;
  --color-on-surface-main: #111111;
}
.dark {
  --color-surface-main: #ffffff;
  --color-on-surface-main: #111111;
}
`;

let malformedRejected = false;
try {
  validateSemanticColors({ tailwindConfig: config, cssSource: css });
} catch (error) {
  malformedRejected = /six-digit hex color/.test(error.message);
}
if (!malformedRejected) throw new Error('Malformed semantic color fixture was accepted.');

const validConfig = {
  theme: { extend: { colors: { light: {}, dark: {} } } },
};
for (const theme of ['light', 'dark']) {
  validConfig.theme.extend.colors[theme] = {
    main: '#ffffff',
  };
}
const lowContrastCss = `
:root { --color-surface-main: #ffffff; --color-on-surface-main: #eeeeee; }
.dark { --color-surface-main: #ffffff; --color-on-surface-main: #eeeeee; }
`;
let lowContrastRejected = false;
try {
  const errors = validateSemanticColors({ tailwindConfig: validConfig, cssSource: lowContrastCss });
  lowContrastRejected = errors.some(error => error.includes('body text contrast'));
} catch {}
if (!lowContrastRejected) throw new Error('Insufficient-contrast fixture was accepted.');

console.log('Angular semantic color negative checks passed.');
