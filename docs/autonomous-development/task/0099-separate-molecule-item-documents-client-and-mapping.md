# 0099 - Separate molecule-item GraphQL documents, generated client and view-model mapping

- [ ] DONE
- [ ] BLOCKED

## Objective

Refactor the Angular molecule-item GraphQL layer so static documents/generated operations, transport execution and application/view-model mapping are separate concerns; the public service must not build GraphQL query strings or expose `any`/transport-specific shapes.

Source: `NG-013` in Series `0001`.

## Context

`MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts` currently injects Apollo and acts as a broad molecule-item API. Earlier SYS tasks establish a statically analyzable `.graphql` catalog, GraphQL Code Generator and valid generated types. Molecule detail/editor/search pages consume this service. Later NG tasks own Apollo cache policy; this task should therefore establish a clean client/mapping boundary while preserving current fetch/update policy unless required for correctness.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- its focused spec
- molecule-item `.graphql` documents/generated artifacts established by SYS tasks
- `MercurionWebNg/src/app/Models/graphql/molecule-collection/`
- molecule detail/editor/search consumers
- canonical generated GraphQL client/types

## In scope

- Move/confirm every molecule-item operation in the canonical static GraphQL document catalog.
- Use generated operation/variable/result types at the transport boundary.
- Introduce pure mappers from generated transport result shapes to application/domain/view models where a mapping is actually needed.
- Keep a narrow application-facing molecule-item gateway/service that composes generated operations and mappers.
- Remove hand-built query strings and unjustified `any`/manual response interfaces from this layer.
- Add contract/mapping tests for every public operation currently used by Angular.

## Out of scope

- Do not redesign GraphQL schema.
- Do not duplicate generated result types as manual DTO interfaces.
- Do not globally change Apollo `fetchPolicy`, type policies or optimistic cache behavior; `NG-023/024` own those decisions.
- Do not move UI-only state into transport models.

## Decisions already made

- GraphQL documents are static and code-generated according to SYS tasks.
- Generated transport types are not presentation view models by default.
- Mapping functions are pure/testable and live outside components.
- The public gateway returns typed application models/commands, not Apollo implementation details.

## Requirements

1. Inventory every public method and map it to a generated GraphQL operation.
2. Eliminate inline/dynamically constructed document strings in this service.
3. Remove `any` and manual result shapes where generated types cover the contract.
4. Centralize application-model mapping and null/discriminant handling.
5. Keep errors compatible with the canonical application-error adapter.
6. Migrate consumers without leaking Apollo query result objects into components.

## Acceptance criteria

- [ ] Every molecule-item operation uses canonical static generated documents/types.
- [ ] Service/gateway constructs no GraphQL query strings.
- [ ] No unjustified `any` or duplicate manual response type remains in this layer.
- [ ] View-model mapping is pure and covered by tests.
- [ ] Existing molecule detail/editor/search flows remain compatible.

## Validation

Run GraphQL document/schema/codegen drift checks, focused molecule-item gateway/mapper tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, smoke-test molecule-item reads and reachable create/update/delete/search flows that use this gateway. Verify GraphQL requests/results and no relevant console/type-mapping errors.

## Stop conditions

Mark `BLOCKED` if a consumed operation is still invalid/ambiguous against the canonical generated schema and fixing it would exceed the established SYS contract.

## Dependencies

- SYS GraphQL tasks `0002`-`0007` must be `DONE`.
- Molecule transport/view-model separation task `0016` must be `DONE`.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
_Not started._

### Task-specific validation performed
_Not started._

### Full pre-merge CI-parity validation
_Not started._

### Browser validation performed
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
