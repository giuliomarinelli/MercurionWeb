# 0149 - Canonicalize public ID validation across Nest transports

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make every public Mercurion identifier use one canonical format/version validator and typed boundary contract so REST controllers and GraphQL resolvers accept and reject exactly the same values.

Source: `BE-035` in Series `0001`.

## Context

GraphQL resolvers currently repeat private `ensureUuid` helpers calling `GeneralUtils.ensureValidUUIDv7`, while other boundaries use pipes/scalars/regex/manual checks with potentially different UUID-version semantics. Many entities are created with UUIDv7, but external/provider IDs and other opaque identifiers must not accidentally be forced through the Mercurion public-ID rule.

## Relevant files and modules

- `MercurionWebNode/src/utils/general-utils/`
- GraphQL resolvers containing `ensureUuid`/`ensureUuidv7`
- REST controllers/pipes accepting public IDs
- GraphQL ID/scalar definitions
- entities/DTOs/value objects representing Mercurion IDs
- typed application errors from `0127`
- boundary/contract tests

## In scope

- Inventory public identifier families and explicitly classify which are Mercurion UUIDv7 IDs versus opaque/external identifiers.
- Define one typed/branded Mercurion public-ID value object/validator for the approved UUID version/format.
- Provide canonical REST pipe/parameter adapter and GraphQL scalar/argument validation backed by the same validator.
- Replace resolver-local `ensureUuid` helpers and inconsistent regex/pipe validation.
- Normalize invalid-ID errors to one typed application error classification while preserving transport presentation.
- Add exhaustive valid/invalid/version/case/whitespace tests and REST-vs-GraphQL parity tests.

## Out of scope

- Do not coerce OAuth provider IDs, Meilisearch document IDs or other intentionally opaque identifiers into UUIDs.
- Do not silently accept UUID versions that are not valid for a specific public-ID family.
- Do not change persisted primary keys solely to make unrelated legacy/external IDs conform.
- Do not invent fallback IDs for invalid input.

## Decisions already made

- Mercurion-generated public IDs have one canonical validator per declared ID family/version.
- Transport adapters share validation semantics; GraphQL and REST cannot disagree about the same ID.
- Validation occurs before use-case/repository execution.
- Opaque external identifiers are explicitly typed/classified rather than accidentally passing through UUID validation.

## Requirements

1. Inventory all public `ID`/UUID parameters and current validators; produce a classification table by ID family and expected version.
2. Reuse the repository's UUIDv7 semantics for families already established as UUIDv7, but verify rather than assume that every string ID is v7.
3. Implement one side-effect-free canonical validator/value type and transport adapters around it.
4. Migrate repeated GraphQL `ensureUuid` helpers and REST/manual validators to the canonical path.
5. Ensure invalid format/version yields the same stable application error code/class before REST/GraphQL presentation.
6. Add parity tests with valid v7, malformed UUIDs, wrong UUID versions, empty/whitespace values and opaque IDs in their appropriate boundaries.
7. Add a static check preventing new local UUID regex/private resolver validators in governed transport code.

## Acceptance criteria

- [ ] Every Mercurion public-ID family has an explicit canonical format/version contract.
- [ ] REST and GraphQL make identical validity decisions for the same Mercurion ID.
- [ ] Resolver-local UUID validation helpers are removed.
- [ ] Wrong-version/malformed IDs fail before domain/repository work.
- [ ] External/opaque IDs remain correctly typed and are not misclassified as Mercurion UUIDs.
- [ ] CI detects reintroduction of ad-hoc public-ID validation.

## Validation

Run ID validator/pipe/scalar parity tests, affected resolver/controller tests, GraphQL schema/REST E2E tests, strict typecheck, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an existing public ID family mixes UUID versions in production and no compatibility/versioning decision defines which values must remain accepted; do not reject live legacy identifiers by assumption.

## Dependencies

- `0127` typed errors, `0140` naming cleanup and `0141` strict typing should be `DONE`.

## Execution notes

### Feature branch
`feature/BE-035`, based on `develop` `ce65612e47485cf11f65ddbfd0fb8a59b187d13b`.
### Preflight
Clean feature worktree confirmed. `git rev-parse develop` and `git rev-parse HEAD`
both returned `ce65612e47485cf11f65ddbfd0fb8a59b187d13b`; local
`commit.gpgSign` is `false`. Dependencies `0127`, `0140`, and `0141` are
`DONE`. No task-owned Angular, Nest, Tox21, or watcher process was started.
### Preflight remediation
None.
### Summary
Added the canonical branded Mercurion public-ID contract for UUIDv7 values,
including shared validation, typed `PUBLIC_ID_INVALID` errors, a REST pipe,
GraphQL scalar, and class-validator decorator. Migrated governed Nest GraphQL
resolvers and DTOs to the canonical path, while leaving OAuth/provider state
and ChEMBL `_uuid_` opaque. Added a CI static policy to prevent resolver-local
UUID validators, generic `@IsUUID`, and ad-hoc UUID regexes.
### Task-specific validation performed
`npm run ci:public-id-validation`; `npm run typecheck --workspace
mercurion_web_node`; `npm test --workspace mercurion_web_node -- --runInBand
src/identifiers/mercurion-public-id.spec.ts
src/app_modules/feedback/controllers/feedback.controller.spec.ts`; and
`npm run build --workspace mercurion_web_node`; plus
`npm run lint --workspace mercurion_web_node` all passed. Canonical tests cover
valid UUIDv7, uppercase hex, malformed values, wrong versions, whitespace,
REST/GraphQL parity, and stable application error classification.
### Full pre-merge CI-parity validation
Deferred to exact feature-SHA GitHub Actions; local `npm ci` and
`npm run ci:check` were not run.
### Browser validation performed
_Not applicable._
### Commits
Recorded on `feature/BE-035` after task-specific validation; see feature
branch history.
### Merge / CI
Feature branch pushed for exact-SHA CI; integration remains coordinator-owned.
The exact feature SHA `1a6230c1fbb52fbd4081f3f9254607389831fe2d` was
diagnosed in Actions run `34967881315`: both Ubuntu and Windows static
prerequisite jobs failed because the tracked REST compatibility inventory was
stale after the public-ID contract changes. No runtime or browser validation
was required for this CI repair.

### CI repair
Regenerated the inventory with
`node scripts/check-rest-compatibility.mjs --write`, reviewing the resulting
three affected route entries: their `id` parameter type is now
`MercurionPublicId` and the obsolete declared `400` response metadata was
removed. The generated file remains the only task-scoped metadata change.
Focused checks passed:
`node scripts/check-rest-compatibility.mjs` (59 client calls matched to 58
Nest routes), `npm run ci:public-id-validation` (policy passed), and
`git diff --check`. The repair commit and pushed SHA are recorded below.
Repair commit: `4bad62ef` (`fix(ci): refresh REST compatibility inventory`).
### Rollback
_Not applicable._
### Blocker / human decision required
None. Entity inventory confirmed Mercurion-generated public IDs are UUIDv7;
OAuth/provider state and ChEMBL identifiers are opaque and were not
canonicalized.
