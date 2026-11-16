import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = [
  join(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@playwright', 'test', 'cli.js'),
  'test',
  '--config=playwright/catalog.playwright.config.ts',
];

if (process.argv.includes('--update-snapshots')) {
  args.push('--update-snapshots');
}

const result = spawnSync(process.execPath, args, {
  cwd: join(dirname(fileURLToPath(import.meta.url)), '..'),
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
