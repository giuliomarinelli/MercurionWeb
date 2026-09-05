import assert from "node:assert/strict";
import { collectAngularEnvironmentImportBoundaryViolations } from "./check-angular-environment-import-boundaries.mjs";

const violations = collectAngularEnvironmentImportBoundaryViolations(
  "bad-environment-import.ts",
  "import { environment } from '../environments/environment.development';",
);

assert.equal(violations.length, 1);

const testViolations = collectAngularEnvironmentImportBoundaryViolations(
  "environment-import-boundary.spec.ts",
  "import { environment } from '../environments/environment.testing';",
);

assert.equal(testViolations.length, 0);
console.log("Angular environment import boundary negative check passed.");
