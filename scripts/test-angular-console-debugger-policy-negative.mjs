import assert from "node:assert/strict";
import { collectConsoleDebuggerViolations } from "./check-angular-console-debugger-policy.mjs";

const violations1 = collectConsoleDebuggerViolations(
  "MercurionWebNg/src/app/pages/test.page.ts",
  "const x = 1;\nconsole.log(x);",
);
assert.equal(violations1.length, 1);
assert.match(violations1[0], /ad-hoc console call/);

const violations2 = collectConsoleDebuggerViolations(
  "MercurionWebNg/src/app/services/test.service.ts",
  "function debugMe() {\n  debugger;\n}",
);
assert.equal(violations2.length, 1);
assert.match(violations2[0], /debugger statement/);

const violationsLogger = collectConsoleDebuggerViolations(
  "MercurionWebNg/src/app/services/logger.service.ts",
  "console.warn(msg);",
);
assert.equal(violationsLogger.length, 0);

console.log("Angular console and debugger policy negative check passed.");
