import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import postcss from 'postcss';
import tailwind from 'tailwindcss';

const repositoryRoot = process.cwd();
const sourceRoot = path.resolve(
  repositoryRoot,
  getArgument('--root') ?? 'MercurionWebNg/src',
);
const tailwindConfigPath = path.resolve(
  repositoryRoot,
  getArgument('--tailwind-config') ?? 'MercurionWebNg/tailwind.config.js',
);

const governedExtensions = new Set(['.css', '.scss', '.html', '.ts']);
const utilityPrefixes = new Set(
  [
    'accent',
    'align',
    'animate',
    'appearance',
    'aspect',
    'backdrop',
    'basis',
    'bg',
    'blur',
    'border',
    'bottom',
    'break',
    'brightness',
    'caret',
    'clear',
    'columns',
    'col',
    'content',
    'contrast',
    'cursor',
    'decoration',
    'delay',
    'divide',
    'drop-shadow',
    'duration',
    'ease',
    'fill',
    'filter',
    'flex',
    'float',
    'from',
    'gap',
    'grayscale',
    'grid',
    'grow',
    'h',
    'hue-rotate',
    'in',
    'indent',
    'inset',
    'isolation',
    'items',
    'justify',
    'leading',
    'left',
    'line-clamp',
    'list',
    'm',
    'max',
    'mb',
    'me',
    'min',
    'mix-blend',
    'ms',
    'mt',
    'mx',
    'my',
    'object',
    'opacity',
    'order',
    'origin',
    'outline',
    'overflow',
    'overscroll',
    'p',
    'pb',
    'pe',
    'pl',
    'place',
    'pointer-events',
    'pr',
    'ps',
    'pt',
    'px',
    'py',
    'resize',
    'ring',
    'right',
    'rotate',
    'rounded',
    'row',
    'saturate',
    'scale',
    'scroll',
    'select',
    'sepia',
    'shadow',
    'size',
    'skew',
    'space',
    'sr',
    'start',
    'static',
    'sticky',
    'stroke',
    'table',
    'text',
    'to',
    'top',
    'touch',
    'tracking',
    'transform',
    'transition',
    'translate',
    'truncate',
    'underline',
    'visible',
    'whitespace',
    'w',
    'will-change',
    'z',
  ].flatMap((prefix) => [prefix, `${prefix}-`]),
);

const utilityWithoutValue = new Set([
  'absolute',
  'block',
  'collapse',
  'contents',
  'fixed',
  'flex',
  'flow-root',
  'hidden',
  'inline',
  'inline-block',
  'inline-flex',
  'isolate',
  'italic',
  'leading-none',
  'line-through',
  'lowercase',
  'normal-case',
  'not-italic',
  'relative',
  'static',
  'sticky',
  'table',
  'table-cell',
  'table-row',
  'text-center',
  'text-left',
  'text-right',
  'truncate',
  'underline',
  'uppercase',
  'visible',
  'whitespace-normal',
  'whitespace-nowrap',
  'whitespace-pre',
  'whitespace-pre-line',
  'whitespace-pre-wrap',
  'whitespace-break-spaces',
  'invisible',
]);
const variantPrefixes = new Set([
  'after',
  'aria',
  'before',
  'checked',
  'dark',
  'data',
  'disabled',
  'even',
  'first',
  'first-of-type',
  'focus',
  'focus-visible',
  'group',
  'hover',
  'indeterminate',
  'invalid',
  'last',
  'last-of-type',
  'marker',
  'motion-safe',
  'motion-reduce',
  'odd',
  'open',
  'peer',
  'placeholder',
  'read-only',
  'read-write',
  'required',
  'selection',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xs',
  '2xs',
  'xs',
  'target',
  'valid',
  'visited',
]);

const propertyValueRules = new Map([
  ['scrollbar-width', /^(auto|thin|none)$/],
  ['font-style', /^(normal|italic|oblique(?:\s+\S+)?)$/],
  ['font-weight', /^(normal|bold|bolder|lighter|[1-9]00)$/],
]);

const files = collectFiles(sourceRoot);
const sources = files.map((file) => ({
  file,
  relative: path.relative(repositoryRoot, file),
  content: fs.readFileSync(file, 'utf8'),
}));
const errors = [];
const candidates = new Map();

