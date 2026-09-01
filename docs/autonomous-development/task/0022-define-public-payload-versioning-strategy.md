# 0022 - Define public payload versioning strategy

- [ ] DONE
- [ ] BLOCKED

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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable / not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None recorded yet._
