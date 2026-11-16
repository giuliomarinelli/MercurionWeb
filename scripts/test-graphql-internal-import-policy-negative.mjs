import assert from "node:assert/strict";
import { collectGraphQLInternalImportViolations } from "./check-graphql-internal-import-policy.mjs";

const violations = collectGraphQLInternalImportViolations(
  "bad-graphql-import.ts",
  "import { Maybe } from 'graphql/jsutils/Maybe';",
);

assert.equal(violations.length, 1);
console.log("GraphQL internal import policy negative check passed.");
