import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const angularSourceRoot = path.join(repositoryRoot, 'MercurionWebNg', 'src');

function walkProductionTypeScript(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkProductionTypeScript(fullPath);
    }
    return entry.isFile()
      && entry.name.endsWith('.ts')
      && !entry.name.endsWith('.spec.ts')
      && !entry.name.endsWith('.test.ts')
      ? [fullPath]
      : [];
  });
}

function lineNumberAt(source, index) {
  return source.slice(0, index).split('\n').length;
}

function watcherAnnotationBefore(source, index) {
  const currentLineStart = source.lastIndexOf('\n', index - 1) + 1;
  const prefixLines = source.slice(0, currentLineStart).split('\n');
  for (let lineIndex = prefixLines.length - 1; lineIndex >= 0; lineIndex -= 1) {
    const line = prefixLines[lineIndex].trim();
    if (line === '') continue;
    return line.startsWith('// graphql-watch:') ? line : null;
  }
  return null;
}

function callSourceFrom(source, matchIndex) {
  const openParenthesis = source.indexOf('(', matchIndex);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openParenthesis; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '\'' || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(matchIndex, index + 1);
    }
  }

  return source.slice(matchIndex);
}

export function collectGraphqlQueryPolicyViolations(filePath, source) {
  const violations = [];
  const watcherPattern = /\.watchQuery(?:<[\s\S]*?>)?\s*\(/g;
  const queryPattern = /\.query<[\s\S]*?>\s*\(/g;

  for (const match of source.matchAll(queryPattern)) {
    const callSource = callSourceFrom(source, match.index);
    if (!/fetchPolicy\s*:/.test(callSource)) {
      violations.push(
        `${filePath}:${lineNumberAt(source, match.index)} Apollo query requires an explicit fetchPolicy`,
      );
    }
  }

  for (const match of source.matchAll(watcherPattern)) {
    const annotation = watcherAnnotationBefore(source, match.index);
    const location = `${filePath}:${lineNumberAt(source, match.index)}`;

    if (!annotation) {
      violations.push(
        `${location} watchQuery requires a graphql-watch owner/teardown/policy rationale`,
      );
      continue;
    }

    for (const field of ['policy=', 'owner=', 'teardown=', 'reason=']) {
      if (!annotation.includes(field)) {
        violations.push(`${location} graphql-watch annotation is missing ${field}`);
      }
    }

    const callSource = callSourceFrom(source, match.index);
    const isNetworkOnly = /fetchPolicy\s*:\s*['"]network-only['"]/.test(callSource)
      || annotation.includes('policy=network-only');
    if (isNetworkOnly && !annotation.includes('allow-network-only=true')) {
      violations.push(
        `${location} network-only watcher requires allow-network-only=true with its rationale`,
      );
    }
  }

  return violations;
}

export function checkAngularGraphqlQueryPolicy() {
  const violations = walkProductionTypeScript(angularSourceRoot).flatMap((filePath) =>
    collectGraphqlQueryPolicyViolations(
      path.relative(repositoryRoot, filePath),
      fs.readFileSync(filePath, 'utf8'),
    ),
  );

  if (violations.length > 0) {
    throw new Error(
      `Angular GraphQL query lifecycle policy violations:\n${violations.join('\n')}`,
    );
  }
}

if (
  process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkAngularGraphqlQueryPolicy();
  console.log('Angular GraphQL query lifecycle policy check passed.');
}
