# 0184 - Canonicalize public-ID value objects

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/DATA-035` from base `00ef329b238e2e3dd52dbf7ff916411fde357ca6`.
### Preflight
- Confirmed clean `feature/DATA-035` at the supplied base SHA before edits.
- Confirmed the exact base-SHA Actions run `35056527445`
  (`https://github.com/giuliomarinelli/MercurionWeb/actions/runs/35056527445`)
  completed successfully for `00ef329b238e2e3dd52dbf7ff916411fde357ca6`.
  The classifier and autonomous metadata jobs passed and the stable
  `Required gate` passed; the adaptive classifier correctly skipped unrelated
  platform jobs for this task/report-only base.
- Confirmed no task-owned Angular, Nest, Tox21, Jest, or workspace watcher
  process was active. No runtime was started because the supplied execution
  instruction classified this recipe as not requiring browser evidence.
- Confirmed local `commit.gpgSign=false`, `git diff --check` passed, and no
  `npm ci` or `npm run ci:check` was run.
- Focused baseline policy check `npm run ci:public-id-validation` passed.
### Preflight remediation
None.
### Summary
Inventory found two human-facing generated Help ID families: Ticket
(`tickets.public_id`, `MTCK-` plus minimum nine-digit padding, unique globally,
GraphQL Help response and notification email) and Message
(`ticket_messages.public_id`, `MTCKM-` plus minimum nine-digit padding, unique
globally, GraphQL Help response). Other transport identifiers are UUIDv7
Mercurion public IDs governed by the existing shared validator; opaque provider
IDs and internal primary keys remain out of scope.

Replaced the shared Help formatter's unbranded string result with typed,
family-specific TicketPublicId and MessagePublicId codecs. The codecs provide
canonical formatting, strict family parsing, source extraction, round-trip
checks, invalid-input errors, and type-level separation. Help response DTOs
now expose the family-specific brands. Added positive database constraints for
both persisted BIGSERIAL sources in a new migration without changing an
already-applied migration.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand
  src/app_modules/help/models/value-objects/help-public-id.spec.ts
  src/app_modules/help/models/dto/help-presenters.spec.ts` — passed, 2 suites
  and 24 tests.
- `npm test --workspace mercurion_web_node -- --runInBand
  src/app_modules/help/services/help.service.spec.ts
  src/app_modules/help/resolvers/help.resolver.spec.ts` — passed, 1 suite and
  1 test (the repository currently has no Help resolver spec file).
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node -- --no-warn-ignored` — passed.
- `npm run build --workspace mercurion_web_node` — passed.
- `npm run ci:public-id-validation` — passed.
- `git diff --check` — passed.
- `npm run migration:check --workspace mercurion_web_node` — could not run
  because this worker environment has no SQL configuration; it failed before
  database access with the repository's `SQL_DATABASE_* is required`
  configuration diagnostic. Migration source was reviewed and the exact
  feature-SHA CI database job remains the authoritative migration check.
### Full pre-merge CI-parity validation
Pending exact pushed feature-SHA Actions validation; complete clean-install and
aggregate CI parity remains Actions-owned. Local `npm ci` and `npm run ci:check`
were not run.
### Browser validation performed
Not applicable under the supplied worker instruction; no runtime or browser
process was started.
### Commits
Pending commit.
### Merge / CI
Coordinator owns feature-SHA CI observation and integration; this worker does
not merge `develop`.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
