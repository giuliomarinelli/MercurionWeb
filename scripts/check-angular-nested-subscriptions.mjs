import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const sourceRoot = join(process.cwd(), 'MercurionWebNg', 'src');
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
  const subscriptions = [];
  let line = 1;

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') line += 1;
    if (!source.startsWith('.subscribe(', index)) continue;

    let cursor = index + '.subscribe('.length;
    let depth = 1;
    for (; cursor < source.length && depth > 0; cursor += 1) {
      if (source[cursor] === '(') depth += 1;
      if (source[cursor] === ')') depth -= 1;
    }

    const parent = subscriptions.find(subscription => index < subscription.end);
    if (parent) {
      violations.push(`${relative(process.cwd(), file)}:${line} nested subscribe inside subscription at line ${parent.line}`);
    }
    subscriptions.push({ end: cursor, line });
    for (let position = subscriptions.length - 1; position >= 0; position -= 1) {
      if (subscriptions[position].end <= index) subscriptions.splice(position, 1);
    }
  }
}

await scanDirectory(sourceRoot);
if (violations.length > 0) {
  console.error('Nested subscriptions must use an explicit RxJS concurrency operator instead:\n' + violations.join('\n'));
  process.exit(1);
}

console.log('Angular nested subscription policy passed.');
