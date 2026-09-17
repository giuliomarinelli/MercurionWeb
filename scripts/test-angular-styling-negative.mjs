import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const repositoryRoot = process.cwd();
const fixtureRoot = path.join(repositoryRoot, 'scripts', 'fixtures', 'angular-styling-negative');
const cases = [
  ['malformed-variant', 'dark:dark:bg-neutral-900/75'],
  ['unknown-utility', 'bg-not-a-real-tailwind-utility'],
  ['dynamic-class', 'Tailwind class construction'],
  ['invalid-css', 'invalid value "3px" for scrollbar-width'],
];

for (const [name, expectedText] of cases) {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mercurion-angular-styling-'));
  try {
    fs.cpSync(path.join(fixtureRoot, name), temporaryRoot, { recursive: true });
    let failed = false;
    try {
      execFileSync(
        process.execPath,
        [
          'scripts/check-angular-styling.mjs',
          '--root',
          temporaryRoot,
          '--tailwind-config',
          'MercurionWebNg/tailwind.config.js',
        ],
        { cwd: repositoryRoot, stdio: 'pipe', encoding: 'utf8' },
      );
    } catch (error) {
      failed = true;
      const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
      if (!output.includes(expectedText)) {
        throw new Error(
          `Negative fixture "${name}" failed, but not for "${expectedText}":\n${output}`,
        );
      }
    }
    if (!failed) {
      throw new Error(`Negative fixture "${name}" unexpectedly passed`);
    }
    console.log(`Angular styling negative fixture passed: ${name}`);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}
