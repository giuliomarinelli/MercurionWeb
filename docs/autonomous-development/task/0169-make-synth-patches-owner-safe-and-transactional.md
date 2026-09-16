# 0169 - Make Synth patches owner-safe and transactional

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/DATA-020` at base `b279f5d15c399518446b27d3b767adf6d412f041`.
### Preflight
Clean branch and no task-owned Angular/Nest/Tox21/test-watcher processes confirmed.
Exact base SHA Actions run `35052297338` (`CI`) was completed successfully with
both platform prerequisites, all container/build/test jobs, `PostgreSQL migration
schema`, `Critical browser journeys`, and `Required gate` green. Local focused
preflight used the existing dependency tree; no `npm ci` or `npm run ci:check`
was run.
### Preflight remediation
None.
### Summary
Added command-specific `SynthesisPatch` and `SynthStepPatch` mappers with explicit
scalar allowlists. Synthesis and SynthStep create/update/delete commands now use
the canonical `UnitOfWork`, perform owner-scoped existence checks, and read/write
through transaction-bound repositories. Update results are selected through the
same transaction repository, while protected identifiers, owners, audit fields,
and relations are ignored rather than mass-assigned.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath src/app_modules/synth/services/synthesis.service.spec.ts src/app_modules/synth/services/synthetic-step.service.spec.ts src/persistence/transaction-context.spec.ts` — 3 suites, 18 tests passed.
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed.
- `npm run ci:transactions` — transaction boundary policy and negative check passed.
- `git diff --check` — passed.
- Tests cover owner/missing outcomes, explicit allowlist behavior against protected/relation fields, and persistence failure/rollback propagation.
### Full pre-merge CI-parity validation
Reserved for GitHub Actions on the pushed feature SHA; local `npm run ci:check`
was intentionally not run per policy.
### Browser validation performed
Not required by this recipe.
### Commits
`4e7e9df92faf17a5116ec9e4ac7235853e257e34` — Make Synth patches transactional and owner-safe.
### Merge / CI
Feature SHA Actions validation is coordinator-owned after push.
### Rollback
Not applicable.
### Blocker / human decision required
None.
