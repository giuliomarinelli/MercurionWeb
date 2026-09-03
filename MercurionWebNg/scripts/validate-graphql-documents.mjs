import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildSchema,
  Kind,
  NoUnusedFragmentsRule,
  parse,
  specifiedRules,
  validate,
} from 'graphql';
import ts from 'typescript';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceRoot = path.join(workspaceRoot, 'src');
const schemaPath = path.resolve(
  workspaceRoot,
  '../MercurionWebNode/src/schema.graphql',
);

const collectionFieldVariants = [
  {
    name: 'minimal',
    value: `
      id
      name
    `,
  },
  {
    name: 'withItems',
    value: `
      id
      name
      items {
        id
        item { id label type }
      }
    `,
  },
];

const expectedDynamicOperations = new Set([
  'MyMoleculeCollections',
  'MoleculeCollection',
  'CreateMoleculeCollection',
  'UpdateMoleculeCollection',
]);
const documentValidationRules = specifiedRules.filter(
  (rule) => rule !== NoUnusedFragmentsRule,
);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function sourceLabel(filePath, line) {
  return `${toPosix(path.relative(workspaceRoot, filePath))}:${line}`;
}

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(fullPath));
    } else if (/\.(?:ts|graphql|gql)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function extractGqlTemplates(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const documents = [];
  const extractionErrors = [];

  function visit(node) {
    if (
      ts.isTaggedTemplateExpression(node)
      && ts.isIdentifier(node.tag)
      && node.tag.text === 'gql'
    ) {
      const line = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(sourceFile),
      ).line + 1;
      const label = sourceLabel(filePath, line);

      if (ts.isNoSubstitutionTemplateLiteral(node.template)) {
        documents.push({
          label,
          source: node.template.text,
          dynamicVariant: null,
        });
      } else {
        let variants = [{ name: '', value: node.template.head.text }];

        for (const span of node.template.templateSpans) {
          if (
            !ts.isIdentifier(span.expression)
            || span.expression.text !== 'FIELDS'
          ) {
            extractionErrors.push(
              `${label}: unsupported gql interpolation "${span.expression.getText(sourceFile)}"`,
            );
            variants = [];
            break;
          }

          variants = variants.flatMap((variant) =>
            collectionFieldVariants.map((fieldVariant) => ({
              name: variant.name
                ? `${variant.name}+${fieldVariant.name}`
                : fieldVariant.name,
              value: `${variant.value}${fieldVariant.value}${span.literal.text}`,
            })),
          );
        }

        for (const variant of variants) {
          documents.push({
            label,
            source: variant.value,
            dynamicVariant: variant.name,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { documents, extractionErrors };
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
  const extraDocumentPaths = readExtraDocumentArguments(process.argv.slice(2));
  const schema = buildSchema(await readFile(schemaPath, 'utf8'));
  const sourceFiles = await collectSourceFiles(sourceRoot);
  const documents = [];
  const extractionErrors = [];
  const sourceCounts = new Map();

  for (const filePath of sourceFiles) {
    const source = await readFile(filePath, 'utf8');
    if (filePath.endsWith('.ts')) {
      const extracted = extractGqlTemplates(filePath, source);
      documents.push(...extracted.documents);
      extractionErrors.push(...extracted.extractionErrors);
      if (extracted.documents.length > 0) {
        sourceCounts.set(
          toPosix(path.relative(workspaceRoot, filePath)),
          extracted.documents.length,
        );
      }
    } else {
      documents.push({
        label: sourceLabel(filePath, 1),
        source,
        dynamicVariant: null,
      });
      sourceCounts.set(toPosix(path.relative(workspaceRoot, filePath)), 1);
    }
  }

  for (const filePath of extraDocumentPaths) {
    documents.push({
      label: `${toPosix(path.relative(workspaceRoot, filePath))}:1`,
      source: await readFile(filePath, 'utf8'),
      dynamicVariant: null,
    });
  }

  const failures = [...extractionErrors];
  const dynamicTemplates = new Map();
  const operationOccurrences = [];
  let staticDocumentCount = 0;

  for (const candidate of documents) {
    let document;
    try {
      document = parse(candidate.source);
    } catch (error) {
      failures.push(`${candidate.label}: ${error.message}`);
      continue;
    }

    const operations = document.definitions.filter(
      (definition) => definition.kind === Kind.OPERATION_DEFINITION,
    );

    if (!candidate.dynamicVariant) {
      staticDocumentCount += 1;
    }

    operations.forEach((operation, operationIndex) => {
      const name = operation.name?.value;
      if (!name) {
        failures.push(
          `${candidate.label}: anonymous ${operation.operation} operations are not supported`,
        );
        return;
      }

      const occurrence = {
        name,
        kind: operation.operation,
        label: candidate.label,
        operationIndex,
        dynamicVariant: candidate.dynamicVariant,
      };

      if (candidate.dynamicVariant) {
        const key = `${candidate.label}#${operationIndex + 1}`;
        const existing = dynamicTemplates.get(key);
        if (existing) {
          if (existing.name !== name || existing.kind !== operation.operation) {
            failures.push(
              `${candidate.label}: dynamic operation ${operationIndex + 1} changes identity between variants (${existing.kind} ${existing.name} vs ${operation.operation} ${name})`,
            );
          }
          existing.variants.add(candidate.dynamicVariant);
        } else {
          dynamicTemplates.set(key, {
            ...occurrence,
            variants: new Set([candidate.dynamicVariant]),
          });
        }
      } else {
        operationOccurrences.push(occurrence);
      }
    });

    for (const error of validate(schema, document, documentValidationRules)) {
      const variant = candidate.dynamicVariant
        ? ` [fields=${candidate.dynamicVariant}]`
        : '';
      failures.push(
        `${candidate.label}${variant}: ${error.message}`,
      );
    }
  }

  const observedDynamicOperations = new Set();
  for (const [key, operation] of dynamicTemplates) {
    observedDynamicOperations.add(operation.name);
    if (
      operation.variants.size !== collectionFieldVariants.length
      || !collectionFieldVariants.every(({ name: variantName }) =>
        operation.variants.has(variantName))
    ) {
      failures.push(
        `${key}: expected dynamic variants minimal and withItems; found ${[...operation.variants].join(', ')}`,
      );
    }
    operationOccurrences.push(operation);
  }

  if (
    dynamicTemplates.size !== expectedDynamicOperations.size
    || expectedDynamicOperations.size !== observedDynamicOperations.size
    || ![...expectedDynamicOperations].every((name) =>
      observedDynamicOperations.has(name))
  ) {
    failures.push(
      `Dynamic template inventory mismatch: expected ${[...expectedDynamicOperations].join(', ')}; found ${[...observedDynamicOperations].join(', ') || '<none>'}`,
    );
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
        `Duplicate GraphQL operation name "${name}": ${occurrences.map((occurrence) =>
          `${occurrence.kind} at ${occurrence.label} (operation ${occurrence.operationIndex + 1}${occurrence.dynamicVariant ? ', dynamic template' : ''})`
        ).join('; ')}`,
      );
    }
  }

  const sortedOperationOccurrences = [...operationOccurrences].sort((left, right) =>
    left.name.localeCompare(right.name)
    || left.label.localeCompare(right.label)
    || left.operationIndex - right.operationIndex
  );

  console.log(
    `GraphQL inventory: ${sourceCounts.size} source files, ${staticDocumentCount} static documents, ${dynamicTemplates.size} dynamic templates, ${[...dynamicTemplates.values()].reduce((total, operation) => total + operation.variants.size, 0)} dynamic expansions.`,
  );
  for (const [relativePath, count] of sourceCounts) {
    console.log(`- ${relativePath}: ${count}`);
  }
  console.log(
    `GraphQL operation inventory: ${operationOccurrences.length} named operations, ${occurrencesByName.size} distinct names.`,
  );
  for (const occurrence of sortedOperationOccurrences) {
    const dynamic = occurrence.dynamicVariant ? ' [dynamic template]' : '';
    console.log(
      `- ${occurrence.name}: ${occurrence.kind} at ${occurrence.label} (operation ${occurrence.operationIndex + 1})${dynamic}`,
    );
  }

  if (failures.length > 0) {
    console.error(`GraphQL validation failed with ${failures.length} error(s):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Every Angular GraphQL document is valid against the committed Nest schema.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
