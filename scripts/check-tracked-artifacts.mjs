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

// Source fixture owned by the demo documentation and validated against its schema.
// Other snapshots remain forbidden, including files next to this exact fixture.
const ownedSnapshots = new Map([
  ["MercurionWebNg/docs/portfolio-ux/demo/chembl-snapshot.json", {
    owner: "MercurionWebNg/docs/portfolio-ux/demo/README.md",
    validator: "MercurionWebNg/docs/portfolio-ux/demo/validate.mjs",
  }],
]);

export function collectTrackedArtifactViolations(paths) {
  return paths
    .map((file) => file.split(path.sep).join("/"))
    .flatMap((file) =>
      forbiddenPathPatterns
        .filter(({ pattern, reason }) => pattern.test(file)
          && !(reason === "unowned snapshot" && ownedSnapshots.has(file)))
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

const tracked = trackedPaths();
const violations = collectTrackedArtifactViolations(tracked);
for (const [snapshot, ownership] of ownedSnapshots) {
  if (!tracked.includes(snapshot)) continue;
  if (!tracked.includes(ownership.owner) || !tracked.includes(ownership.validator)) {
    violations.push(`${snapshot}: missing tracked owner or validator`);
    continue;
  }
  const validation = spawnSync(process.execPath, [ownership.validator], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (validation.error || validation.status !== 0) {
    violations.push(`${snapshot}: owned snapshot validation failed`);
    console.error(validation.stderr || validation.error?.message || validation.stdout);
  }
}
if (violations.length > 0) {
  console.error("Tracked artifact hygiene failed:");
  violations.forEach((violation) => console.error(`  ${violation}`));
  process.exitCode = 1;
} else {
  console.log("Tracked artifact hygiene passed.");
}
