import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const angularSourceRoot = path.join(repositoryRoot, "MercurionWebNg", "src");

function walkApplicationFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return walkApplicationFiles(fullPath);
    }

    return entry.isFile() &&
      entry.name.endsWith(".ts") &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".test.ts")
      ? [fullPath]
      : [];
  });
}

export function collectConsoleDebuggerViolations(filePath, content) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const isApprovedLogger =
    normalizedPath.endsWith("app/services/logger.service.ts") ||
    normalizedPath.endsWith("main.ts");

  if (isApprovedLogger) {
    return [];
  }

  const lines = content.split("\n");
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("//") || trimmed.startsWith("*")) {
      continue;
    }

    if (/\bdebugger\b/.test(line)) {
      violations.push(`${filePath}:${i + 1} contains debugger statement`);
    }

    if (/\bconsole\.(log|warn|error|info|debug|trace|dir|table)\b/.test(line)) {
      violations.push(
        `${filePath}:${i + 1} contains ad-hoc console call outside approved logger`,
      );
    }
  }

  return violations;
}

export function checkAngularConsoleDebuggerPolicy() {
  const allViolations = walkApplicationFiles(angularSourceRoot).flatMap(
    (filePath) => {
      const content = fs.readFileSync(filePath, "utf8");
      return collectConsoleDebuggerViolations(filePath, content);
    },
  );

  if (allViolations.length > 0) {
    throw new Error(
      `Direct debugger or ad-hoc console usage in production Angular code violates logging policy:\n${allViolations.join("\n")}`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkAngularConsoleDebuggerPolicy();
  console.log("Angular console and debugger policy check passed.");
}
