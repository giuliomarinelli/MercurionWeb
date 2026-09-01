# 0149 - Canonicalize public ID validation across Nest transports

- [ ] DONE
- [ ] BLOCKED

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
