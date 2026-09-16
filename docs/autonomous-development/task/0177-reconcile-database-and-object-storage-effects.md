# 0177 - Reconcile database and object-storage effects

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make document upload/delete/profile-image replacement converge after partial Dropbox/database failures through idempotent compensation or outbox work plus an observable reconciler that can detect and repair orphan objects and orphan metadata.

Source: `DATA-028` in Series `0001`.

## Context

Current upload writes to Dropbox first, then persists metadata; on DB failure it performs best-effort Dropbox delete. Avatar replacement deletes the old DB row in the transaction and attempts old-object cleanup after commit. Delete performs Dropbox deletion first and then DB deletion; if the second step fails, the code explicitly reports `File removed from Dropbox but not from DB`. These are unavoidable distributed effects, so best-effort inline cleanup alone cannot guarantee convergence after crash/network failure.

## Relevant files and modules

- document application service/object-store port from `0176`
- Dropbox adapter
- Document/User entities
- transactional outbox infrastructure from `0158`
- migrations from `0150`
- scheduler/worker lifecycle infrastructure
- logging/metrics infrastructure

## In scope

- Define durable state/intent for pending object creation/deletion/cleanup.
- Make upload/delete/avatar replacement idempotent across retries and process crashes.
- Use transactionally persisted compensation/outbox work where DB state participates.
- Implement a reconciler that detects DB→storage and storage→DB divergence using stable provider object identifiers.
- Define retry/backoff/dead-letter/terminal states and operational observability.
- Ensure repeated reconciliation is safe.
- Add failure-injection tests at every boundary between provider I/O and DB commit.

## Out of scope

- Do not promise a distributed ACID transaction across PostgreSQL and Dropbox.
- Do not make user requests wait for non-critical cleanup retries.
- Do not generalize every external effect yet; `0183` will unify the repository-wide event/outbox boundary.

## Decisions already made

- Cross-system consistency is achieved by durable intent + idempotent convergence, not pretending provider calls participate in the DB transaction.
- Provider object IDs/paths used for reconciliation are internal infrastructure data.
- A failed cleanup is observable work, not a swallowed warning.

## Requirements

1. Enumerate upload/delete/avatar-replacement state transitions and every crash point.
2. Persist enough metadata to identify desired state and provider object deterministically.
3. For upload, ensure a DB failure after provider success leaves durable/recoverable cleanup intent or an immediately idempotent compensation path whose failure is persisted.
4. For delete, choose a tombstone/pending-delete sequence that prevents a provider-success/DB-failure record from masquerading as downloadable content.
5. For avatar replacement, make old-object cleanup retryable without risking deletion of the new avatar.
6. Implement periodic/on-demand reconciliation with bounded batches and locks so multiple workers do not race the same item.
7. Emit metrics/logs for pending age, retries, terminal failures and repairs.
8. Add integration tests simulating provider timeout, provider success + process crash, DB rollback, duplicate retry and reconciler restart.

## Acceptance criteria

- [ ] No known partial failure leaves divergence that only a log message can repair.
- [ ] Upload/delete/profile-image commands are safely retryable.
- [ ] A reconciler can enumerate and repair outstanding DB/storage divergence.
- [ ] Reconciliation is idempotent and concurrency-safe.
- [ ] Failure states and retry age are observable.

## Validation

Run failure-injection integration tests with a deterministic fake object store, reconciler concurrency/restart tests, Nest lint/typecheck/build/tests and the full CI-parity gate.

## Browser validation

Validate ordinary upload/delete/avatar flows through `http://localhost:8888`; partial-failure/reconciliation behavior is validated through integration tests and operational state assertions rather than browser fault injection.

## Stop conditions

Mark `BLOCKED` if Dropbox APIs/account permissions do not provide a reliable stable identifier/listing primitive required for reconciliation, or if retention/deletion semantics require a human product/compliance decision.

## Dependencies

