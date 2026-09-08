# 0022 - Define public payload versioning strategy

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Give every incompatible public payload contract an explicit, verifiable versioning and deprecation strategy and make client/server declare the contract version they support.

Source: `SYS-022` in Series `0001`.

## Context

The audit found no explicit general strategy for incompatible REST/GraphQL/WebSocket payload evolution. Earlier SYS tasks establish canonical contracts; this task defines how those contracts change safely over time rather than relying on synchronized undocumented edits.

## Relevant files and modules

- canonical REST contract source from `0001`
- GraphQL schema/document tooling from `0002`–`0008`
- Socket.IO contract registry from `0009`
- public Nest controllers/resolvers/gateway contracts
- Angular API/GraphQL/socket client bootstrap/configuration
- API/project documentation

## In scope

After a human-approved compatibility policy is available:

- document the versioning/deprecation rules for REST, GraphQL and Socket.IO public contracts;
- define how a client declares/negotiates or otherwise pins its supported contract version when needed;
- define backward-compatible versus breaking-change criteria;
- define deprecation metadata/window/removal rules;
- add automated checks/tests demonstrating the chosen mechanism on representative contracts;
- integrate version information with the canonical contract artifacts rather than maintaining an unrelated manual list.

## Out of scope

- Inventing business support periods or compatibility guarantees without authorization.
- Immediately versioning every unchanged endpoint just to satisfy a numeric convention.
- Replacing GraphQL's native additive/deprecation capabilities when they already satisfy the approved policy.

## Decisions already made

- Breaking public contract changes may not be silent.
- Client and server must have a verifiable way to state/determine supported contract compatibility.
- The strategy may use transport-appropriate mechanisms rather than forcing REST, GraphQL and Socket.IO into an identical URL/header shape.

## Requirements

1. Inventory existing public REST, GraphQL and Socket.IO contract boundaries and any ad-hoc version indicators already present.
2. Obtain/read the approved rules for: compatibility definition, version identifier format, deprecation period/metadata, and unsupported-version behaviour.
3. Document one coherent policy with transport-specific application rules.
4. Add contract metadata or negotiation/pinning mechanisms as required by that policy.
5. Ensure Angular declares/uses the supported version where explicit client declaration is part of the policy.
6. Ensure Nest rejects or handles unsupported versions according to the approved rules.
7. Add automated compatibility/deprecation tests and static checks where feasible.
8. Document the procedure for introducing a future breaking payload change.

## Acceptance criteria

- [x] A versioning/deprecation policy is explicit, version-controlled and covers REST, GraphQL and Socket.IO.
- [x] Every incompatible public contract change has a deterministic migration/version path under that policy.
- [x] Client/server supported compatibility is machine-verifiable where required by the chosen mechanism.
- [x] Representative unsupported/deprecated-version behaviour is tested.
- [x] Canonical contract tooling exposes/validates version metadata without a separate drifting source of truth.
- [x] Angular/Nest builds and affected tests pass.

## Validation

Run canonical contract checks, GraphQL checks, Socket.IO contract checks, REST compatibility suite, and affected Angular/Nest tests/builds.

## Browser validation

If the approved strategy uses a browser-visible header/path/handshake version, use Chrome DevTools MCP through `http://localhost:8888` to inspect representative REST/GraphQL/Socket.IO traffic and confirm the expected version metadata and same-origin nginx path.

Otherwise browser validation is not required.

## Stop conditions

**Mandatory:** mark `BLOCKED` if there is no human-approved policy for version identifier format and compatibility/deprecation guarantees. Do not autonomously choose semantic dates versus integers, URL versus header versioning, or support/deprecation windows.

