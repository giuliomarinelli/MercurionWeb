import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectTokenViolations } from './check-angular-design-tokens.mjs';

const fixture = await mkdtemp(join(tmpdir(), 'mercurion-ui-tokens-'));
try {
  await mkdir(join(fixture, 'src'), { recursive: true });
  const fixtureFile = join(fixture, 'src', 'fixture.css');
  await writeFile(fixtureFile, '.fixture { color: #123456; }', 'utf8');
  const violations = collectTokenViolations(
    await (await import('node:fs/promises')).readFile(fixtureFile, 'utf8'),
    'src/fixture.css',
  );
  if (!violations.some(violation => violation.includes('hex color literal'))) {
    throw new Error('The token check did not reject the forbidden fixture literal.');
  }
  console.log('Angular semantic token negative check passed.');
} finally {
  await rm(fixture, { recursive: true, force: true });
}
