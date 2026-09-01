# 0178 - Move Meilisearch and security-audit effects behind outbox events

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove synchronous/pervasive Meilisearch indexing and security-audit side effects from domain mutations by recording typed durable events in the same transaction as domain state and processing them through idempotent observable consumers.

Source: `DATA-029` in Series `0001`.

## Context

Meilisearch services/logger dependencies are injected throughout core services, and mutation paths can call indexing/audit/logging infrastructure directly. External indexing or audit delivery must not determine whether an already-valid database mutation commits. `0158` introduces durable outbox mechanics for Help notifications; this task extends that proven mechanism to search-index and security-audit intents while keeping domain transactions authoritative.

## Relevant files and modules

- Meilisearch services/adapters and callers
- security audit/history/logger mutation callers
- domain services that synchronously trigger indexing/audit
- outbox infrastructure from `0158`
- application event/error catalog
- graceful worker lifecycle/observability infrastructure

## In scope

- Inventory synchronous indexing and security-audit effects triggered by mutations.
- Define versioned domain/application events carrying the minimum immutable payload required by consumers.
- Persist event/outbox rows in the same Unit of Work as the mutation.
- Implement idempotent Meilisearch and audit consumers with retries/backoff/dead-letter handling.
- Ensure consumer failure never rolls back or changes the already-committed domain command result.
- Add correlation/causation IDs and observable lag/failure metrics.
- Remove direct infrastructure dependencies from migrated domain services.

## Out of scope

- Do not migrate every email/notification effect in this task; `0183` owns final repository-wide convergence.
- Do not redesign the Meilisearch index schema unless required for idempotent updates.
- Do not weaken audit durability: asynchronous means decoupled from response latency, not best-effort loss.

## Decisions already made

- Domain state and event intent commit atomically in the database.
- Consumers are at-least-once and therefore must be idempotent.
- External service outages affect event delivery/lag, not the truth of the domain commit.

## Requirements

1. Enumerate mutation→Meili/audit call sites and classify each effect as required, obsolete or informational.
2. Define event names, schema versions, aggregate/resource identity, occurred-at timestamp, correlation and dedupe identity.
3. Write events via the Unit of Work used by the mutation rather than after commit from the service method.
4. Make index consumers use upsert/delete semantics that are safe under duplicate and out-of-order delivery, with version/order guards where necessary.
5. Make security-audit consumers deduplicate without losing distinct legitimate events.
6. Remove migrated synchronous provider calls from domain methods.
7. Add tests for consumer outage, duplicate delivery, reordered events, restart and poison-message handling.

## Acceptance criteria

- [ ] Migrated domain mutations contain no synchronous Meilisearch/security-audit provider call.
- [ ] Mutation + event intent are atomic.
- [ ] Duplicate/retried events do not create incorrect index/audit state.
- [ ] External outages leave retryable observable backlog without changing command success.
- [ ] Correlation from command to consumer processing is available in logs/metrics.

## Validation

Run domain transaction/outbox tests, Meili/audit consumer idempotency and failure-injection tests, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

For a mutation whose result is searchable, perform it through `http://localhost:8888` and verify eventual search visibility. Audit delivery itself is validated through consumer/integration assertions.

## Stop conditions

Mark `BLOCKED` if a security/compliance requirement mandates synchronous external acknowledgement for a specific audit event and no approved durable local audit record satisfies that requirement.

## Dependencies

- `0158-add-transactional-outbox-for-help-notifications.md` and `0152` Unit of Work must be `DONE`.
- `0129` logger abstraction should be `DONE` so domain code is not coupled back to Meilisearch through logging.

## Implementation notes

Do not serialize whole TypeORM entities into the outbox. Event payloads are explicit versioned contracts containing only consumer-required immutable data or IDs for safe re-read.

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
