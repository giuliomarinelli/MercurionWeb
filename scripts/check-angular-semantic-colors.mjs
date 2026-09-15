import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export const semanticColorPairings = [
  { name: 'body text', foreground: 'on-surface-main', background: 'surface-main', minimum: 4.5 },
  { name: 'secondary text', foreground: 'on-surface-secondary', background: 'surface-main', minimum: 4.5 },
  { name: 'muted text', foreground: 'on-surface-muted', background: 'surface-main', minimum: 4.5 },
  { name: 'elevated surface text', foreground: 'on-surface-main', background: 'surface-elevated', minimum: 4.5 },
  { name: 'primary control label', foreground: 'surface-main', background: 'control-primary', minimum: 3 },
  { name: 'secondary control label', foreground: 'surface-main', background: 'control-secondary', minimum: 3 },
  { name: 'destructive control label', foreground: 'surface-main', background: 'control-destructive', minimum: 3 },
  { name: 'success status', foreground: 'status-success', background: 'surface-main', minimum: 4.5 },
  { name: 'warning status', foreground: 'status-warning', background: 'surface-main', minimum: 4.5 },
  { name: 'error status', foreground: 'status-error', background: 'surface-main', minimum: 4.5 },
  { name: 'focus indicator', foreground: 'focus', background: 'surface-main', minimum: 3 },
  { name: 'border indicator', foreground: 'border', background: 'surface-main', minimum: 3 },
];

const colorPattern = /^#[0-9a-f]{6}$/i;

export function parseHexColor(value, label) {
  if (typeof value !== 'string' || !colorPattern.test(value)) {
    throw new Error(`${label} must be a six-digit hex color (received ${JSON.stringify(value)})`);
  }
  return value;
}

function toRgb(hex) {
  const value = hex.slice(1);
  return [0, 2, 4].map(offset => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function luminance(hex) {
  return toRgb(hex).reduce((sum, channel, index) => {
    const linear = channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
}

export function contrastRatio(foreground, background) {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function extractThemeVars(cssSource, selector) {
  const start = cssSource.indexOf(selector);
  if (start < 0) throw new Error(`Missing semantic theme selector ${selector}`);
  const end = cssSource.indexOf('}', start);
  if (end < 0) throw new Error(`Unclosed semantic theme selector ${selector}`);
  const vars = {};
  for (const match of cssSource.slice(start, end).matchAll(/--color-([\w-]+)\s*:\s*([^;]+);/g)) {
    vars[match[1]] = parseHexColor(match[2].trim(), `${selector} --color-${match[1]}`);
  }
  return vars;
}

function readSemanticCss(cssSource) {
  const light = extractThemeVars(cssSource, ':root');
  const dark = extractThemeVars(cssSource, '.dark');
  const roles = new Set([...Object.keys(light), ...Object.keys(dark)]);
  for (const role of roles) {
    if (!light[role] || !dark[role]) {
      throw new Error(`Semantic color role ${role} must be defined in both themes`);
    }
  }
  return { light, dark };
}

function readTailwindColors(config) {
  const themes = { light: config.theme?.extend?.colors?.light, dark: config.theme?.extend?.colors?.dark };
  for (const [theme, colors] of Object.entries(themes)) {
    if (!colors) throw new Error(`Tailwind semantic ${theme} color palette is missing`);
    for (const [name, value] of Object.entries(colors)) {
      parseHexColor(value, `tailwind ${theme}.${name}`);
    }
  }
}

export function validateSemanticColors({ tailwindConfig, cssSource }) {
  readTailwindColors(tailwindConfig);
  const themes = readSemanticCss(cssSource);
  const errors = [];
  for (const [theme, colors] of Object.entries(themes)) {
    for (const pairing of semanticColorPairings) {
      const foreground = colors[pairing.foreground];
      const background = colors[pairing.background];
      if (!foreground || !background) {
        errors.push(`${theme} ${pairing.name} references an undefined semantic role`);
        continue;
      }
      const ratio = contrastRatio(foreground, background);
      if (ratio < pairing.minimum) {
        errors.push(`${theme} ${pairing.name} contrast ${ratio.toFixed(2)}:1 is below ${pairing.minimum}:1`);
      }
    }
  }
  return errors;
}

export async function runSemanticColorCheck(root = repositoryRoot) {
  const config = require(resolve(root, 'MercurionWebNg/tailwind.config.js'));
  const cssSource = await readFile(resolve(root, 'MercurionWebNg/src/styles.css'), 'utf8');
  const errors = validateSemanticColors({ tailwindConfig: config, cssSource });
  if (errors.length) {
    console.error(`Angular semantic color check failed:\n${errors.join('\n')}`);
    return false;
  }
  console.log(`Angular semantic color and WCAG check passed (${semanticColorPairings.length} pairings × 2 themes).`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!(await runSemanticColorCheck())) process.exit(1);
}
