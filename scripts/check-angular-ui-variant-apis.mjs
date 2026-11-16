import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const repositoryRoot = resolve(import.meta.dirname, '..');
const roots = [
  resolve(repositoryRoot, 'MercurionWebNg', 'src', 'app', 'components', 'common'),
  resolve(repositoryRoot, 'MercurionWebNg', 'src', 'app', 'components', 'action-components'),
];

const publicStylingInputPattern =
  /\b(?:readonly\s+)?(?:[A-Za-z_$][\w$]*(?:Class|Classes|classList|ClassList)|classList)\s*=\s*input\s*[<(]/g;

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    else if (entry.name.endsWith('.component.ts')) files.push(path);
  }
  return files;
}

export async function findUiVariantApiViolations(rootDirectories = roots) {
  const violations = [];
  for (const root of rootDirectories) {
    for (const file of await collect(root)) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(publicStylingInputPattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push(
          `${relative(repositoryRoot, file)}:${line} public styling-internal input "${match[0].trim()}"`,
        );
      }
    }
  }
  return violations;
}

const violations = await findUiVariantApiViolations();
if (violations.length) {
  console.error(
    `Canonical UI primitives must expose semantic variant APIs, not styling classes:\n${violations.join('\n')}`,
  );
  process.exit(1);
}

console.log('Angular UI variant API policy passed.');
