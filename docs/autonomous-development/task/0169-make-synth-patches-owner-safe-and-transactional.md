# 0169 - Make Synth patches owner-safe and transactional

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Ensure Synth updates accept only explicitly writable fields and perform ownership/existence validation plus persistence in one transaction, without spreading DTO identifiers, owner fields or relation objects directly into TypeORM entities.

Source: `DATA-020` in Series `0001`.

## Context

Current Synth services create/update entities with object spreads such as `{ ...input, userId }` and `{ ...input }`. That couples GraphQL input shape to persistence shape and makes future DTO fields automatically mass-assignable. Synth relations also carry identifiers that must not be treated as ordinary columns. `0168` establishes mutation outcome semantics; this task makes the write set itself explicit and transactionally owner-scoped.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/synth/Models/DTO/`
- `MercurionWebNode/src/app_modules/synth/Models/entities/`
- `MercurionWebNode/src/app_modules/synth/services/synthesis.service.ts`
- `MercurionWebNode/src/app_modules/synth/services/synthetic-step.service.ts`
- Synth molecule-reference services if retained
- Unit of Work from `0152`

## In scope

- Define command-specific create/update patch types with explicit allowlists.
- Separate scalar column patches from relation commands and identifiers.
- Perform owner-scoped existence check and write through the same transaction manager.
- Reject attempts to mutate `id`, `userId`, audit timestamps, parent ownership or relations through generic partial spreads.
- Normalize route/step patch mapping and typed mutation results.
- Add tests for mass-assignment attempts, cross-owner updates, missing records and rollback.

## Out of scope

- Do not create a repository-wide generic patch framework; `0185` later applies the allowlist rule across remaining domains.
- Do not redesign GraphQL selection/join metadata.
- Do not change Synth product scope decided in `0019`.

## Decisions already made

- Transport DTOs are not persistence entities.
- Ownership validation and mutation must share the same transaction/snapshot when correctness depends on both.
- IDs, owners, audit fields and relations are never implicitly writable because a DTO happens to contain them.

## Requirements

1. Inventory writable columns for Synthesis and SynthStep separately.
2. Introduce explicit mappers that pick only approved fields from create/update commands.
3. Move relation add/remove/reorder operations behind dedicated methods rather than entity spreads.
4. Use the canonical Unit of Work/transaction manager for ownership lookup and write.
5. Integrate the outcome classification from `0168` without reintroducing duplicate lookups outside the transaction.
6. Add compile-time and runtime tests demonstrating that extra DTO properties cannot alter protected columns/relations.
7. Keep GraphQL input compatibility where safe; incompatible contract changes follow `0022`.

## Acceptance criteria

- [ ] No Synth update spreads an input/DTO directly into an entity/repository update.
- [ ] Only documented writable columns can change through each command.
- [ ] Owner/existence validation and persistence use one transaction manager.
- [ ] Protected identifiers, owner fields, audit fields and relations cannot be mass-assigned.
- [ ] Tests cover success, forbidden/missing, malicious extra fields and rollback.

## Validation

Run focused Synth service/resolver tests, TypeScript compile checks that exercise patch types, Nest integration tests against the supported database and the full CI-parity gate.

## Browser validation

Not required unless Synth remains reachable; if retained and exposed in Angular, validate one update flow through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if the retained Synth product contract does not define which route/step fields are user-editable and that decision cannot be inferred safely from existing commands/tests.

## Dependencies

- `0168-normalize-synth-command-outcomes.md` must be `DONE`.
- `0152` canonical Unit of Work must be `DONE`.

## Implementation notes

Prefer small command mappers (`toSynthesisPatch`, `toStepPatch`, or equivalent) whose output types cannot contain protected fields. Avoid `Partial<Entity>` as an application command type.

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

- Direct terminal prerequisite(s): `0152` (DATA-003, SKIPPED_DEPENDENCY), `0168` (DATA-019, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0019 SYS-019 SKIPPED_DEPENDENCY -> 0168 DATA-019 SKIPPED_DEPENDENCY -> 0169 DATA-020 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