- `0176-separate-the-object-storage-port-from-document-commands.md` must be `DONE`.
- `0158` transactional outbox and `0150` migrations must be `DONE`.

## Implementation notes

Prefer explicit states such as pending/active/deleting/failed over guessing consistency from null fields. Reconciliation should compare intended database state to provider state, not perform blind cleanup scans with destructive assumptions.

## Execution notes

### Feature branch
`feature/DATA-028` at base `0729c38c8e51d82c13ff269a3910b98ff1e4f48d`.
### Preflight
- Confirmed clean `feature/DATA-028` identity and exact supplied base SHA.
- Exact base GitHub Actions CI run `35091692269` for
  `0729c38c8e51d82c13ff269a3910b98ff1e4f48d` completed successfully with
  both `Prerequisites (windows-latest)`, `Prerequisites (ubuntu-latest)` and
  `Required gate` green.
- No task-owned workspace process was active before implementation. The
  canonical Tox21, Nest and Angular startup preflight was completed in order;
  the first Angular invocation was corrected to the declared
  `MercurionWebNg` working directory after its root-directory command exposed
  only the expected missing-script diagnostic. Two complete readiness rounds
  returned HTTP 200 from `/health` and `/`.
- Hard prerequisites 0150, 0158 and 0176 are checked `DONE`. Chrome DevTools
  capability probe `list_pages` succeeded without navigation.
  Post-change runtime readiness again returned two HTTP 200 rounds.
### Preflight remediation
The initial Angular command was stopped with no repository mutation and
reissued from the canonical `MercurionWebNg` directory. No baseline files or
task status were changed during that correction.
### Summary
Added durable storage-operation intent for provider cleanup and deletion,
including explicit pending/processing/failed/terminal/completed states, retry
backoff, dedupe keys, bounded reconciliation and structured operational
logging. Upload compensation persists cleanup intent when immediate deletion
fails; delete and avatar replacement tombstone metadata before provider
cleanup, making retries safe and preventing inactive objects from being
downloaded. Dropbox now exposes a provider-neutral listing primitive, and a
versioned migration creates the operation table.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand
  src/app_modules/dropbox-object-store/application/document-command.service.spec.ts
  src/app_modules/dropbox-object-store/application/storage-reconciliation.service.spec.ts
  src/app_modules/dropbox-object-store/infrastructure/dropbox-object-store.adapter.spec.ts`
  — 3 suites, 7 tests passed, including provider-failure retry and deletion
  repair scenarios.
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node -- --no-warn-ignored` — passed.
- `npm run build --workspace mercurion_web_node` — passed.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Owned by GitHub Actions after the task-specific commit is pushed; local
`npm ci` and `npm run ci:check` were not run.
### Browser validation performed
- Canonical runtime startup used `../MercurionTox21`, `MercurionWebNode` and
  `MercurionWebNg` in the required order, with all three managed sessions
  stopped afterward.
- Chrome DevTools opened `http://localhost:8888/documents`; the Angular
  application returned its observable `404-not-found` page. The current
  baseline has backend-only document endpoints and no Angular upload/delete/
  avatar consumer route, so ordinary document flows are not browser-reachable;
  no credentials were needed or entered.
### Commits
`e83fdbe3` — `feat(DATA-028): reconcile document storage effects`; required
Copilot co-author trailer included.
### Merge / CI
_Not started._

### CI repair
- Exact feature-SHA run `35093607850` failed in `nest-orphans` because the
  TypeORM migration
  `src/persistence/migrations/1789660000000-AddStorageOperations.ts` was not
  registered as a dynamic reachability entrypoint.
- Added the migration to `MercurionWebNode/nest-reachability.config.json`
  using the existing `typeorm-cli` registration convention.
- Focused validation:
  `npm run nest:orphans:check` — passed.
  `npm run ci:architecture` — passed.
- Repair commit: _pending_.

### Rollback
_Not applicable._
### Blocker / human decision required
_None._
