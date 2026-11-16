import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const angularSourceRoot = path.join(repositoryRoot, "MercurionWebNg", "src");
const environmentDirectory = path.join(angularSourceRoot, "environments");

export function collectAngularEnvironmentImportBoundaryViolations(
  filePath,
  sourceText,
) {
  if (!isBoundaryCheckedApplicationFile(filePath)) {
    return [];
  }

  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const violations = [];

  function addViolation(moduleSpecifier) {
    const { line, character } = source.getLineAndCharacterOfPosition(
      moduleSpecifier.getStart(source),
    );
    violations.push(
      `${filePath}:${line + 1}:${character + 1} imports an environment-specific variant; import environment.ts instead`,
    );
  }

  function visit(node) {
    const moduleSpecifier = getModuleSpecifier(node);
    if (
      moduleSpecifier &&
      isEnvironmentSpecificVariant(moduleSpecifier.text)
    ) {
      addViolation(moduleSpecifier);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function getModuleSpecifier(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier &&
    ts.isStringLiteralLike(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }

  if (
    ts.isCallExpression(node) &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]) &&
    (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
      (ts.isIdentifier(node.expression) && node.expression.text === "require"))
  ) {
    return node.arguments[0];
  }

  return undefined;
}

function isEnvironmentSpecificVariant(modulePath) {
  return /(?:^|\/)environment\.(?!ts$)[^/]+$/.test(modulePath);
}

function walkTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return fullPath === environmentDirectory ? [] : walkTypeScriptFiles(fullPath);
    }
    return entry.isFile() && isBoundaryCheckedApplicationFile(fullPath)
      ? [fullPath]
      : [];
  });
}

function isBoundaryCheckedApplicationFile(filePath) {
  const fileName = path.basename(filePath);
  return (
    !path.resolve(filePath).startsWith(`${environmentDirectory}${path.sep}`) &&
    fileName.endsWith(".ts") &&
    !fileName.endsWith(".spec.ts") &&
    !fileName.endsWith(".test.ts")
  );
}

export function checkAngularEnvironmentImportBoundaries() {
  const violations = walkTypeScriptFiles(angularSourceRoot).flatMap((filePath) =>
    collectAngularEnvironmentImportBoundaryViolations(
      filePath,
      fs.readFileSync(filePath, "utf8"),
    ),
  );

  if (violations.length > 0) {
    throw new Error(
      `Angular environment import boundary violations:\n${violations.join("\n")}`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkAngularEnvironmentImportBoundaries();
  console.log("Angular environment import boundary check passed.");
}
