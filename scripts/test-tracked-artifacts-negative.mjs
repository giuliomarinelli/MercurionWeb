import assert from "node:assert/strict";
import { collectTrackedArtifactViolations } from "./check-tracked-artifacts.mjs";

assert.deepEqual(
  collectTrackedArtifactViolations(["MercurionWebNode/jest-results.json"]),
  ["MercurionWebNode/jest-results.json: generated test result"],
);
assert.deepEqual(
  collectTrackedArtifactViolations(["MercurionWebNode/.cache/coverage/index.html"]),
  ["MercurionWebNode/.cache/coverage/index.html: generated output directory"],
);
assert.deepEqual(
  collectTrackedArtifactViolations(["MercurionWebNode/src/config/schema.json"]),
  [],
);
assert.deepEqual(
  collectTrackedArtifactViolations([
    "docs/autonomous-development/artifacts/nest-module-architecture.json",
    "docs/autonomous-development/task/0173-define-snapshot-bounded-idempotent-select-all-semantics.md",
  ]),
  [],
);

console.log("Tracked artifact hygiene negative checks passed.");
