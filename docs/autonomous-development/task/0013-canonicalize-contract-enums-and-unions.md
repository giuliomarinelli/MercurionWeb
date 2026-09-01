# 0013 - Canonicalize contract enums and unions

- [ ] DONE
- [ ] BLOCKED

## Objective

Eliminate duplicated client/server contract enums and unions with divergent values or casing by deriving both projects from canonical contract definitions.

Source: `SYS-013` in Series `0001`.

## Context

The audit found enum/union definitions duplicated across Angular and Nest with value/casing drift. This task concerns values that cross API/GraphQL/WebSocket boundaries or otherwise form a client/server contract; UI-only enums remain local.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/`
- `MercurionWebNode/src/**/Models/enums/`
- `MercurionWebNode/src/**/Models/DTO/`
- GraphQL generated schema/types
- canonical contract/codegen mechanism from earlier tasks

## In scope

- Inventory duplicated cross-boundary enums/unions by semantic name and actual wire values.
- Select the existing authoritative wire value for each contract or document an intentional migration where already decided.
- Generate/share corresponding TypeScript definitions for Angular and Nest.
- Remove equivalent local contract copies.
- Add compatibility checks preventing value/casing drift.

## Out of scope

- UI-only display enums that never cross a boundary.
- Product changes to enum semantics.
- Database migrations unless strictly necessary to preserve the already-established canonical wire value and safe migration is explicitly defined.

## Decisions already made

- Contract enums/unions have one source of truth.
- Wire values and casing are explicit and testable.
- Local UI representations may map from canonical values but cannot redefine the contract.

## Requirements

1. Produce an inventory of duplicated cross-project enum/union concepts and their values.
2. Distinguish wire contract types from local-only state types.
3. Move contract types to the canonical source/generator.
4. Update serializers, validators, DTOs, GraphQL types and Angular consumers to use generated/shared values.
5. Add round-trip/compatibility tests for the canonical wire representations.
6. Add a static/codegen check that detects equivalent manual copies where feasible.

## Acceptance criteria

- [ ] Every cross-boundary enum/union has one canonical definition.
- [ ] Angular and Nest consume identical generated/shared wire values.
- [ ] No equivalent local contract enum remains with divergent casing/value.
- [ ] Compatibility tests cover serialization/deserialization of representative values.
- [ ] Builds, GraphQL checks and relevant tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

Run Angular and Nest builds/tests plus canonical contract generation/checks.

## Browser validation

Not applicable unless a corrected enum value changes a currently broken browser flow. If runtime evidence is needed, validate only through `http://localhost:8888`.

## Stop conditions

Block if current client/server/database values conflict and choosing which value is canonical would constitute an externally visible migration decision not already documented.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` or another approved canonical cross-project contract mechanism must be available.
- `0002-generate-angular-graphql-documents-and-types.md` should be considered for GraphQL-derived enums to avoid competing generation paths.

## Implementation notes

Do not force every internal enum into a shared package. Share only actual contract semantics; map to richer local types when domain implementation requires it.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
