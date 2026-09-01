# 0171 - Decompose molecule bulk join planning and write sets

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Split the oversized molecule/collection bulk-join commands into explicit selection planning, ownership validation, persistence write-set construction and domain-touch phases with typed inputs/results and bounded complexity.

Source: `DATA-022` in Series `0001`.

## Context

`MoleculeCollectionItemJoinService.bindManyCollectionsToMoleculeWithManager()` currently combines molecule resolution (ChEMBL molregno versus existing UUID), external molecule lookup, possible entity creation, `selectAll` selection, ownership filtering, existing-join discovery, bulk insert, touched timestamps and response construction in one long method. `addManyMoleculesToCollectionWithManager()` contains a parallel variation. This makes transaction semantics and failure classification difficult to reason about.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/molecule-collection/services/molecule-collection-item-join.service.ts`
- molecule collection/item services and entities
- ChEMBL molecule adapter/service
- bulk DTOs and GraphQL resolvers
- Unit of Work from `0152`

## In scope

- Introduce explicit typed bulk command inputs.
- Separate resolution of source molecule/items from target selection planning.
- Separate ownership/existence classification from write-set construction.
- Represent `toInsert`, already-joined/skipped, rejected/missing and touched entities explicitly where part of the public contract.
- Keep all database writes inside one transaction manager.
- Batch touch updates rather than N sequential writes where safe.
- Reduce command methods to orchestration over cohesive helpers/domain services.
- Add unit tests for each planner/validator/write-set stage and integration tests for the composed command.

## Out of scope

- Do not finalize repository-wide ownership semantics here; `0172` owns the canonical molecule-domain ownership policy.
- Do not finalize `selectAll` snapshot/limit/idempotency semantics; `0173` owns them.
- Do not change scientific molecule lookup behavior unrelated to bulk composition.

## Decisions already made

- Selection planning is pure/read-oriented and distinguishable from persistence writes.
- The transaction owns the final validated write set.
- Bulk APIs return typed outcomes rather than ambiguous booleans whenever callers need to distinguish inserted/skipped/rejected work.

## Requirements

1. Characterize both bulk directions: many molecules→one collection and one molecule→many collections.
2. Define command/result types that make `selectAll`, exclusions and resolved molecule identity explicit.
3. Extract candidate selection into testable query/planner functions.
4. Extract ownership/existence validation from insertion logic while retaining one transaction snapshot.
5. Compute existing joins and `toInsert` as set operations, with database uniqueness as the final race guard.
6. Replace per-item touch loops with set-based updates or a bounded bulk primitive when semantics permit.
7. Preserve ChEMBL resolution/creation atomicity with the resulting joins.
8. Ensure errors are classified using the canonical application-error contract rather than swallowed into `{ ok: false }` for infrastructure failure.

## Acceptance criteria

- [ ] No bulk join command contains selection, ownership, write and side-effect logic as one monolithic method.
- [ ] Candidate/write-set computation is independently unit-tested.
- [ ] Database writes use one canonical transaction manager.
- [ ] Duplicate joins remain impossible under concurrency.
- [ ] Bulk result/error semantics are typed and deterministic.

## Validation

Run focused bulk-join unit/integration/concurrency tests for explicit IDs, duplicates, existing joins, ChEMBL resolution and failure injection; run Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate the Angular add-molecules/bind-collections flows through `http://localhost:8888`, including partial existing joins and the current `selectAll` UI path.

## Stop conditions

Mark `BLOCKED` if callers rely on undocumented distinctions in the current `{ ok, moleculeUUID }`/skipped-ID outputs and the desired compatibility contract cannot be established from tests or task Series decisions.

## Dependencies

- `0151` database uniqueness constraints and `0152` Unit of Work must be `DONE`.
- `0127`/`0128` typed error transport should be `DONE`.

## Implementation notes

Do not turn the decomposition into a generic “bulk framework”. Keep primitives expressed in molecule/collection domain terms; `0172` and `0173` will then normalize ownership and snapshot semantics on top.

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