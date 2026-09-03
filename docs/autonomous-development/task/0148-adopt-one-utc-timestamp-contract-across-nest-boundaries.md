# 0148 - Adopt one UTC timestamp contract across Nest boundaries

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Make persistence, domain/application code and public transports use one documented UTC instant semantic with declared precision and conversions performed only at explicit boundaries.

Source: `BE-034` in Series `0001`.

## Context

The backend currently mixes JavaScript `Date`, ISO strings and numeric time values across persistence, DTOs, logs/audit and protocol code. For example security audit/logging emits `new Date().toISOString()`, while other timing code uses `Date.now()` and persistence entities expose database date/timestamp columns through TypeORM. Without a canonical distinction between wall-clock instants and elapsed-duration/TTL values, serialization and precision can drift between domains/transports.

## Relevant files and modules

- TypeORM entities with date/timestamp columns
- REST/GraphQL DTOs/scalars exposing timestamps
- audit/history/session/help/auth models containing time values
- NATS request/response contracts where timestamps occur
- canonical Redis duration contract from `0137`
- shared temporal utilities/types and tests

## In scope

- Define and document the canonical application instant representation and public UTC wire representation.
- Declare supported precision and normalization rules (for example millisecond precision if that matches current JS/DB contracts).
- Distinguish absolute instants from durations/TTL/monotonic elapsed-time measurements.
- Centralize parsing/serialization/validation at persistence and transport boundaries.
- Migrate production DTO/domain code away from ad-hoc string/number/date conversions.
- Add timezone/round-trip/precision tests.

## Out of scope

- Do not convert durations/TTL to calendar timestamps; the Redis duration contract remains separate.
- Do not change database column types solely for stylistic consistency if existing columns already preserve the canonical instant semantics.
- If a persistence column change is actually required, do not use `synchronize` or ad-hoc DDL; use the versioned migration mechanism when available and do not pre-empt the broader migration governance of `DATA-001` unnecessarily.
- Do not introduce local-time business semantics where none currently exist.

## Decisions already made

- Persisted/public event times represent UTC instants, never implicit server-local time.
- Public textual timestamps use one ISO-8601 UTC representation with an explicit zone designator.
- Internal elapsed-time/backoff/rate-limit measurements are durations and are not serialized as instants.
- Conversion occurs at boundaries; domain/application code does not repeatedly parse/format the same timestamp.

## Requirements

1. Inventory backend timestamp fields and classify each as instant, duration or calendar/local value.
2. Define canonical temporal types/helpers/scalar/transformers and precision rules.
3. Normalize persistence reads/writes to UTC instant semantics and verify database round-trip behavior on the test database.
4. Normalize REST/GraphQL/NATS timestamp serialization/validation through shared boundary code.
5. Reject timezone-less/invalid public timestamp input where an instant is expected.
6. Keep `Date.now()` or monotonic clocks only where measuring elapsed time is intentional and typed/documented as such.
7. Add tests across non-UTC process timezone settings proving identical wire/persistence instants and precision.

## Acceptance criteria

- [ ] Absolute timestamps have one UTC semantic throughout application and transports.
- [ ] Public instant serialization has one format and declared precision.
- [ ] Duration/TTL values cannot be confused with epoch/calendar instants by normal typed callers.
- [ ] Persistence round trips preserve the intended instant independent of host timezone.
- [ ] Ad-hoc production timestamp parsing/formatting is eliminated from governed boundaries.

## Validation

Run temporal/unit tests under multiple `TZ` settings, persistence round-trip tests, schema/contract tests, full Nest tests/E2E, strict typecheck, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a public field intentionally represents local civil time rather than an instant and its timezone/calendar semantics are undocumented; do not coerce it to UTC by assumption.

## Dependencies

- `0141-enable-full-typescript-strictness-in-nest.md` should be `DONE`.
- `0137` duration semantics must remain distinct from this instant contract.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0137` (BE-023, SKIPPED_DEPENDENCY), `0141` (BE-027, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0137 BE-023 SKIPPED_DEPENDENCY -> 0148 BE-034 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
