import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = join(process.cwd(), 'MercurionWebNg', 'src', 'app');
const legacyDecoratorPattern = /@\s*(?:Input|Output|ViewChild|ViewChildren|ContentChild|ContentChildren)\s*(?:\(|\n|$)/g;
const legacyEmitterPattern = /\bnew\s+EventEmitter\s*(?:<[^>]*>)?\s*\(/g;
const parameterizedConstructorPattern = /constructor\s*\(\s*[^)\s][\s\S]*?\)/g;

export function collectModernComponentApiViolations(file, source) {
  if (!source.includes('@Component(')) return [];

  const violations = [];
  const checks = [
    [legacyDecoratorPattern, 'legacy Angular component decorator'],
    [legacyEmitterPattern, 'EventEmitter output'],
    [parameterizedConstructorPattern, 'constructor parameter injection'],
  ];

  for (const [pattern, description] of checks) {
    pattern.lastIndex = 0;
    const match = pattern.exec(source);
    if (!match) continue;
    const line = source.slice(0, match.index).split('\n').length;
    violations.push(`${file}:${line} ${description} is forbidden in production components`);
  }

  return violations;
}

async function scanDirectory(directory, violations) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      await scanDirectory(file, violations);
    } else if (entry.name.endsWith('.component.ts') && !entry.name.endsWith('.spec.ts')) {
      const source = await readFile(file, 'utf8');
      violations.push(...collectModernComponentApiViolations(relative(process.cwd(), file), source));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const violations = [];
  await scanDirectory(sourceRoot, violations);

  if (violations.length > 0) {
    console.error('Angular production components must use functional input/output/query APIs and inject():\n' + violations.join('\n'));
    process.exit(1);
  }

  console.log('Angular modern component API policy passed.');
}
