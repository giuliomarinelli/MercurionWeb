# 0021 - Add REST contract compatibility suite

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create an automated contract suite covering every Angular REST call against the Nest REST contract so mismatches in method, path, query, body, status or response shape fail deterministically.

Source: `SYS-021` in Series `0001`.

## Context

The Series baseline counted 58 Angular REST calls and 71 Nest routes, with no Angular call lacking a server route, but compatibility is currently established only implicitly. Task `0018` classifies server-only routes; this task makes the Angular-consumed REST surface executable as a contract gate.

## Relevant files and modules

- Angular `HttpClient` services under `MercurionWebNg/src/app/services/`
- `MercurionWebNg/src/app/app.config.ts` and interceptors affecting request construction
- Nest controllers under `MercurionWebNode/src/app_modules/**/controllers/`
- `MercurionWebNode/src/main.ts`
- canonical REST contract source introduced by `0001`
- route ownership inventory from `0018`

## In scope

- Reproduce the 58-call baseline and update the inventory for legitimate current changes.
- Represent each client call's verb, effective nginx/API path, query parameters, request body, expected status family and response contract.
- Build contract tests that compare/execute those expectations against Nest metadata/runtime contract without relying on production services.
- Include authentication/validation expectations through controlled test fixtures/mocks where needed.
- Make the suite suitable for local and CI execution.

## Out of scope

- Testing server routes not consumed by Angular except where needed for shared setup; task `0018` owns their classification.
- Full browser E2E coverage of every endpoint.
- Replacing focused unit/service tests.

## Decisions already made

- Every Angular REST call belongs to this contract suite.
- The suite checks verb, path, query, body, status and response contract.
- The canonical REST contract from `0001` should drive types/schemas rather than a second handwritten truth source.

## Requirements

1. Generate or maintain a deterministic inventory mapping all Angular REST call sites to Nest endpoints.
2. Fail if an Angular call has no matching Nest endpoint/contract.
3. Validate HTTP method and effective path including global `/api` prefix/exclusions.
4. Validate query parameter names/types/optionality.
5. Validate request-body contract and server runtime validation expectations.
6. Validate documented success/error status expectations sufficiently to catch incompatible controller changes.
7. Validate response body shape against the canonical contract.
8. Cover all 58 baseline Angular calls or explicitly document legitimate count changes caused by prior tasks.
9. Run in CI without production credentials/data.

## Acceptance criteria

- [x] Every current Angular REST call is represented in the compatibility suite.
- [x] The suite fails on deliberate mismatches of verb, path, query, body, status and response shape.
- [x] The baseline 58 calls are accounted for or count changes are traceable to committed preceding tasks.
- [x] No production service or credential is required.
- [ ] Suite, Angular build/tests and Nest build/tests pass on the exact final feature SHA in canonical CI.
- [x] Existing behaviour not targeted by this task remains compatible.

## Validation

Run the new contract suite and then builds/tests for both applications.

Also perform controlled negative checks (temporary local edits/fixtures only, restored by ordinary file editing) proving each mismatch class makes the suite fail.

## Browser validation

Not required for exhaustive contract coverage. For one representative public/safe call, Chrome DevTools MCP may confirm that runtime traffic through `http://localhost:8888` matches the contract suite's effective path and shape.

## Stop conditions

