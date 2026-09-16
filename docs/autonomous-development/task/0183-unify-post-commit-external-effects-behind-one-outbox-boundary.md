# 0183 - Unify post-commit external effects behind one outbox boundary

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Converge email, notifications, indexing and security-audit work triggered by domain mutations onto one versioned transactional event/outbox boundary with shared dispatch, idempotency, retry, observability and lifecycle semantics.

Source: `DATA-034` in Series `0001`.

## Context

Earlier tasks intentionally solve concrete hotspots first: `0158` introduces a Help notification outbox and `0178` moves Meilisearch/security-audit effects behind durable events. Other mutation paths can still start email/notification/external side effects with different timing and error semantics. Without a common boundary, each domain may invent its own outbox table, retry loop, status vocabulary and dedupe behavior.

## Relevant files and modules

- outbox infrastructure from `0158`
- indexing/audit consumers from `0178`
- notification/mail sender modules and mutation callers
- domain services that emit post-commit effects
- migrations from `0150`
- Unit of Work from `0152`
- worker/graceful-shutdown/observability infrastructure

## In scope

- Define one reusable persisted event envelope/schema and outbox repository.
- Migrate Help-specific and indexing/audit outbox mechanisms onto it without changing domain event meaning.
- Inventory remaining mutation-triggered email/notification/index/audit effects and migrate them where the effect should occur after a successful commit.
- Standardize event version, identity, correlation/causation, occurred-at, attempt count, availability time and terminal state.
- Standardize claiming/locking, retry/backoff, dead-letter/parking and retention.
- Provide typed consumer registration/dispatch without a giant string switch.
- Add common lag/retry/failure metrics and tracing.

## Out of scope

- Do not asynchronously defer an external call that is itself required to validate/compute the domain command before commit (for example an indispensable scientific calculation) merely to satisfy this pattern.
- Do not promise exactly-once delivery to providers that only support at-least-once effects.
- Do not couple all domains through one mega event payload.

## Decisions already made

- Domain transaction + event intent are atomic.
- Dispatch is at-least-once; consumers own idempotency.
- Outbox infrastructure is shared, while event contracts remain domain-specific and versioned.
- External-effect failure after commit is observable/retryable and never retroactively changes the command result.

## Requirements

1. Compare the outbox/event designs created in `0158` and `0178` and select one canonical persistence/dispatch model.
2. Define a typed/versioned envelope with stable event ID, event type/version, aggregate/resource identity, correlation/causation IDs, payload, timestamps and processing metadata.
3. Make event enqueue available through the canonical Unit of Work so domain code cannot accidentally write intent outside the transaction.
4. Implement safe multi-worker claiming/lease/lock semantics and bounded batch dispatch.
5. Define retry classification: transient retry, permanent parked/dead-letter, and operator requeue semantics.
6. Migrate remaining eligible email/notification/index/audit calls and remove parallel ad-hoc retry paths.
7. Add consumer-level idempotency keys and tests for duplicate/out-of-order delivery as appropriate.
8. Add operational metrics for pending count/age, attempts, terminal failures and consumer latency.
9. Document event schema evolution and retention/purge behavior.

## Acceptance criteria

- [ ] There is one canonical outbox persistence/dispatch infrastructure.
- [ ] Help, indexing/audit and remaining eligible mutation effects use it.
- [ ] Domain services do not perform post-commit provider calls directly for migrated effects.
- [ ] Multi-worker dispatch, retry and duplicate delivery are safe and tested.
- [ ] Backlog/terminal failures are observable and operable.
- [ ] Event contracts remain independently versioned by domain/consumer.

## Validation

Run outbox transaction, concurrent dispatcher, duplicate/retry/dead-letter and restart tests; run representative Help/mail/index/audit end-to-end integrations; then Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Perform representative user mutations through `http://localhost:8888` that trigger notification and search-index effects, verifying immediate command success plus eventual external outcome.

## Stop conditions

Mark `BLOCKED` if any effect's product/compliance semantics require synchronous acknowledgement and no durable local intent satisfies the requirement, or if event retention/dead-letter policy requires a human compliance/operations decision.

## Dependencies

