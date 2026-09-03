# 0172 - Centralize molecule-domain ownership policy

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Provide one batch-aware ownership/existence policy for molecule collections, molecule items and joins so every command classifies owner, missing and forbidden cases consistently without repeating ad-hoc repository queries and error messages.

Source: `DATA-023` in Series `0001`.

## Context

Molecule services currently use multiple patterns: `exists({ id, userId })`, owner-filtered finds, `assertCollectionOwnership()`, `assertItemOwnership()`, filtering requested IDs down to owned IDs and command-specific `false` results. The same logical resource can therefore produce different outcomes depending on which service path was called. Bulk operations also need set-wise ownership validation rather than N individual checks.

## Relevant files and modules

- molecule-collection services/resolvers
- molecule item/custom/ChEMBL services
- `MoleculeCollectionItemJoinService`
- collection/item/join entities
- ownership audit documentation
- typed application errors
- Unit of Work from `0152`

## In scope

- Define canonical ownership repository/policy APIs for one resource and batches.
- Distinguish requested, owned, missing and foreign IDs internally without leaking existence beyond the approved transport policy.
- Reuse one owner-scoped query strategy across collection/item/join commands.
- Provide batch assertions/classification for bulk commands.
- Remove duplicate `assert*Ownership`/filter helpers once migrated.
- Standardize typed error/outcome behavior across CRUD and bulk paths.
- Add contract tests that run the same ownership matrix through multiple entrypoints.

## Out of scope

- Do not create a global authorization service for unrelated domains.
- Do not change scope/role authorization handled by guards/metadata.
- Do not define `selectAll` snapshot semantics; `0173` owns that.

## Decisions already made

- Resource ownership is a domain/persistence invariant distinct from transport-level scopes.
- Public responses may deliberately map foreign and missing resources to the same result, while internal classification can remain richer for auditing.
- Batch checks must use set-based queries, not one SQL query per ID.

## Requirements

1. Inventory all collection/item/join ownership checks and their current missing/forbidden behavior.
2. Define a small molecule-domain ownership port/repository with single and batch operations.
3. Use the caller's transaction manager when invoked inside a Unit of Work.
4. Return/throw canonical typed classifications and centralize the public disclosure mapping.
5. Migrate create/update/delete/bind/remove/touch operations that currently duplicate ownership checks.
6. Ensure batch operations can require complete ownership or explicitly return rejected IDs depending on command semantics.
7. Add tests for owner, foreign, missing, mixed batch and concurrent deletion cases.

## Acceptance criteria

- [ ] Molecule-domain commands no longer implement their own ownership query/error vocabulary.
- [ ] Single and batch ownership checks are owner-scoped and transaction-aware.
- [ ] The same resource state yields the same public outcome across entrypoints.
- [ ] Mixed-owner batches cannot partially mutate unless the command explicitly defines partial semantics.
- [ ] Ownership tests prevent N+1 validation queries.

## Validation

Run molecule collection/item/join service and resolver tests, ownership matrix integration tests with two users, SQL query-count checks for batches, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Exercise at least one collection/item mutation through `http://localhost:8888`; direct cross-owner cases remain integration/API tests rather than browser manipulation.

## Stop conditions

Mark `BLOCKED` if existing product behavior intentionally differs between missing and foreign resources in ways not documented by the canonical error/security contract and a disclosure decision is required.

## Dependencies

- `0171-decompose-molecule-bulk-join-planning-and-write-sets.md` should be `DONE`.
- `0127`/`0128` error contract and `0152` Unit of Work must be `DONE`.

## Implementation notes

Avoid a generic `owns(entityName, id)` API. Typed per-resource operations preserve compile-time safety and allow efficient joins/composite ownership constraints.

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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0127` (BE-013, SKIPPED_DEPENDENCY), `0128` (BE-014, SKIPPED_DEPENDENCY), `0152` (DATA-003, SKIPPED_DEPENDENCY), `0171` (DATA-022, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0152 DATA-003 SKIPPED_DEPENDENCY -> 0172 DATA-023 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