for (const source of sources) {
  if (['.html', '.ts'].includes(path.extname(source.file))) {
    collectCandidates(source, candidates);
    collectDynamicClassErrors(source, errors);
  }
  if (['.css', '.scss'].includes(path.extname(source.file))) {
    validateStylesheet(source, errors);
  }
}

if (errors.length === 0) {
  const generatedCss = await generateTailwindCss(sources, tailwindConfigPath);
  for (const [candidate, locations] of candidates) {
    if (hasDuplicateVariant(candidate)) {
      errors.push(
        formatLocations(
          locations,
          `malformed Tailwind candidate "${candidate}" repeats a variant`,
        ),
      );
      continue;
    }
    if (!hasGeneratedCandidate(generatedCss, candidate)) {
      errors.push(
        formatLocations(
          locations,
          `Tailwind candidate "${candidate}" is not generated; use a valid finite utility or lookup map`,
        ),
      );
    }
  }
}

if (errors.length > 0) {
  console.error(`Angular styling check failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `Angular styling check passed (${files.length} governed files, ${candidates.size} Tailwind candidates).`,
  );
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function collectFiles(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Styling source root does not exist: ${directory}`);
  }
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...collectFiles(entryPath));
    } else if (governedExtensions.has(path.extname(entry.name))) {
      result.push(entryPath);
    }
  }
  return result;
}

