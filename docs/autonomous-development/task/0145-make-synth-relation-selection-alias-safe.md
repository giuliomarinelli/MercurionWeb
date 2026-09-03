# 0145 - Make Synth relation selection alias-safe and metadata-driven

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Replace ad-hoc Synth relation alias/path strings with a typed selection planner derived from TypeORM metadata so every requested GraphQL projection generates valid joins consistently.

Source: `BE-031` in Series `0001`.

## Context

`TypeOrmUtils.addJoins` accepts caller-supplied query aliases. Synth queries use aliases such as `route` and `step`, while `SyntheticStepService` conditionally asks the helper for relation sets such as route/molecule references. The audit identified divergent alias assumptions (`step` vs `route`/`moleculeRefs`) capable of generating invalid joins for specific projections.

## Relevant files and modules

- `MercurionWebNode/src/utils/type-orm-utils/type-orm-utils.ts`
- `MercurionWebNode/src/app_modules/synth/services/synthesis.service.ts`
- `MercurionWebNode/src/app_modules/synth/services/synthetic-step.service.ts`
- Synth entities/relations/resolvers and GraphQL field-map helpers
- projection/query tests

## In scope

- Define typed relation-selection metadata for Synth route/step/molecule-reference projections.
- Derive join paths and aliases from entity/relation metadata or one validated registry rather than caller string conventions.
- Make the planner reject unknown/impossible requested relation paths before executing SQL.
- Migrate Synth query builders to the planner.
- Add exhaustive projection tests for scalar-only and every supported relation combination.

## Out of scope

- Do not redesign Synth domain ownership or CRUD semantics; DATA tasks own those concerns.
- Do not create one reflection-heavy universal query language for all TypeORM entities.
- Do not expose arbitrary client-provided relation paths directly to QueryBuilder.

## Decisions already made

- GraphQL selection may influence projection, but valid entity relation metadata controls SQL joins.
- Query aliases are internal implementation details and cannot be independently invented by each caller.
- Unsupported projections fail deterministically rather than producing malformed SQL.

## Requirements

1. Reproduce the audited failing/divergent alias projection with a regression test.
2. Define the allowed Synth relation graph and canonical query aliases in typed metadata.
3. Refactor `addJoins` usage or create a Synth-specific planner so callers request relations semantically, not by raw alias/path composition.
4. Verify nested relation paths cannot accidentally join from the wrong root alias.
5. Add tests for route-only, step-only, moleculeRefs and combined/nested projections plus an invalid path.
6. Ensure selection planning does not bypass owner filters established by the domain query.
7. Keep the generic TypeORM helper narrow; delete obsolete alias-special-case logic exposed by the migration.

## Acceptance criteria

- [ ] Every supported Synth GraphQL projection generates valid deterministic joins.
- [ ] Alias/path mismatches cannot be expressed by normal callers.
- [ ] Invalid relation requests fail before SQL execution.
- [ ] Ownership predicates remain applied to the correct root query.
- [ ] Regression tests cover the previously divergent aliases.

## Validation

Run Synth selection/query tests against a real or representative TypeORM test database where needed, resolver tests, full Nest tests/E2E, strict typecheck, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the GraphQL schema currently exposes an ambiguous relation name whose intended entity relationship cannot be established from the schema/domain model.

## Dependencies

- `0115`/`0120` repository/module boundaries and `0141` strict typing should be `DONE`.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
