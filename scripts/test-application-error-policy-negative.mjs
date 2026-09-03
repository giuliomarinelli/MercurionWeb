import assert from "node:assert/strict";
import { collectApplicationErrorPolicyViolations } from "./check-application-error-policy.mjs";

const directRpcViolations = collectApplicationErrorPolicyViolations(
  "bad-rpc-producer.ts",
  "throw new RpcException('UnmanagedError')",
);
assert.equal(directRpcViolations.length, 1);

const messageBranchViolations = collectApplicationErrorPolicyViolations(
  "bad-message-branch.ts",
  "if (error.message === 'Forbidden::missing permissions') return false",
);
assert.equal(messageBranchViolations.length, 1);

console.log("Application error catalog policy negative checks passed.");
