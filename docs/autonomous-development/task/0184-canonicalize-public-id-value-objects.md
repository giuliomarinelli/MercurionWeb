# 0184 - Canonicalize public-ID value objects

- [ ] DONE
- [ ] BLOCKED

## Objective

Give every human/public-facing identifier a canonical typed value object and persistence/derivation rule so formatting, parsing and validation are deterministic and no service/presenter regenerates fallback IDs while reading data.

Source: `DATA-035` in Series `0001`.

## Context

Help historically formatted ticket/message public IDs inside `HelpService`, including the defect addressed by `0157` where a malformed value could fall back to a random readable ID and formatting could run repeatedly. Other domains also expose identifiers whose storage form, public prefix/padding and validation can drift between services. `0149` classifies internal/public/external ID families; this task applies explicit value semantics specifically to public IDs.

## Relevant files and modules

- Help Ticket/TicketMessage entities and presenters
- public-ID helpers/formatters throughout `MercurionWebNode`
- DTOs/GraphQL/REST schemas exposing public IDs
- database migrations/constraints from `0150`/`0151`
- ID classification/validation from `0149`
- deterministic Help ID work from `0157`

## In scope

- Inventory every field/API value semantically described as a public/readable/external-facing Mercurion ID.
- Define a typed value object/codec per public-ID family or a typed generic parameterized by family.
- Centralize prefix, padding/canonical string, parse and validation rules.
- Decide per family whether canonical public value is persisted or deterministically derived from immutable persisted data.
- Add DB constraints for persisted sequence/source fields where necessary.
- Make presenters/resolvers/controllers only serialize canonical values; they never invent fallbacks.
- Add parse/round-trip/invalid-input/uniqueness tests.

## Out of scope

- Do not convert opaque provider/external IDs to Mercurion public IDs.
- Do not replace internal UUIDv7 primary keys merely for readability.
- Do not change an established public prefix/format without the version/deprecation strategy from `0022` and explicit compatibility evidence.

## Decisions already made

- A malformed persisted public-ID source is a data/invariant error, not a request to generate a random replacement.
- Formatting is deterministic and idempotent: formatting an already canonical value cannot produce a different ID.
- Public ID and internal primary key are distinct concepts even if some APIs expose both.

## Requirements

1. Build an inventory mapping each public-ID family to internal owner/entity, source value, current format, uniqueness scope and exposed transports.
2. Reuse/normalize the Help ticket/message rules established in `0157` rather than creating a second formatter.
3. Implement typed constructors/parsers that reject malformed prefix, width/range/source and prevent cross-family mixing.
4. Persist the canonical public ID or its immutable unique source in a database-constrained form.
5. Remove read-time random fallback/generation and scattered prefix/pad logic.
6. Translate invalid persisted state into a typed invariant/operational error with correlation, not a new ID.
7. Add compatibility tests for existing valid persisted values and public API snapshots.

## Acceptance criteria

- [ ] Every Mercurion public-ID family has one canonical codec/value object.
- [ ] Public-ID formatting/parsing logic is not duplicated in services/presenters.
- [ ] No read path generates a random fallback public ID.
- [ ] Persisted source uniqueness/integrity is database-enforced where applicable.
- [ ] Existing valid public IDs retain their value unless an approved versioned migration says otherwise.

## Validation

Run public-ID unit/property tests, DB integrity/migration tests, Help and other affected REST/GraphQL contract tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate user-visible public IDs in Help and any other reachable surfaces through `http://localhost:8888`, confirming links/navigation continue to use the expected stable values.

## Stop conditions

Mark `BLOCKED` if the inventory finds two active consumers requiring incompatible formats for the same logical ID and no approved compatibility/versioning decision exists.

## Dependencies

- `0149` canonical ID-family classification and `0157` deterministic Help public IDs must be `DONE`.
- `0150`/`0151` migration and constraint infrastructure must be `DONE`.

## Implementation notes

Prefer branded/opaque TypeScript types so a TicketPublicId cannot be passed where a MessagePublicId or internal UUID is expected, even though all serialize as strings.

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