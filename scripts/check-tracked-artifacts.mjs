import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const forbiddenPathPatterns = [
  {
    pattern: /(^|\/)(?:[^/]+\.(?:bak|bk|orig|rej|tmp))$/i,
    reason: "manual backup or temporary file",
  },
  {
    pattern: /(^|\/)(?:jest-results|test-results|test-output|coverage-summary)\.(?:json|xml|html?)$/i,
    reason: "generated test result",
  },
  {
    pattern: /(^|\/)(?:notebook|docs)\.txt$/i,
    reason: "unowned ad hoc text artifact",
  },
  {
    pattern: /(^|\/)[^/]*snapshot[^/]*\.(?:json|txt)$/i,
    reason: "unowned snapshot",
  },
  {
    pattern: /(^|\/)(?:coverage|test-results|dist|out-tsc|\.angular\/cache|reports\/duplication)(?:\/|$)/i,
    reason: "generated output directory",
  },
];

export function collectTrackedArtifactViolations(paths) {
  return paths
    .map((file) => file.split(path.sep).join("/"))
    .flatMap((file) =>
      forbiddenPathPatterns
        .filter(({ pattern }) => pattern.test(file))
        .map(({ reason }) => `${file}: ${reason}`),
    );
}

function trackedPaths() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error((result.stderr || "git ls-files failed").trim());
  }
  return result.stdout.split("\0").filter(Boolean);
}

const violations = collectTrackedArtifactViolations(trackedPaths());
if (violations.length > 0) {
  console.error("Tracked artifact hygiene failed:");
  violations.forEach((violation) => console.error(`  ${violation}`));
  process.exitCode = 1;
} else {
  console.log("Tracked artifact hygiene passed.");
}
