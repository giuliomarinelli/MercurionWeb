import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceRoots = [
  path.join(repositoryRoot, "MercurionWebNode", "src"),
  path.join(repositoryRoot, "MercurionWebNg", "src", "app"),
];
const privateGraphQLImportPattern =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|export\s+(?:type\s+)?\*\s+from\s+)["']graphql\/[^"']+["']/g;

export function collectGraphQLInternalImportViolations(filePath, sourceText) {
  return [...sourceText.matchAll(privateGraphQLImportPattern)].map((match) => {
    const beforeMatch = sourceText.slice(0, match.index);
    const line = beforeMatch.split("\n").length;
    const column = match.index - beforeMatch.lastIndexOf("\n");
    return `${filePath}:${line}:${column} imports a private GraphQL subpath; use the public graphql entrypoint or application types`;
  });
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

export function checkRepositoryGraphQLInternalImportPolicy() {
  const violations = sourceRoots.flatMap((sourceRoot) =>
    walkTypeScriptFiles(sourceRoot).flatMap((filePath) =>
      collectGraphQLInternalImportViolations(
        filePath,
        fs.readFileSync(filePath, "utf8"),
      ),
    ),
  );

  if (violations.length > 0) {
    throw new Error(
      `GraphQL internal import policy violations:\n${violations.join("\n")}`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkRepositoryGraphQLInternalImportPolicy();
  console.log("GraphQL internal import policy passed.");
}
