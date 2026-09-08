import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const sourceRoot = join(process.cwd(), 'MercurionWebNg', 'src', 'app');
const violations = [];

async function scanDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanDirectory(file);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      scanSource(file, await readFile(file, 'utf8'));
    }
  }
}

function scanSource(file, source) {
  if (!source.includes('@Component(')) return;

  const decoratorStart = source.indexOf('@Component(');
  const openBrace = source.indexOf('{', decoratorStart);
  if (openBrace < 0) {
    violations.push(`${relative(process.cwd(), file)}: malformed @Component decorator`);
    return;
  }

  const decoratorEnd = findMatchingBrace(source, openBrace);
  if (decoratorEnd < 0) {
    violations.push(`${relative(process.cwd(), file)}: malformed @Component decorator`);
    return;
  }

  const decorator = source.slice(openBrace, decoratorEnd + 1);
  if (!/\bchangeDetection\s*:\s*ChangeDetectionStrategy\.OnPush\b/.test(decorator)) {
    const line = source.slice(0, decoratorStart).split('\n').length;
    violations.push(`${relative(process.cwd(), file)}:${line} missing changeDetection: ChangeDetectionStrategy.OnPush`);
  }
}

function findMatchingBrace(source, openBrace) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (lineComment) {
      if (char === '\n') lineComment = false;
      continue;
    }

    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

await scanDirectory(sourceRoot);

if (violations.length > 0) {
  console.error('Angular production components must use ChangeDetectionStrategy.OnPush:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('Angular component change-detection strategy policy passed.');
