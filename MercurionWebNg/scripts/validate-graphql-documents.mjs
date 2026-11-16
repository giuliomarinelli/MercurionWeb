import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSchema,
  Kind,
  parse,
  Source,
  validate,
} from 'graphql';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const catalogRoot = path.join(
  workspaceRoot,
  'src/app/graphql/documents',
);
const schemaPath = path.resolve(
  workspaceRoot,
  '../MercurionWebNode/src/schema.graphql',
);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function relativeLabel(filePath) {
  return toPosix(path.relative(workspaceRoot, filePath));
}

async function collectGraphqlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectGraphqlFiles(fullPath));
    } else if (/\.(?:graphql|gql)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function readExtraDocumentArguments(argv) {
  const extraDocuments = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--extra-document') {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = argv[index + 1];
    if (!value) {
      throw new Error('--extra-document requires a path');
    }

    extraDocuments.push(path.resolve(workspaceRoot, value));
    index += 1;
  }

  return extraDocuments;
}

async function main() {
  const catalogPaths = await collectGraphqlFiles(catalogRoot);
  const extraDocumentPaths = readExtraDocumentArguments(
    process.argv.slice(2),
  );
  const documentPaths = [...catalogPaths, ...extraDocumentPaths];
  const failures = [];
  const definitions = [];
  const operationOccurrences = [];
  let fragmentCount = 0;

  for (const filePath of documentPaths) {
    const label = relativeLabel(filePath);
    let document;

    try {
      document = parse(
        new Source(await readFile(filePath, 'utf8'), label),
      );
    } catch (error) {
      failures.push(`${label}: ${error.message}`);
      continue;
    }

    definitions.push(...document.definitions);

    document.definitions.forEach((definition, definitionIndex) => {
      if (definition.kind === Kind.FRAGMENT_DEFINITION) {
        fragmentCount += 1;
        return;
      }
      if (definition.kind !== Kind.OPERATION_DEFINITION) {
        return;
      }

      const name = definition.name?.value;
      if (!name) {
        failures.push(
          `${label}: anonymous ${definition.operation} operations are not supported`,
        );
        return;
      }

      operationOccurrences.push({
        name,
        kind: definition.operation,
        label,
        definitionIndex,
      });
    });
  }

  const occurrencesByName = new Map();
  for (const occurrence of operationOccurrences) {
    const occurrences = occurrencesByName.get(occurrence.name) ?? [];
    occurrences.push(occurrence);
    occurrencesByName.set(occurrence.name, occurrences);
  }

  for (const [name, occurrences] of occurrencesByName) {
    if (occurrences.length > 1) {
      failures.push(
        `Duplicate GraphQL operation name "${name}": ${occurrences.map(
          occurrence =>
            `${occurrence.kind} at ${occurrence.label} (definition ${occurrence.definitionIndex + 1})`,
        ).join('; ')}`,
      );
    }
  }

  const combinedDocument = {
    kind: Kind.DOCUMENT,
    definitions,
  };
  const schema = buildSchema(await readFile(schemaPath, 'utf8'));
  for (const error of validate(schema, combinedDocument)) {
    const location = error.source?.name
      ? `${error.source.name}${error.locations?.[0]
        ? `:${error.locations[0].line}:${error.locations[0].column}`
        : ''}: `
      : '';
    failures.push(`${location}${error.message}`);
  }

  console.log(
    `GraphQL catalog inventory: ${catalogPaths.length} files, ${operationOccurrences.length} named operations, ${fragmentCount} fragments.`,
  );
  for (const filePath of catalogPaths) {
    console.log(`- ${relativeLabel(filePath)}`);
  }

  if (failures.length > 0) {
    console.error(
      `GraphQL validation failed with ${failures.length} error(s):`,
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    'Every catalogued Angular GraphQL document is valid against the committed Nest schema and operation names are unique.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
