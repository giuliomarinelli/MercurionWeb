import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const workspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const sourceRoot = path.join(workspaceRoot, 'src');
const catalogRoot = path.join(
  sourceRoot,
  'app/graphql/documents',
);

function toPosix(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function label(filePath, line) {
  return `${toPosix(path.relative(workspaceRoot, filePath))}:${line}`;
}

function isWithin(directory, filePath) {
  const relativePath = path.relative(directory, filePath);
  return relativePath !== ''
    && !relativePath.startsWith(`..${path.sep}`)
    && relativePath !== '..'
    && !path.isAbsolute(relativePath);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
    } else if (/\.(?:ts|graphql|gql)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function readExtraSourceArguments(argv) {
  const extraSources = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument !== '--extra-source') {
      throw new Error(`Unknown argument: ${argument}`);
    }

    const value = argv[index + 1];
    if (!value) {
      throw new Error('--extra-source requires a path');
    }

    extraSources.push(path.resolve(workspaceRoot, value));
    index += 1;
  }

  return extraSources;
}

function findExecutableGql(filePath, source) {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const gqlIdentifiers = new Set(['gql']);
  const findings = [];

  for (const statement of sourceFile.statements) {
    if (
      ts.isImportDeclaration(statement)
      && ts.isStringLiteral(statement.moduleSpecifier)
      && [
        'apollo-angular',
        '@apollo/client',
        '@apollo/client/core',
      ].includes(statement.moduleSpecifier.text)
      && statement.importClause?.namedBindings
      && ts.isNamedImports(statement.importClause.namedBindings)
    ) {
      for (const specifier of statement.importClause.namedBindings.elements) {
        if ((specifier.propertyName ?? specifier.name).text === 'gql') {
          gqlIdentifiers.add(specifier.name.text);
        }
      }
    }
  }

  function isGqlExpression(node) {
    return (
      ts.isIdentifier(node)
      && gqlIdentifiers.has(node.text)
    ) || (
      ts.isPropertyAccessExpression(node)
      && node.name.text === 'gql'
    );
  }

  function visit(node) {
    if (
      ts.isTaggedTemplateExpression(node)
      && isGqlExpression(node.tag)
    ) {
      findings.push(node);
    } else if (
      ts.isCallExpression(node)
      && isGqlExpression(node.expression)
    ) {
      findings.push(node);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return findings.map(node => label(
    filePath,
    sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    ).line + 1,
  ));
}

async function main() {
  const sourceFiles = await collectFiles(sourceRoot);
  const extraSources = readExtraSourceArguments(process.argv.slice(2));
  const failures = [];

  for (const filePath of [...sourceFiles, ...extraSources]) {
    if (/\.(?:graphql|gql)$/.test(filePath)) {
      if (!isWithin(catalogRoot, filePath)) {
        failures.push(
          `${label(filePath, 1)}: GraphQL documents must live under src/app/graphql/documents`,
        );
      }
      continue;
    }

    const source = await readFile(filePath, 'utf8');
    for (const occurrence of findExecutableGql(filePath, source)) {
      failures.push(
        `${occurrence}: executable gql definitions are forbidden outside the static GraphQL catalog`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      `GraphQL catalog policy failed with ${failures.length} violation(s):`,
    );
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    'GraphQL catalog policy passed: all standalone documents are catalogued and no executable gql definitions exist in TypeScript.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