Block if task `0001` is unresolved and there is no approved canonical REST contract representation from which response/request schemas can be checked without creating another handwritten mirror.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md`
- `0018-classify-or-remove-unowned-rest-routes.md` should be complete or its route inventory available.

## Implementation notes

Prefer extracting contract facts from canonical schemas/controller metadata over manually transcribing 58 expectations that can drift independently. Keep call-site traceability so failures identify the Angular consumer and Nest endpoint involved.

## Execution notes

### Summary

Corrected the previous incomplete implementation on `feature/SYS-021`. The suite now extracts all 58 Angular `HttpClient` call sites with the TypeScript compiler API, matches all 58 to Nest handlers, and fails closed on unmatched routes or semantic contract drift. The recipe remains `DONE` unchecked until the coordinator completes exact feature-SHA and merge-SHA CI.

### Implementation

- **Module** `scripts/rest-route-extraction.mjs`: Shared Nest route extraction using TypeScript AST parsing. It resolves `HttpStatus` constants, default-valued optional parameters, controller/method authorization metadata, thrown HTTP statuses, and return contracts after unwrapping `Promise` and removing `never` branches.

- **Module** `scripts/rest-contract-type-analysis.mjs`: Builds deterministic structural representations of TypeScript contracts, including primitives, literals, unions, intersections, arrays, tuples, object properties, recursive references, and class serialization exclusions. It also tracks whether non-primitive client/server types derive directly from the canonical `@mercurion/rest-contracts` package.

- **Checker** `scripts/check-rest-route-ownership.mjs`: Updated to use the extraction module while preserving the 71-route ownership output. The derived compatibility inventory is explicitly excluded from ownership references.

- **Checker** `scripts/check-rest-compatibility.mjs`: New gate that:
  - discovers production Angular calls by their actual `HttpClient` type instead of a hard-coded receiver name or service filename convention;
  - resolves literals, templates, concatenations, local variables and conditional URL/query construction;
  - records stable call-site identifiers, path/query parameters, request options/body, response mode, status, guards and scopes;
  - compares request and response contracts structurally and verifies their direct relationship to canonical contracts;
  - validates query names, types and optionality, path parameters, success status, response mode and Nest runtime validation metadata;
  - verifies the same-origin Angular client setup, interceptor URL immutability, nginx `/api/` proxy mapping, Nest global prefix and global validation-pipe options;
  - generates a deterministic schema-v3 inventory and rejects all unmatched or incompatible calls.

- **Test** `scripts/test-rest-compatibility-negative.mjs`: Applies six realistic, selected in-memory mutations covering verb, path, query, body, success status and response shape. Every expected failure must identify both the Angular call-site and the matched Nest handler.

- **Contract alignment**: The Angular login payload is explicitly typed with the canonical `Login_FirstStepDTO`; the MFA-strategy controller response is narrowed to the canonical wire union without changing runtime behaviour.

- **Gate** `npm run ci:rest-compatibility`: Registered in `package.json` under `ci:static`, running check + negative test.

### Baseline

- **Client calls extracted**: 58 AST call sites
- **Routes matched**: 58/58 Angular calls against 57 unique Nest endpoints
- **Unmatched entries**: 0
- **Nest routes preserved**: 71
- **Success statuses**: 55 x `200`, 2 x `201`, 1 x `204`

### Validation performed

- ✅ `npm run ci:rest-compatibility` passes: 58/58 matches, all six negative probes, and both ValidationPipe tests.
- ✅ `npm run ci:rest-route-ownership` passes with all 71 routes and its negative test.
- ✅ `npm run ci:contracts` passes all 6 suites and 30 tests.
- ✅ Angular and Nest type checks pass.
- ✅ Angular unit tests pass 303/303; Nest E2E passes 1/1; Angular and Nest builds pass.
- ✅ All GraphQL/generated-artifact checks and the complete static gate pass.
- ✅ Repeated Windows generation and isolated Linux generation are byte-identical with SHA-256 `ba4271dd1c6cc8e69001ea8017b0ecc04ab6178195b317758fba555e178275a7`.
- ✅ The isolated Linux target gate passes after a clean install, including the compatibility checker, all negative probes and ValidationPipe tests.
- ✅ Persisted AST source fragments use platform-neutral LF normalization; the negative suite proves CRLF and LF inputs normalize identically.
- ✅ No production services, credentials, browser or external application runtime were used.

The canonical local `npm ci` completed with zero vulnerabilities. The subsequent full Windows `npm run ci:check` reached Nest Jest after protocol, lint, type checks and all 303 Angular tests had passed. Of 127 Nest suites, 126 passed and all 215 runnable tests passed; the remaining suite could not load the transitive native binary `@css-inline/css-inline-win32-x64-msvc@0.20.0` because Windows Application Control rejected its unverifiable provenance. This is an environment policy result rather than a test assertion or task-code failure; no security control, dependency or unrelated test was changed to bypass it. The remaining canonical gates were run separately and passed. A full run in the minimal Linux container progressed through lint and type checks, then stopped because that image contains no Chrome binary; the task-specific Linux gate and deterministic inventory check passed there.

The earlier exact-SHA GitHub Actions run for commit `75cdb587` failed only on Ubuntu static validation because the previous generator used platform-dependent ordering. The structural generator now uses platform-neutral lexical ordering, and the Windows/Linux inventory hashes match. A new exact-feature-SHA CI run is still required.

Exact-SHA run `34224085554` for commit `7f511fd0` subsequently exposed a second Windows/Linux determinism defect: ten persisted Angular `headers` expressions contained raw CRLF on Windows and LF on Ubuntu. All Windows gates and every Ubuntu gate before `ci:rest-compatibility` passed. The generator now normalizes every persisted multiline AST fragment, including headers, URL expressions, request bodies, Nest defaults, guards, scopes and type text, before inventory comparison. A new exact-feature-SHA CI run is required for this correction.

### Changed files

- `scripts/rest-route-extraction.mjs` - new shared module
- `scripts/rest-contract-type-analysis.mjs` - structural TypeScript contract analysis
- `scripts/check-rest-route-ownership.mjs` - refactored to use extraction module
- `scripts/check-rest-compatibility.mjs` - new compatibility checker
- `scripts/test-rest-compatibility-negative.mjs` - new negative test
- `docs/architecture/rest-contract-compatibility.json` - new inventory
- `package.json` - added `ci:rest-compatibility` gate
- `MercurionWebNode/src/config/validation-pipe.ts` - shared global ValidationPipe factory
- `MercurionWebNode/src/config/validation-pipe.spec.ts` - isolated runtime validation tests
- `docs/architecture/rest-route-ownership.json` - regenerated only for legitimate source line changes
- `MercurionWebNg/src/app/services/auth.service.ts` - canonical login request typing
- `MercurionWebNode/src/app_modules/auth/controllers/account.controller.ts` - canonical MFA response typing

### Browser validation performed

Not required for this task; validation is static/compiler/runtime-unit based.

### CI status

Implementation and local/isolated validation are complete. The outcome remains transient `CI_PENDING`: no new remote exact-feature-SHA CI was run because push and integration are coordinator-owned. No push, merge, deploy or production access was performed in this correction attempt.
