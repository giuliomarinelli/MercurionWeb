import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import postcss from 'postcss';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const semanticColorPairings = [
  { name: 'body text', foreground: 'on-surface-main', background: 'surface-main', minimum: 4.5 },
  { name: 'secondary text', foreground: 'on-surface-secondary', background: 'surface-main', minimum: 4.5 },
  { name: 'muted text', foreground: 'on-surface-muted', background: 'surface-main', minimum: 4.5 },
  { name: 'elevated surface text', foreground: 'on-surface-main', background: 'surface-elevated', minimum: 4.5 },
  { name: 'primary control label', foreground: 'on-control-filled', background: 'control-primary', minimum: 7 },
  { name: 'primary control hover label', foreground: 'on-control-filled', background: 'control-primary-hover', minimum: 7 },
  { name: 'secondary control label', foreground: 'on-control-filled', background: 'control-secondary', minimum: 7 },
  { name: 'secondary control hover label', foreground: 'on-control-filled', background: 'control-secondary-hover', minimum: 7 },
  { name: 'destructive control label', foreground: 'on-control-filled', background: 'control-destructive', minimum: 7 },
  { name: 'destructive control hover label', foreground: 'on-control-filled', background: 'control-destructive-hover', minimum: 7 },
  { name: 'neutral control label', foreground: 'on-surface-main', background: 'surface-secondary', minimum: 7 },
  { name: 'neutral control hover label', foreground: 'on-surface-main', background: 'control-neutral-hover', minimum: 7 },
  { name: 'ghost control label', foreground: 'on-surface-main', background: 'surface-main', minimum: 7 },
  { name: 'ghost control label on elevated surface', foreground: 'on-surface-main', background: 'surface-elevated', minimum: 7 },
  { name: 'ghost control hover label', foreground: 'on-surface-main', background: 'control-ghost-hover', minimum: 7 },
  { name: 'outline control label', foreground: 'control-outline-text', background: 'surface-main', minimum: 7 },
  { name: 'outline control label on elevated surface', foreground: 'control-outline-text', background: 'surface-elevated', minimum: 7 },
  { name: 'outline control hover label', foreground: 'control-outline-text', background: 'control-outline-hover', minimum: 7 },
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
  const rule = postcss.parse(cssSource).nodes.find(
    node => node.type === 'rule' && node.selector === selector,
  );
  if (!rule) throw new Error(`Missing semantic theme selector ${selector}`);
  const vars = {};
  for (const declaration of rule.nodes) {
    if (declaration.type !== 'decl' || !declaration.prop.startsWith('--m-color-')) continue;
    const role = declaration.prop.slice('--m-color-'.length);
    vars[role] = parseHexColor(declaration.value.trim(), `${selector} ${declaration.prop}`);
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

function readTailwindColors(cssSource) {
  const themeBlock = cssSource.match(/@theme\s+inline\s*{([\s\S]*?)}/)?.[1];
  if (!themeBlock) throw new Error('Tailwind CSS theme is missing');
  for (const palette of ['light', 'dark']) {
    const colors = [...themeBlock.matchAll(new RegExp(`--color-${palette}-([\\w-]+)\\s*:\\s*([^;]+);`, 'g'))];
    if (colors.length === 0) throw new Error(`Tailwind semantic ${palette} color palette is missing`);
    for (const [, name, value] of colors) {
      parseHexColor(value.trim(), `tailwind ${palette}.${name}`);
    }
  }
}

export function validateSemanticColors({ cssSource }) {
  readTailwindColors(cssSource);
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
  const cssSource = await readFile(resolve(root, 'MercurionWebNg/src/styles.css'), 'utf8');
  const errors = validateSemanticColors({ cssSource });
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