- `0158-add-transactional-outbox-for-help-notifications.md` and `0178-move-meilisearch-and-security-audit-effects-behind-outbox-events.md` must be `DONE`.
- `0152` Unit of Work and graceful worker shutdown infrastructure must be `DONE`.

## Implementation notes

Unify infrastructure, not event schemas. A common `outbox_events` table/dispatcher can carry multiple strongly typed event families without reducing every payload to an unvalidated `Record<string, any>`.

## Execution notes

### Feature branch
`feature/DATA-034`
### Preflight
Base `develop` SHA `dfb82eeb3cb32074fbb5c3d952774fe5aebfda9a` was clean and
matched the supplied green exact-SHA CI baseline. Focused unchanged-baseline
Nest typecheck and lint passed. No task-owned Angular, Nest, Tox21, or test
watcher process was active before implementation. Chrome DevTools tool-surface
probe passed.
### Preflight remediation
None. For post-change runtime validation, the existing development database
schema was already present without migration history; the canonical migration
was applied directly through its TypeORM migration implementation after the
normal `migration:run` command correctly refused to replay the initial schema.
### Summary
Introduced one typed/versioned `outbox_events` boundary with shared envelope,
consumer registry, batch claiming/leases, retry/dead-letter/requeue lifecycle,
metrics, canonical migration, and schema-evolution/retention documentation.
Help, Meilisearch/security-audit/log events and eligible account email effects
now use the shared dispatcher. Registration, email-change, and password-change
mutation intents are transactionally appended; indispensable verification,
password-reset-link, and MFA challenge sends remain synchronous. Existing
domain event contracts remain independently typed and versioned.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_node`
- `npm run lint --workspace mercurion_web_node -- --quiet`
- `npm run ci:transactions`
- `npm run ci:nest:architecture`
- `npm run nest:orphans:check`
- `npm run build --workspace mercurion_web_node`
- Focused Jest suites for account flow, outbox append/dispatcher, and consumer
  registry: 6 tests passed.
- `git diff --check`

No local `npm ci` or `npm run ci:check` was run.
### Full pre-merge CI-parity validation
The supplied exact base-SHA merge CI was green. Complete clean-install
validation remains delegated to the permanent GitHub Actions gate for the
final pushed feature SHA.
### Feature-CI repair
Exact feature SHA `8ec0d8b6d679e9d5dec73ac68c7ecb7d051d7243` failed run
`35106178581` in the PostgreSQL migration schema job on Ubuntu because the
canonical migration-created `outbox_dispatch_idx` was absent from the entity
metadata and schema validation requested `DROP INDEX "public"."outbox_dispatch_idx"`.
The repair declares the existing three-column dispatch index on `OutboxEvent`,
matching `1789700000000-CanonicalizeOutboxEvents` and preserving claiming
performance semantics. The repaired TypeORM metadata inspection passed, and
the focused outbox tests, Nest typecheck, Nest lint, and `git diff --check`
passed. Local `migration:drift` reached the database but remains blocked by
pre-existing unrelated schema drift; no `outbox_dispatch_idx` drift was
reported. Local `migration:check` could not run cleanly because the existing
development database has no matching migration history and the initial
migration found an already-existing `backup_codes` relation.
### Browser validation performed
Started Tox21, Nest, and Angular in the mandated order with live handles.
After readiness, two consecutive rounds returned HTTP 200 from
`http://localhost:8888/health` and `/`. Fresh ordinary authenticated browser
state was verified in Chrome DevTools at `http://localhost:8888/dashboard`.
Created Help ticket `MTCK-000000084` through `/help`; the UI returned immediate
success and showed the new ticket. Database inspection showed the related
`help.ticket_opened.user` and `help.ticket_opened.support` events in
`outbox_events` with status `succeeded`, attempt count `1`, and populated
processing timestamps. All task-owned runtime processes were stopped afterward.
### Commits
`fd17aef1` — `feat: unify post-commit effects behind outbox`

Execution-note correction is recorded in the follow-up metadata commit.
The repair is included in the current feature-CI repair commit.
### Merge / CI
Pending coordinator integration and exact feature-SHA CI observation.
### Rollback
Not applicable.
### Blocker / human decision required
None.