Also block if an already-public external consumer imposes compatibility obligations not documented in the repository and implementation would risk breaking it.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md`
- `0008-enforce-nest-graphql-schema-drift-check.md`
- `0009-create-typed-socket-io-event-registry.md`
- `0021-add-rest-contract-compatibility-suite.md`

## Implementation notes

Treat GraphQL deprecation/directive/schema evolution according to GraphQL semantics where compatible with the approved global policy; do not introduce URL-style GraphQL versioning by default without an explicit decision.

## Execution notes

### Summary

Implemented and remediated the human-approved SYS-022 policy on
`feature/SYS-022`. The policy uses positive integer wire majors, current major
1, and supported range 1-1. REST keeps existing URL-and-method contracts under
`/api/...` as major 1; GraphQL remains `/api/graphql` and uses a central Apollo
header link; Socket.IO uses a central typed `contractMajor` handshake field.

The rollout rule is now explicit and reversible: compatibility, observation,
migration-complete approval, and required-declaration phases. Enforcement may
advance only after all known maintained consumers declare a supported major,
their owners acknowledge migration, tests are green, and Giulio Marinelli or a
recorded delegate approves the version-controlled change. Unknown or
unversioned consumers block advancement; rollback restores fallback plus safe
warnings without reinterpreting the legacy REST path.

The remediation also excludes GraphQL from the global REST hook, centralizes
response header names/range formatting/warnings in the canonical package,
formats unsupported GraphQL majors as GraphQL errors instead of generic HTTP
500 responses, exercises a real deprecation fixture, and preserves
`contractMajor` during Socket.IO authentication retry.

### Validation performed

- Startup recheck: `feature/SYS-022`, `develop`, and `origin/develop` all
  pointed to `d2bffef3`; worktree was clean and local `commit.gpgSign=false`.
- `npm run autonomous:plan`: SYS-022 `READY`; no errors, cycles, or stale
  skips; dependencies 0001, 0008, 0009, and 0021 are DONE.
- Repository inventory found Angular as the only confirmed application
  consumer; no separate external consumer is documented in application
  source. Package, REST, GraphQL, and Socket.IO sources were inspected.
- `npm run build --workspace @mercurion/rest-contracts` passed.
- `npm run build --workspace @mercurion/socket-contracts` passed.
- Targeted remediation tests passed: 4 suites, 15 tests.
- `npm run ci:contracts` passed: 8 suites, 38 tests.
- `npm run ci:graphql` passed.
- `npm run ci:socket-contracts` passed, including policy negatives.
- `npm run ci:rest-compatibility` passed: 58/58 matches and all six negative
  probes.
- Final clean-install `npm ci` passed with 0 vulnerabilities, followed by a
  complete `npm run ci:check` pass: 303 Angular tests, 130 Nest suites/230
  tests, Nest E2E, Angular/Nest builds, GraphQL, and all static/contract gates.
- `git diff --check` passed after ordinary whitespace correction.

The tests cover current, legacy-unversioned, malformed, ambiguous, unsupported,
and deprecated selections. Transport-level tests verify the REST hook,
GraphQL context/hook/formatter, and Socket.IO connection middleware.

### Browser validation performed

Completed through the existing authenticated non-production Chrome extension
session at `http://localhost:8888`; the protected dashboard displayed the
identity marker `Profilo di Giulio Marinelli`, `Benvenuto Giulio`, and live
workspace counts, with no browser console errors.

- REST legacy traffic disclosed current major `1`, range `1-1`, and the `299`
  migration warning; `/api/v2/account/current-version` returned HTTP 400 with
  `CONTRACT_VERSION_UNSUPPORTED` and the canonical envelope.
- GraphQL with header major `1` returned HTTP 200, current major `1`, range
  `1-1`, no warning, and `{ __typename: "Query" }`. A missing header returned
  the compatibility warning. Major `2` returned HTTP 200 with a GraphQL error
  whose extensions contain `CONTRACT_VERSION_UNSUPPORTED`, application status
  400, selected major, current major, and supported range; it did not receive
  the REST legacy warning.
- Socket.IO with handshake `contractMajor: 1` connected. Major `2` was rejected
  with `connect_error.data` containing the canonical unsupported-version code,
  status, and details. The authenticated Angular socket connected without a
  legacy-version warning, confirming that the maintained client declares its
  major.

No separate Playwright browser or profile was used: the Chrome extension
attached to the existing authenticated session supplied the browser evidence,
while deterministic same-origin protocol probes captured the raw response
metadata and Socket.IO handshake result.

### Changed files

- `packages/rest-contracts/src/contract-versioning.ts`
- `packages/rest-contracts/src/index.ts`
- `packages/rest-contracts/src/application-errors.ts`
- `packages/socket-contracts/src/index.ts`
- `MercurionWebNg/src/app/app.config.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/mercurion-graphql.module.spec.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.spec.ts`
- `MercurionWebNode/src/main.ts`
- `MercurionWebNode/src/contracts/contract-versioning-runtime.spec.ts`
- `MercurionWebNode/src/contracts/contract-versioning-http.ts`
- `MercurionWebNode/src/contracts/contract-versioning-http.spec.ts`
- `docs/architecture/public-payload-versioning-policy.md`
- `docs/architecture/rest-route-ownership.json` (deterministic line-reference
  regeneration for the changed Nest bootstrap)
- This recipe's execution notes.

### Rollback / residual risk

Rollback is an ordinary revert of the task merge; no history rewrite is
required. The implementation does not introduce a future major, deprecate
major 1, deploy, enable required declarations, or remove the compatibility
fallback. Exact feature-SHA and post-merge CI remain mandatory before the
`DONE` outcome becomes final.
