import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, '..');
const validatorPath = path.join(
  scriptsDirectory,
  'validate-graphql-documents.mjs',
);
const fixturePath = 'scripts/fixtures/invalid-field.graphql';

const result = spawnSync(
  process.execPath,
  [validatorPath, '--extra-document', fixturePath],
  {
    cwd: workspaceRoot,
    encoding: 'utf8',
  },
);
const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

if (
  result.status === 0
  || !output.includes('Cannot query field "definitelyInvalidField"')
) {
  console.error(output.trim());
  throw new Error(
    'GraphQL validator did not reject the intentional invalid-field fixture.',
  );
}

console.log(
  'Negative GraphQL fixture probe passed: the intentional invalid field was rejected.',
);
