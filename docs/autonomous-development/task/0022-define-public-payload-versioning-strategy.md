# 0022 - Define public payload versioning strategy

- [ ] DONE
- [x] BLOCKED
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

- [ ] A versioning/deprecation policy is explicit, version-controlled and covers REST, GraphQL and Socket.IO.
- [ ] Every incompatible public contract change has a deterministic migration/version path under that policy.
- [ ] Client/server supported compatibility is machine-verifiable where required by the chosen mechanism.
- [ ] Representative unsupported/deprecated-version behaviour is tested.
- [ ] Canonical contract tooling exposes/validates version metadata without a separate drifting source of truth.
- [ ] Angular/Nest builds and affected tests pass.

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

Implemented the human-approved SYS-022 policy on the previously empty,
up-to-date `feature/SYS-022` branch. The policy uses positive integer wire
majors, current major 1, and supported range 1-1. REST keeps existing `/api`
paths as major 1; GraphQL remains `/api/graphql` and uses a central Apollo
header link; Socket.IO uses a central typed `contractMajor` handshake field.

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
- Targeted contract tests passed: 2 suites, 7 tests.
- `npm run ci:contracts` passed: 7 suites, 34 tests.
- `npm run ci:graphql` passed.
- `npm run ci:socket-contracts` passed, including policy negatives.
- `npm run ci:rest-compatibility` passed: 58/58 matches and all six negative
  probes.
- Final clean-install `npm ci` passed with 0 vulnerabilities, followed by a
  complete `npm run ci:check` pass (Angular/Nest tests and builds, E2E,
  GraphQL, and all static/contract gates).
- `git diff --check` passed after ordinary whitespace correction.

The runtime negotiation tests cover current, legacy-unversioned, malformed,
ambiguous, and unsupported selections. Socket.IO connection middleware emits
machine-readable `connect_error.data`; REST emits the canonical 400 envelope
for versioned path errors and safe response metadata; GraphQL emits the
canonical error code through `extensions.code` and response metadata.

### Browser validation performed

Not available. The task's acceptance evidence is deterministic package/runtime,
static contract, GraphQL, Socket.IO, REST, compiler, and negative-probe
validation, but the approved header/path/handshake strategy additionally
requires Chrome DevTools evidence through `http://localhost:8888`. This
session exposes no browser to the worker (`cua.getState()` returned
`browsers: []`), so no browser result is claimed.

### Changed files

- `packages/rest-contracts/src/contract-versioning.ts`
- `packages/rest-contracts/src/index.ts`
- `packages/rest-contracts/src/application-errors.ts`
- `packages/socket-contracts/src/index.ts`
- `MercurionWebNg/src/app/app.config.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNode/src/main.ts`
- `MercurionWebNode/src/contracts/contract-versioning-runtime.spec.ts`
- `docs/architecture/public-payload-versioning-policy.md`
- `docs/architecture/rest-route-ownership.json` (deterministic line-reference
  regeneration for the changed Nest bootstrap)
- This recipe's execution notes.

### Rollback / residual risk

Rollback is an ordinary revert of the task commit; no history rewrite is
required. The implementation does not introduce a future major, deprecate
major 1, deploy, or remove the legacy fallback. Exact feature-SHA CI and
post-merge CI remain coordinator-owned. The implementation branch is preserved
and frozen pending human-assisted browser validation.

### Blocker / next human action

The browser capability was unavailable after implementation had started, so
the task is `BLOCKED` under the ordinary validation rule. Run the canonical
non-production runtime and capture representative REST, GraphQL, and
Socket.IO traffic plus response metadata through Chrome DevTools at
`http://localhost:8888`, then re-enable this recipe in a new authorized
session. Do not merge this branch before that evidence and exact feature-SHA
CI are available.
