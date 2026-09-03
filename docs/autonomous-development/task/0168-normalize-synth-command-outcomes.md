# 0168 - Normalize Synth command outcomes

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Make Synth create/update/delete commands distinguish successful mutation, missing resource, forbidden ownership and infrastructure failure without converting database errors or zero-row writes into misleading business success/failure booleans.

Source: `DATA-019` in Series `0001`.

## Context

`SynthesisService.update()` executes `Repository.update({ id, userId }, ...)` and immediately reads the route without checking `affected`; `delete()` returns `true` after any non-throwing delete even when zero rows matched, while every thrown error is collapsed to `false`. `SyntheticStepService` follows the same pattern. That makes not-found, wrong-owner and database failure observationally ambiguous. Earlier error-contract tasks establish typed application errors; this task applies that contract to Synth persistence commands.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/synth/services/synthesis.service.ts`
- `MercurionWebNode/src/app_modules/synth/services/synthetic-step.service.ts`
- Synth resolvers and DTOs
- Synth entities/repositories
- typed application error catalog from SYS/BE tasks
- Unit of Work from `0152`

## In scope

- Define typed Synth command results/errors for updated/deleted, not found, forbidden and infrastructure failure.
- Check affected-row semantics rather than assuming non-throwing TypeORM writes mutated data.
- Preserve the security policy for owner-scoped resources without leaking another user's resource existence when the public contract intentionally conflates missing/forbidden.
- Stop catching broad infrastructure errors merely to return `false`.
- Align route and step command behavior and GraphQL transport mapping.
- Add persistence/integration tests for zero-row writes, wrong owner, success and injected database failure.

## Out of scope

- Do not redesign Synth patch fields; `0169` owns writable-field/transaction semantics.
- Do not redesign Synth GraphQL relation selection; `0145`/BE-031 owns that concern.
- Do not revive Synth if the explicit product decision from `0019` removed the feature.

## Decisions already made

- Infrastructure failure is never a normal `false` business result.
- A command that updates/deletes zero rows must have an explicit domain outcome.
- Transport layers map typed outcomes/errors; repositories do not encode behavior in exception-message strings.

## Requirements

1. Inventory every Synth create/update/delete path for Synthesis, SynthStep and any related command service.
2. Introduce one consistent outcome model or typed error policy used by all Synth commands.
3. For update/delete, inspect affected rows or perform an ownership-aware locked lookup so zero-row mutation is classified deterministically.
4. Preserve transaction rollback and original infrastructure failure cause/correlation metadata.
5. Remove broad `catch { return false }` patterns from Synth mutation paths.
6. Make resolver return types match the final contract rather than preserving obsolete booleans solely for compatibility; if a public GraphQL contract change is incompatible, follow the versioning strategy from `0022`.
7. Add tests proving identical classification across route and step commands.

## Acceptance criteria

- [ ] Successful Synth writes have an explicit success result.
- [ ] Missing and forbidden cases follow one documented policy.
- [ ] Zero affected rows cannot be reported as successful deletion/update.
- [ ] Database/driver failures propagate as typed infrastructure/application errors and are observable.
- [ ] Route and step mutation semantics are consistent and covered by tests.

## Validation

Run focused Synth unit/integration tests, GraphQL mutation tests for success/missing/wrong-owner/failure cases, Nest lint/typecheck/build/tests and the repository-wide CI-parity gate.

## Browser validation

Not required unless Synth remains a reachable product feature after `0019`; if reachable, validate its affected mutation flow through `http://localhost:8888`.

## Stop conditions

Mark `BLOCKED` if the retain/remove product decision for Synth is still unresolved, or if public missing-versus-forbidden disclosure semantics require a human security/product decision not already documented.

## Dependencies

- `0019-resolve-synth-feature-ownership.md` must be `DONE` with Synth retained, otherwise this task is not applicable and should be resolved consistently with removal.
- `0127`/`0128` typed error handling should be `DONE`.
- `0152` canonical Unit of Work should be `DONE`.

## Implementation notes

Do not use a preliminary unrestricted `findOne(id)` followed by an owner-scoped write if that leaks existence or creates a TOCTOU gap. Keep classification and write semantics transactionally coherent.

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

- Direct terminal prerequisite(s): `0019` (SYS-019, SKIPPED_DEPENDENCY), `0127` (BE-013, SKIPPED_DEPENDENCY), `0128` (BE-014, SKIPPED_DEPENDENCY), `0152` (DATA-003, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0019 SYS-019 SKIPPED_DEPENDENCY -> 0168 DATA-019 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