function collectCandidates(source, candidates) {
  const classContexts = [
    ...source.content.matchAll(
      /\b(?:class|className)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g,
    ),
  ];
  const bindingContexts = [
    ...source.content.matchAll(
      /\[(?:class|className|ngClass)\]\s*=\s*(?:"([^"]*)"|'([^']*)')/g,
    ),
  ];
  const stringContexts = [
    ...source.content.matchAll(
      /(['"`])([a-z][a-z0-9.[\]#%:/_-]{2,})\1/gi,
    ),
  ];
  const contexts = [
    ...classContexts.map((match) => ({
      value: match.slice(1).find(Boolean) ?? '',
      allowMap: false,
    })),
    ...bindingContexts.map((match) => ({
      value: match.slice(1).find(Boolean) ?? '',
      allowMap: false,
    })),
    ...stringContexts.map((match) => ({ value: match[2], allowMap: true })),
  ];

  for (const { value, allowMap } of contexts) {
    for (const token of value.match(/[^\s"'`{},;]+/g) ?? []) {
      if (
        isTailwindCandidate(token) &&
        (!allowMap || isStaticMapCandidate(token))
      ) {
        addLocation(candidates, token, source);
      }
    }
  }
}

function collectDynamicClassErrors(source, errors) {
  if (source.file.endsWith('.spec.ts') || source.file.endsWith('.test.ts')) {
    return;
  }
  const interpolationPattern =
    /(?:class(?:Name)?|ngClass|classList)[^;\n]{0,180}(?:`[^`]*\$\{[^}]+\}[^`]*`|['"][^'"]*(?:bg|text|border|size|w|h|p|m)-['"]\s*\+)/g;
  for (const match of source.content.matchAll(interpolationPattern)) {
    const line = lineNumberAt(source.content, match.index);
    errors.push(
      `${source.relative}:${line}: Tailwind class construction must use an explicit finite lookup map or safelist`,
    );
  }
}

function validateStylesheet(source, errors) {
  let root;
  try {
    root = postcss.parse(source.content, { from: source.file });
  } catch (error) {
    errors.push(`${source.relative}: ${error.reason}`);
    return;
  }

  root.walkDecls((declaration) => {
    if (!/^-?-?[a-z][a-z0-9-]*$/i.test(declaration.prop)) {
      errors.push(
        `${source.relative}:${declaration.source?.start.line ?? 0}: invalid CSS property "${declaration.prop}"`,
      );
    }
    if (!declaration.value.trim()) {
      errors.push(
        `${source.relative}:${declaration.source?.start.line ?? 0}: CSS property "${declaration.prop}" has no value`,
      );
    }
    const rule = propertyValueRules.get(declaration.prop.toLowerCase());
    if (rule && !rule.test(declaration.value.trim())) {
      errors.push(
        `${source.relative}:${declaration.source?.start.line ?? 0}: invalid value "${declaration.value}" for ${declaration.prop}`,
      );
    }
  });
}

async function generateTailwindCss(sources, configPath) {
  const config = await import(pathToFileUrl(configPath));
  const rawContent = sources
    .filter(({ file }) => ['.html', '.ts'].includes(path.extname(file)))
    .map(({ content }) => content)
    .join('\n');
  const result = await postcss([
    tailwind.default?.({
      ...config.default,
      content: [{ raw: rawContent, extension: 'html' }],
    }) ?? tailwind({
      ...config.default,
      content: [{ raw: rawContent, extension: 'html' }],
    }),
  ]).process('@tailwind utilities;', { from: undefined });
  return result.css;
}

function pathToFileUrl(filePath) {
  return new URL(`file:///${filePath.replaceAll('\\', '/')}`).href;
}

function isTailwindCandidate(token) {
  if (
    !token ||
    token.includes('${') ||
    token.includes('://') ||
    /[(){};=<>]/.test(token) ||
    token.endsWith(':')
  ) {
    return false;
  }
  const base = token.split(':').at(-1);
  if (utilityWithoutValue.has(token) || utilityWithoutValue.has(base)) return true;
  const prefix = base.split('-')[0];
  if (
    ['m', 'p', 'w', 'h', 'max', 'min', 'mx', 'my', 'mt', 'mb', 'ml', 'mr', 'ms', 'me', 'px', 'py', 'pt', 'pb', 'pl', 'pr'].includes(prefix)
  ) {
    return /^(?:m|p|w|h|max|min|mx|my|mt|mb|ml|mr|ms|me|px|py|pt|pb|pl|pr)-(?:px|full|screen|auto|[0-9]+(?:\.[0-9]+)?|\[)/.test(
      base,
    );
  }
  const variants = token.split(':').slice(0, -1);
  return (
    utilityPrefixes.has(prefix) ||
    utilityPrefixes.has(`${prefix}-`) ||
    (variants.length > 0 &&
      variants.every((variant) => variantPrefixes.has(variant)) &&
      (utilityPrefixes.has(prefix) || utilityWithoutValue.has(base)))
  );
}

function isStaticMapCandidate(token) {
  const base = token.split(':').at(-1);
  const prefix = base.split('-')[0];
  return new Set([
    'accent',
    'animate',
    'bg',
    'border',
    'contrast',
    'fill',
    'font',
    'h',
    'leading',
    'm',
    'max',
    'min',
    'opacity',
    'outline',
    'p',
    'ring',
    'rounded',
    'shadow',
    'size',
    'stroke',
    'text',
    'tracking',
    'transition',
    'translate',
    'w',
  ]).has(prefix);
}

function hasDuplicateVariant(candidate) {
  const variants = candidate.split(':').slice(0, -1);
  return new Set(variants).size !== variants.length;
}

function hasGeneratedCandidate(css, candidate) {
  const escaped = escapeCssIdentifier(candidate);
  if (css.includes(`.${escaped}`) || css.includes(`.${escaped},`)) {
    return true;
  }
  const normalizedCss = css
    .replaceAll(/\\([0-9a-fA-F]{1,6})\s?/g, (_, codePoint) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    )
    .replaceAll(/\\(.)/g, '$1');
  return normalizedCss.includes(`.${candidate}`);
}

function escapeCssIdentifier(value) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const character = value[index];
    if (
      (index === 0 && code >= 48 && code <= 57) ||
      (index === 1 && code >= 48 && code <= 57 && value[0] === '-')
    ) {
      result += `\\${code.toString(16)}`;
    } else if (
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      character === '-' ||
      character === '_'
    ) {
      result += character;
    } else {
      result += `\\${character}`;
    }
  }
  return result;
}

function addLocation(candidates, candidate, source) {
  const firstIndex = source.content.indexOf(candidate);
  const precedingText = source.content.slice(
    Math.max(0, firstIndex - 80),
    firstIndex,
  );
  if (/transition-\[[^\]]*$/.test(precedingText)) {
    return;
  }
  const locations = candidates.get(candidate) ?? [];
  if (!locations.some((location) => location.file === source.relative)) {
    locations.push({
      file: source.relative,
      line: lineNumberAt(source.content, firstIndex),
    });
  }
  candidates.set(candidate, locations);
}

function lineNumberAt(content, index) {
  return content.slice(0, Math.max(index, 0)).split('\n').length;
}

function formatLocations(locations, message) {
  return `${locations
    .slice(0, 3)
    .map(({ file, line }) => `${file}:${line}`)
    .join(', ')}: ${message}`;
}
