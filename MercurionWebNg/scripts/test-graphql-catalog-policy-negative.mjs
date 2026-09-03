import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, '..');
const policyPath = path.join(
  scriptsDirectory,
  'check-graphql-catalog-policy.mjs',
);
const fixturePath = 'scripts/fixtures/inline-executable-gql.ts';
const result = spawnSync(
  process.execPath,
  [policyPath, '--extra-source', fixturePath],
  {
    cwd: workspaceRoot,
    encoding: 'utf8',
  },
);
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

if (
  result.status === 0
  || !output.includes(
    'executable gql definitions are forbidden outside the static GraphQL catalog',
  )
) {
  console.error(output.trim());
  throw new Error(
    'GraphQL catalog policy did not reject the intentional inline gql fixture.',
  );
}

console.log(
  'Negative GraphQL catalog-policy probe passed: the inline executable gql fixture was rejected.',
);
