import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const rpcAdapterPath = path.join(
  repositoryRoot,
  "MercurionWebNode",
  "src",
  "exception-handling",
  "application-error.ts",
);
const sourceRoots = [
  path.join(repositoryRoot, "MercurionWebNode", "src"),
  path.join(repositoryRoot, "MercurionWebNg", "src", "app"),
];

export function collectApplicationErrorPolicyViolations(
  filePath,
  sourceText,
) {
  const source = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
  );
  const violations = [];

  function addViolation(node, message) {
    const { line, character } = source.getLineAndCharacterOfPosition(
      node.getStart(source),
    );
    violations.push(`${filePath}:${line + 1}:${character + 1} ${message}`);
  }

  function visit(node) {
    if (
      path.resolve(filePath) !== rpcAdapterPath &&
      ts.isNewExpression(node) &&
      node.expression.getText(source) === "RpcException"
    ) {
      addViolation(
        node,
        "construct application errors through applicationError()",
      );
    }

    if (isStringErrorBranch(node, source)) {
      addViolation(
        node,
        "branch on ApplicationErrorCode instead of error message/detail text",
      );
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return violations;
}

function isStringErrorBranch(node, source) {
  if (
    ts.isBinaryExpression(node) &&
    isEqualityOperator(node.operatorToken.kind)
  ) {
    return (
      (isErrorTextExpression(node.left, source) &&
        isStaticString(node.right)) ||
      (isErrorTextExpression(node.right, source) && isStaticString(node.left))
    );
  }

  if (
    ts.isSwitchStatement(node) &&
    isErrorTextExpression(node.expression, source) &&
    node.caseBlock.clauses.some(
      (clause) => ts.isCaseClause(clause) && isStaticString(clause.expression),
    )
  ) {
    return true;
  }

  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ["startsWith", "endsWith", "includes"].includes(node.expression.name.text)
  ) {
    const receiver = node.expression.expression;
    if (
      isErrorTextExpression(receiver, source) &&
      node.arguments.some(isStaticString)
    ) {
      return true;
    }

    if (
      ts.isArrayLiteralExpression(receiver) &&
      receiver.elements.some(isStaticString) &&
      node.arguments.some((argument) => isErrorTextExpression(argument, source))
    ) {
      return true;
    }
  }

  return false;
}

function isEqualityOperator(kind) {
  return [
    ts.SyntaxKind.EqualsEqualsToken,
    ts.SyntaxKind.EqualsEqualsEqualsToken,
    ts.SyntaxKind.ExclamationEqualsToken,
    ts.SyntaxKind.ExclamationEqualsEqualsToken,
  ].includes(kind);
}

function isErrorTextExpression(node, source) {
  if (!ts.isPropertyAccessExpression(node)) {
    return false;
  }

  if (!["message", "detail"].includes(node.name.text)) {
    return false;
  }

  const root = node.expression.getText(source).split(/[.[\]]/, 1)[0];
  return /^(e|err|error|body|original|he|applicationError)$/i.test(root);
}

function isStaticString(node) {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function walkTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkTypeScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

export function checkRepositoryApplicationErrorPolicy() {
  const violations = sourceRoots.flatMap((sourceRoot) =>
    walkTypeScriptFiles(sourceRoot).flatMap((filePath) =>
      collectApplicationErrorPolicyViolations(
        filePath,
        fs.readFileSync(filePath, "utf8"),
      ),
    ),
  );

  if (violations.length > 0) {
    throw new Error(
      `Application error policy violations:\n${violations.join("\n")}`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkRepositoryApplicationErrorPolicy();
  console.log("Application error catalog policy passed.");
}
