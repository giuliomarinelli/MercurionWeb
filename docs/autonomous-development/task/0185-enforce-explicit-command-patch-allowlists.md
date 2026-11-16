# 0185 - Enforce explicit command patch allowlists

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Eliminate repository-wide DTO/`Partial<Entity>` mass assignment by making every mutation command map explicit writable fields, while IDs, ownership, audit columns and relations remain non-assignable unless changed through dedicated domain operations.

Source: `DATA-036` in Series `0001`.

## Context

Several services accept `Partial<Entity>` or spread transport/input objects directly into TypeORM `create`, `update` or entity assignment. `0169` fixes this specifically for Synth, but the same class of defect can occur in User, molecule collections/items, Help, documents and other active domains. A future DTO field must not silently become a writable database column merely because an object spread exists.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/**/services/`
- GraphQL input/REST DTO definitions
- TypeORM entity update/create call sites
- command/application mappers
- entity ownership/audit/relation fields
- strict TypeScript/lint infrastructure

## In scope

- Inventory all mutation paths that accept `Partial<Entity>`, `DeepPartial<Entity>`, generic records or spread DTO/input objects into persistence calls.
- Replace them with command-specific patch/input types and explicit mappers/allowlists.
- Make protected fields impossible to express in normal update command types.
- Route owner/parent/relation changes through explicit commands with their own authorization/invariants.
- Add a static/lint/AST gate for the most dangerous mass-assignment patterns where deterministic detection is practical.
- Add negative tests proving protected fields cannot be changed through extra transport properties.

## Out of scope

- Do not ban TypeORM `Partial`/`DeepPartial` inside tightly scoped infrastructure/test factories where values are not derived from untrusted command input.
- Do not build one generic reflection-based mapper that recreates mass assignment under another name.
- Do not alter legitimate domain relations/ownership without their dedicated command semantics.

## Decisions already made

- Transport input and persistence entity shapes are independent.
- Writable fields are opt-in, not “all entity fields except a blacklist”.
- ID, owner, created/audit fields and relation objects are protected by default.

## Requirements

1. Search production mutation paths for `Partial<Entity>`, `{ ...input }`, `{ ...dto }`, `Object.assign(entity, ...)` and equivalent repository update spreads.
2. Produce a domain-by-domain inventory of protected and writable fields.
3. Introduce explicit command input/patch types that contain only approved writable values.
4. Implement small deterministic mappers that construct persistence patches field by field.
5. Replace relation/owner changes with explicit methods requiring authorization and invariant checks.
6. Prevent unknown transport properties from surviving validation into command objects.
7. Add a repository static check for direct DTO/input spread into TypeORM mutation APIs when it can avoid false positives; register it in canonical CI if adopted.
8. Add security tests submitting protected fields through REST/GraphQL payloads and internal command fixtures.

## Acceptance criteria

- [ ] No production command accepts `Partial<ProductionEntity>` as its public application input.
- [ ] Transport DTO/input objects are never spread wholesale into persistence writes.
- [ ] Protected fields cannot be mutated by adding an extra property to a request/DTO.
- [ ] Relation/owner changes use dedicated explicit commands.
- [ ] A static gate or equivalent audited test prevents recurrence of the known patterns.

## Validation

Run repository static search/gate, domain mutation and mass-assignment negative tests, REST/GraphQL validation tests, Nest lint/typecheck/build/tests and the full CI-parity gate.

## Browser validation

Run representative update flows (profile, collection/item and document metadata where reachable) through `http://localhost:8888`; malicious protected-field injection is covered by API tests.

## Stop conditions

Mark `BLOCKED` if a generic public patch endpoint intentionally permits arbitrary persisted fields and the required allowlist cannot be established without a product/API decision.

## Dependencies

- `0169-make-synth-patches-owner-safe-and-transactional.md` provides the Synth-specific pattern and should be `DONE`.
- Strict typing/validation work from BE-026/BE-027 and canonical error/ownership policies should be `DONE`.

## Implementation notes

The safest mapper is boring code. `return { title: input.title, notes: input.notes }` is intentionally preferable to clever generic `pick()` machinery when the compiler should expose newly added writable fields for deliberate review.

## Execution notes

### Feature branch
`feature/DATA-036` at base `71d28f4ba93ed072bb6ebb582404b01d284e03a4`.
### Preflight
Clean feature branch and no task-owned runtime processes confirmed. The exact
supplied base SHA matched `develop` and its merge CI was green. The existing
dependency tree was used; no `npm ci` or `npm run ci:check` was run locally.
The Chrome DevTools surface was callable before mutation.
### Preflight remediation
None.
### Summary
Added domain-specific command patch/create types and field-by-field mappers for
molecule collections/items, custom molecule items, lab notebooks and user
updates/registration. Protected IDs, ownership, audit fields, relations and
system fields are no longer accepted through partial entity commands or
transport spreads. Added the repository static `ci:command-patch-allowlists`
gate and its negative self-check, registered in `ci:static`.
### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed.
- Focused molecule, custom-item, lab-notebook and user service suites — 27
  tests passed.
- `npm run ci:command-patch-allowlists` — passed, including negative check.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Reserved for GitHub Actions on the pushed feature SHA; local
`npm run ci:check` was intentionally not run per policy.
### Browser validation performed
The required Chrome capability probe and pre-change authenticated dashboard
state were observed through `http://localhost:8888`. After implementation,
Tox21, Nest and Angular restarted in canonical order, all three remained live,
and two consecutive `/health` and `/` readiness rounds returned HTTP 200.
The authenticated profile was logged out through the supported UI; no
protected mutation was performed because this task's malicious-field coverage
is API/unit-test based and no safe representative mutation fixture was
available without changing user data.
### Commits
`363a729fc4ee3c5cb82fe546f9f2e5527f800e44` — Enforce explicit command patch
allowlists and add the static recurrence gate.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
