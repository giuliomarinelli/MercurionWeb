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

export function checkAngularMockIpPolicy() {
  const violations = walkApplicationFiles(angularSourceRoot).flatMap((filePath) =>
    /x-mock-ip/i.test(fs.readFileSync(filePath, "utf8")) ? [filePath] : [],
  );

  if (violations.length > 0) {
    throw new Error(
      `Angular application code must not send X-Mock-IP:\n${violations.join("\n")}`,
    );
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  checkAngularMockIpPolicy();
  console.log("Angular mock IP policy check passed.");
}
