import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(import.meta.dirname, '..');
const defaultTargets = [
  'MercurionWebNg/src/app/components/common/button/button.component.ts',
  'MercurionWebNg/src/app/components/common/action-card/action-card.component.ts',
  'MercurionWebNg/src/app/components/common/toast/toast.component.ts',
];

const rawPatterns = [
  { pattern: /#[0-9a-f]{3,8}\b/gi, message: 'hex color literal' },
  { pattern: /\b(?:rgba?|hsla?)\([^)]*\)/gi, message: 'color function literal' },
  { pattern: /\b(?:white|black)\b/gi, message: 'named color literal' },
  {
    pattern: /\b(?:box-shadow|text-shadow)\s*:\s*(?!var\()[^;{}]+/gi,
    message: 'literal shadow',
  },
  {
    pattern: /(?:bg|text|border|shadow|rounded|p[trblxy]?|m[trblxy]?)-\[[^\]]+\]/g,
    message: 'arbitrary Tailwind visual value',
  },
];

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
}

function isTokenDeclaration(line) {
  return /--(?:color|shadow|space|radius|font)-[\w-]+\s*:/.test(line);
}

function isAllowedMatch(source, matchIndex, matchText) {
  const lineStart = source.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = source.indexOf('\n', matchIndex);
  const line = source.slice(lineStart, lineEnd === -1 ? source.length : lineEnd);
  return (
    isTokenDeclaration(line) ||
    /url\([^)]*\)/i.test(line) ||
    /var\(--[\w-]+\)/.test(matchText) ||
    /\b(?:transparent|currentColor|inherit)\b/i.test(matchText)
  );
}

export function collectTokenViolations(source, fileName) {
  const violations = [];
  const withoutComments = stripComments(source);

  for (const { pattern, message } of rawPatterns) {
    for (const match of withoutComments.matchAll(pattern)) {
      if (isAllowedMatch(withoutComments, match.index, match[0])) continue;
      const line = withoutComments.slice(0, match.index).split('\n').length;
      violations.push(`${fileName}:${line} ${message}: ${match[0]}`);
    }
  }

  return violations;
}

async function scanFiles(root, files) {
  const violations = [];
  for (const file of files) {
    const absolute = resolve(root, file);
    if (!existsSync(absolute)) continue;
    const source = await readFile(absolute, 'utf8');
    violations.push(...collectTokenViolations(source, relative(root, absolute)));
  }
  return violations;
}

export async function runTokenCheck(rootArgument) {
  const root = resolve(rootArgument || repositoryRoot);
  let targetFiles = rootArgument ? [] : defaultTargets;
  if (rootArgument) {
    const { readdir } = await import('node:fs/promises');
    async function collect(directory) {
      const result = [];
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        const file = join(directory, entry.name);
        if (entry.isDirectory()) result.push(...(await collect(file)));
        else if (/\.(?:css|scss|html|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts')) {
          result.push(relative(root, file));
        }
      }
      return result;
    }
    targetFiles = await collect(root);
  }

  const violations = await scanFiles(root, targetFiles);
  if (violations.length) {
    console.error(`Angular semantic token check failed:\n${violations.join('\n')}`);
    return false;
  }

  console.log(`Angular semantic token check passed (${targetFiles.length} governed files).`);
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rootArgument = process.argv.find(value => value.startsWith('--root='));
  const passed = await runTokenCheck(rootArgument?.slice('--root='.length));
  if (!passed) process.exit(1);
}
