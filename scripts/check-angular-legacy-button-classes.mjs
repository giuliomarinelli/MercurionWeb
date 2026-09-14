import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

const repositoryRoot = resolve(import.meta.dirname, '..');
export const LEGACY_BUTTON_CLASSES = [
  'btn-accent-primary',
  'btn-accent-primary-hover',
  'btn-outline-accent-primary',
  'btn-outline-accent-primary-hover',
  'btn-accent-secondary',
  'btn-accent-secondary-hover',
  'btn-outline-accent-secondary',
  'btn-outline-accent-secondary-hover',
  'btn-dark',
  'btn-dark-hover',
  'btn-outline-dark',
  'btn-outline-dark-hover',
  'btn-light',
  'btn-light-hover',
  'btn-outline-light',
  'btn-outline-light-hover',
  'btn-outline-slate-200',
  'btn-outline-slate-200-hover',
  'btn-disabled',
  'btn-sm',
  'btn-lg',
  'btn-pill',
  'green-btn',
  'red-btn',
];

const legacyClassPattern = new RegExp(
  `(?<![\\w-])(?:${LEGACY_BUTTON_CLASSES.join('|')})(?![\\w-])`,
  'g',
);
const bareButtonSelectorPattern = /(?<![\w-])\.btn(?![\w-])/g;

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    else if (/\.(?:css|scss|html|ts)$/.test(entry.name)) files.push(path);
  }
  return files;
}

export async function findLegacyButtonClasses(root) {
  const violations = [];
  for (const file of await collectSourceFiles(resolve(root, 'src'))) {
    const source = await readFile(file, 'utf8');
    const matches = [
      ...source.matchAll(legacyClassPattern),
      ...source.matchAll(bareButtonSelectorPattern),
    ].sort((left, right) => left.index - right.index);
    for (const match of matches) {
      const line = source.slice(0, match.index).split('\n').length;
      violations.push(`${file}:${line} ${match[0]}`);
    }
  }
  return violations;
}

const root = resolve(
  process.argv.find((value) => value.startsWith('--root='))?.slice(7) ||
    resolve(repositoryRoot, 'MercurionWebNg'),
);
const violations = await findLegacyButtonClasses(root);
if (violations.length) {
  console.error(
    `Angular legacy button class check failed:\n${violations.join('\n')}`,
  );
  process.exit(1);
}
console.log('Angular legacy button class check passed.');
