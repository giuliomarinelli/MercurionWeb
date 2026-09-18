import assert from "node:assert/strict";
import { collectLoggerBoundaryViolations } from "./check-logger-boundary.mjs";

const violations = collectLoggerBoundaryViolations(
  "bad-application-import.ts",
  "import { MeiliLoggerService } from './meili-logger.service';",
);

assert.equal(violations.length, 1);
console.log("Logger boundary negative check passed.");
