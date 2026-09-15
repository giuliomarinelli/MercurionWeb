# 0148 - Adopt one UTC timestamp contract across Nest boundaries

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-034`
### Preflight
Verified branch identity `feature/BE-034`, preserved task-scoped worktree changes,
and base `b09d5930bf2fa92baa44ce9bfd4d410e727a59af` equal to local
`develop`/`origin/develop`. GitHub Actions run `34961530324` for that exact
SHA completed successfully with a successful `Required gate`; the run used the
autonomous metadata path because the base commit contains control-plane-only
changes. No browser/runtime validation is declared for this recipe. No
workspace-consuming process was started.
### Preflight remediation
The preserved implementation initially failed Nest typecheck because the
feedback controller still exposed the TypeORM entity after the public contract
changed. The controller and moderation path were corrected to use the public
REST contract and explicit entity-to-wire mapping. No unrelated files were
changed.
### Summary
Added a shared millisecond-precision `UtcInstant` contract with strict UTC
wire parsing, epoch/date conversion helpers, and application `utcNow()`/
TOTP boundary helpers. Normalized REST response/error timestamps, session,
history, feedback, MFA metadata, audit and logger timestamps at explicit
boundaries while leaving elapsed-time/TTL values numeric. Feedback persistence
continues to use epoch milliseconds internally and now maps to the public
contract without leaking identity fields.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace @mercurion/rest-contracts`
- `npm run typecheck --workspace mercurion_web_node`
- `npm run lint --workspace mercurion_web_node`
- `npm run contracts:check --workspace mercurion_web_node` (10 suites, 55 tests)
- focused Nest tests for temporal, REST runtime parity, authentication,
  feedback, history and session boundaries (8 suites, 23 tests total)
- `npm run build --workspace @mercurion/rest-contracts`
- `npm run build --workspace mercurion_web_node`
- UTC epoch round-trip under `TZ=America/Los_Angeles` and `TZ=Europe/Rome`
- `git diff --check`

Forbidden clean-install and aggregate commands were not run: `npm ci` and
`npm run ci:check`.
### Full pre-merge CI-parity validation
Owned by GitHub Actions on the exact pushed feature SHA; not run locally per
repository policy.

### CI repair for feature run `34962890476`
The exact feature SHA `0fe076024e7a98df2373fc63812929b32c3d767a` failed both
platform static gates because the REST compatibility inventory was stale after
the timestamp contract changes. The Nest test gate also failed one stale
expectation in `mfa-authentication.handlers.spec.ts`: the handler correctly
returned millisecond-precision UTC wire strings while the test still expected
epoch numbers.

Applied only the confirmed repair:

- updated the MFA handler expectation to the canonical UTC wire values;
- taught the REST compatibility type-shape inventory to treat branded string
  aliases such as `UtcInstant` as their JSON string primitive at the boundary;
- regenerated `docs/architecture/rest-contract-compatibility.json`.

Focused repair validation passed:

- `node scripts/check-rest-compatibility.mjs`
- `npm test --workspace mercurion_web_node -- --runInBand src/app_modules/auth/application/mfa-authentication.handlers.spec.ts`
- `git diff --check`

### Browser validation performed
Not applicable; the recipe explicitly declares browser validation not
applicable.
### Commits
`fd8be666` — `feat(temporal): adopt UTC instant contract across Nest
boundaries` (created with `git commit --no-gpg-sign`).
`0fe076024` — `docs(task): finalize BE-034 execution notes`
`(created with git commit --no-gpg-sign)`.
`2f66f609` — `fix(ci): repair BE-034 compatibility and MFA checks`
(created with git commit --no-gpg-sign).
### CI repair for feature run `34963655285`
The exact feature SHA `46fb211a8254ce13be59336b0bf96bc1507f0c98` passed the
prior repair checks but failed Angular unit-test compilation because the
dashboard mapper fixture still assigned epoch numbers to the public
`UtcInstant` contract.

Applied only the confirmed Angular correction:

- converted dashboard activity mapping through the shared
  `epochMsFromUtcInstant`/`isUtcInstant` boundary helpers;
- updated the focused mapper fixtures to construct canonical
  millisecond-precision `UtcInstant` values while retaining malformed-input
  coverage.

Focused repair validation:

- `npm run typecheck --workspace mercurion_web_ng` passed;
- `npm --workspace mercurion_web_ng exec ng test -- --watch=false
  --karma-config=karma.conf.js --include=src/app/pages/profile/dashboard/dashboard-widget.mappers.spec.ts`
  passed (Angular compiled and all 480 discovered unit tests passed; the
  workspace runner emitted an npm `include` configuration warning and did not
  narrow discovery);
- `npm run lint:angular --workspace mercurion_web_ng` passed;
- `git diff --check` passed;
- direct repository-root ESLint invocation was not applicable because ESLint
  requires the workspace configuration context; the workspace lint passed.
- `npm ci` and `npm run ci:check` were not run locally.

### Merge / CI
Feature-SHA CI is coordinator-owned and required before integration.
### Rollback
_Not applicable._
### Blocker / human decision required
None for local implementation. Coordinator must observe exact feature-SHA
Actions before integration.
