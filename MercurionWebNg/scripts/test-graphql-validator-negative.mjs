import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptsDirectory, '..');
const validatorPath = path.join(
  scriptsDirectory,
  'validate-graphql-documents.mjs',
);

function assertRejected(fixturePath, expectedDiagnostic, description) {
  const result = spawnSync(
    process.execPath,
    [validatorPath, '--extra-document', fixturePath],
    {
      cwd: workspaceRoot,
      encoding: 'utf8',
    },
  );
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

  if (result.status === 0 || !output.includes(expectedDiagnostic)) {
    console.error(output.trim());
    throw new Error(`GraphQL validator did not reject ${description}.`);
  }
}

assertRejected(
  'scripts/fixtures/invalid-field.graphql',
  'Cannot query field "definitelyInvalidField"',
  'the intentional invalid-field fixture',
);
assertRejected(
  'scripts/fixtures/duplicate-operation-name.graphql',
  'Duplicate GraphQL operation name "MyMoleculeCollections"',
  'the intentional duplicate-operation-name fixture',
);

console.log(
  'Negative GraphQL fixture probes passed: invalid fields and duplicate operation names were rejected.',
);
