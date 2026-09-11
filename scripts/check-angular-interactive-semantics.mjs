import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const sourceRoot = join(process.cwd(), 'MercurionWebNg', 'src');
const violations = [];
const genericElements = 'div|span';
const interactiveBinding = new RegExp(
  `<(?:${genericElements})\\b[^>]*\\((?:click|keydown|keyup|keypress)\\)[^>]*>`,
  'g',
);
const genericButtonRole = new RegExp(
  `<(?:${genericElements})\\b[^>]*\\brole\\s*=\\s*["']button["'][^>]*>`,
  'g',
);
const anchorCommand = /<a\b[^>]*\(click\)[^>]*>/g;

async function scanDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanDirectory(file);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      scanSource(file, await readFile(file, 'utf8'));
    } else if (entry.name.endsWith('.html')) {
      scanSource(file, await readFile(file, 'utf8'));
    }
  }
}

function reportMatches(file, source, pattern, message, isViolation = () => true) {
  for (const match of source.matchAll(pattern)) {
    if (!isViolation(match[0])) continue;
    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${relative(process.cwd(), file)}:${line} ${message}: ${match[0].replace(/\s+/g, ' ').trim()}`);
  }
}

function scanSource(file, source) {
  reportMatches(
    file,
    source,
    interactiveBinding,
    'generic elements must use native interactive semantics',
    match =>
      !/\(click\)\s*=\s*"\$event\.stopPropagation\(\)"/.test(match) &&
      !/\brole\s*=\s*["'](?:dialog|option)["']/.test(match),
  );
  reportMatches(
    file,
    source,
    genericButtonRole,
    'generic role=button must be migrated to a native button',
    match =>
      !/\(click\)\s*=\s*"\$event\.stopPropagation\(\)"/.test(match) &&
      !/\brole\s*=\s*["'](?:dialog|option)["']/.test(match),
  );
  reportMatches(
    file,
    source,
    anchorCommand,
    'anchors with click handlers must retain navigation semantics',
    match => !/(?:\bhref\s*=|\[routerLink\]\s*=|\brouterLink\s*=)/.test(match),
  );
}

await scanDirectory(sourceRoot);

if (violations.length > 0) {
  console.error('Angular interactive semantics policy failed:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('Angular interactive semantics policy passed.');
