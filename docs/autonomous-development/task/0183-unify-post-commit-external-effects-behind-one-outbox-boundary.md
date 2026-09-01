# 0183 - Unify post-commit external effects behind one outbox boundary

- [ ] DONE
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
