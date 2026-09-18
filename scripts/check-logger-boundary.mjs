import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const applicationRoot = path.join(repositoryRoot, "MercurionWebNode", "src");
const adapterRoot = path.join(applicationRoot, "app_modules", "meilisearch");
const compositionRoot = path.join(applicationRoot, "logging", "logging.module.ts");
const forbiddenImportPattern =
  /(?:from\s+|import\s*\(\s*|require\s*\(\s*|export\s+(?:type\s+)?\*\s+from\s+)["'][^"']*(?:meili-logger\.service|meili-context-logger(?:\.interface)?)["']/g;

function walkTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkTypeScriptFiles(fullPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [fullPath] : [];
  });
}

export function collectLoggerBoundaryViolations(filePath, sourceText) {
  return [...sourceText.matchAll(forbiddenImportPattern)].map((match) => {
    const line = sourceText.slice(0, match.index).split("\n").length;
    return `${filePath}:${line} imports the Meilisearch logger adapter; depend on LoggerPort`;
  });
}

export function checkLoggerBoundary() {
  const violations = walkTypeScriptFiles(applicationRoot)
    .filter(
      (filePath) =>
        !filePath.startsWith(adapterRoot) && filePath !== compositionRoot,
    )
    .flatMap((filePath) =>
      collectLoggerBoundaryViolations(
        path.relative(repositoryRoot, filePath),
        fs.readFileSync(filePath, "utf8"),
      ),
    );

  if (violations.length > 0) {
    throw new Error(`Logger boundary violations:\n${violations.join("\n")}`);
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkLoggerBoundary();
  console.log("Logger boundary policy passed.");
}
