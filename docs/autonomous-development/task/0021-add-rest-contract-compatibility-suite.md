# 0021 - Add REST contract compatibility suite

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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

- [ ] Every current Angular REST call is represented in the compatibility suite.
- [ ] The suite fails on deliberate mismatches of verb, path, query, body, status and response shape.
- [ ] The baseline 58 calls are accounted for or count changes are traceable to committed preceding tasks.
- [ ] No production service or credential is required.
- [ ] Suite, Angular build/tests and Nest build/tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

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

Skipped without implementation because hard prerequisite `0018-classify-or-remove-unowned-rest-routes.md` (`SYS-018`) is terminal `BLOCKED`. Its route ownership inventory remains preserved on `feature/SYS-018` and is not available on `develop`; the dependency chain therefore prevents this compatibility suite from starting in the current session.

### Validation performed

- No task branch or worker was created.
- Direct prerequisite: `SYS-018` is `BLOCKED` pending canonical runtime configuration and Tox21 browser-validation recovery.
- Transitive dependency chain: `SYS-021` -> `SYS-018` (`BLOCKED`).

### Browser validation performed

Not applicable; the task was skipped before implementation.

### Changed files

No files changed; only this task metadata was updated.

### Blocker / human decision required

No implementation blocker. The task may be re-enabled only after the `SYS-018`
dependency is deliberately resolved in a new authorized session.
