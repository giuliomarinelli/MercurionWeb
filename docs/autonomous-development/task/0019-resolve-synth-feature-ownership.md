# 0019 - Resolve Synth feature ownership

- [ ] DONE
- [ ] BLOCKED

## Objective

Resolve the currently server-only Synth domain into one explicit product state: either a supported Mercurion feature with an Angular consumer and contract coverage, or code that is fully removed from runtime/schema so no zombie feature remains.

Source: `SYS-019` in Series `0001`.

## Context

The Nest application contains a substantial `synth` module with entities, services, resolvers, DTOs and tests, while the audit found no Angular consumer. This task intentionally cannot infer product intent from code volume alone.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/synth/`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNode/src/app.module.ts` and module-registration/configuration paths
- Angular route/service/page/component tree, especially GraphQL consumers
- product/repository documentation that may establish Synth ownership

## In scope

After an explicit product decision is established:

**If Synth is retained:**
- make the feature reachable/usable from the intended Angular surface;
- add typed client documents/services using the canonical GraphQL tooling;
- add contract and appropriate feature tests;
- document ownership and supported scope.

**If Synth is removed:**
- remove its module registration, resolvers, services, entities/DTOs and schema exposure;
- remove associated configuration/tests/migrations/dead dependencies only when no longer used elsewhere;
- verify no runtime/schema references remain.

## Out of scope

- Autonomously deciding whether Synth belongs in the product.
- Redesigning the Synth feature beyond what a human-approved retain decision specifies.
- Partial disabling that leaves unreachable runtime/schema code as the steady state.

## Decisions already made

- Server-only zombie feature state is not acceptable.
- The final state is explicitly **retained and consumed** or **removed completely from runtime/schema**.
- Product ownership is a human decision, not an implementation-agent inference.

## Requirements

1. Search repository documentation and current code for an explicit decision on Synth product ownership.
2. If no decision is present, stop and request exactly one decision: `retain` or `remove`, plus any required retained-feature entry point/scope.
3. Once decided, execute only the corresponding branch above.
4. Keep the GraphQL schema and generated Angular contracts aligned with the resulting state.
5. Add tests proving retained behaviour or proving removed schema/module absence.

## Acceptance criteria

- [ ] An explicit product ownership decision for Synth is documented.
- [ ] If retained, Synth has a real Angular consumer and contract tests; it is not merely schema-visible.
- [ ] If removed, no Synth runtime module/resolver/schema surface remains.
- [ ] GraphQL schema/codegen/validation checks pass.
- [ ] Angular/Nest builds and affected tests pass.
- [ ] No zombie/ambiguous Synth implementation remains.

## Validation

Run GraphQL schema drift/codegen/validation plus full affected Nest/Angular builds/tests.

## Browser validation

If **retained**, use Chrome DevTools MCP through `http://localhost:8888` to exercise the human-approved Synth entry flow and verify its GraphQL requests/runtime UI.

If **removed**, browser validation is not required unless removal affects navigation or shared UI.

## Stop conditions

**Mandatory:** mark `BLOCKED` immediately if no explicit human/product decision says whether Synth is retained or removed. Do not choose based on implementation completeness, test coverage, naming, or perceived usefulness.

If retained but the required Angular UX/entry point is unspecified, block for that specific product decision before inventing one.

## Dependencies

- `0007-centralize-static-graphql-document-catalog.md` should be available if Synth is retained.
- `0008-enforce-nest-graphql-schema-drift-check.md` should be available for either branch.

## Implementation notes

This task is intentionally a decision gate. A high-quality autonomous outcome may be `BLOCKED` with a precise two-option decision request.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / branch-dependent._

### Changed files

_Not recorded._

### Blocker / human decision required

_None recorded yet._
