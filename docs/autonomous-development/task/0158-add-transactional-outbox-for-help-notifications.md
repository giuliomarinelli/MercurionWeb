# 0158 - Add a transactional outbox for Help notifications

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Help ticket persistence and notification intent atomic by writing a versioned outbox event in the same database transaction as each ticket/message/status command, then delivering email asynchronously with durable retry and logical idempotency.

Source: `DATA-009` in Series `0001`.

## Context

`HelpService.createTicket()` commits the Ticket + first TicketMessage transaction before calling two mail methods. `addUserMessage()` and `addSupportMessage()` similarly commit data, reload the ticket and then send mail. A mail failure can therefore occur after the command has durably succeeded, while callers/implementation may still treat notification failure as part of the command path. There is currently no outbox table or durable notification intent.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/help/services/help.service.ts`
- Help entities/use cases
- `MercurionWebNode/src/app_modules/notification/`
- migrations from `0150`
- Unit of Work from `0152`
- graceful lifecycle infrastructure from the BE section
- new outbox persistence/dispatcher infrastructure

## In scope

- Define a versioned transactional-outbox record for Help notification events.
- Persist ticket/message/status mutation and corresponding outbox event in the same Unit of Work transaction.
- Include stable event ID, aggregate identity, event type/version, payload or payload reference, created/available timestamps, attempt state and a unique logical dedupe key.
- Implement a bounded dispatcher/worker that claims pending events safely under multiple process instances, calls notification delivery and records success/failure.
- Add retry/backoff/dead-letter or terminal-failure semantics with observable diagnostics.
- Make repeated processing of one logical outbox event reuse the same notification identity and never create another logical event.
- Ensure application shutdown does not abandon a claimed event indefinitely.

## Out of scope

- Do not put SMTP/network delivery inside the database transaction.
- Do not introduce a distributed transaction with the mail server.
- Do not claim impossible exactly-once SMTP delivery if the configured transport has an ambiguous send/ack failure window.
- Do not generalize the outbox to every domain in this task unless the abstraction stays small and Help remains the proven first consumer.

## Decisions already made

- Database state and notification *intent* are atomic; external email delivery is asynchronous.
- Outbox processing is at-least-once internally with one stable logical notification/event identity.
- A retry cannot insert a second outbox event for the same command.
- When the underlying email transport supports a provider idempotency key/message identity, the adapter uses the stable outbox event identity.
- If SMTP cannot guarantee exactly-once delivery across an ambiguous network failure, that transport limitation is explicit rather than hidden behind a false guarantee.

## Requirements

1. Define an outbox entity/migration with unique event/dedupe identity, event type/version, serialized payload, status, attempt count, available-at, processed-at and last-error diagnostics as appropriate.
2. Create notification events for ticket opened, user message added, support replied and any close/reopen notifications that currently exist/are required.
3. Write the outbox row with the ticket mutation using the same `EntityManager`/Unit of Work.
4. Remove direct mail calls from Help command success paths.
5. Implement safe concurrent claiming (for example row locking/skip-locked or equivalent supported by the chosen DB) so multiple app replicas do not process the same row concurrently.
6. Use bounded exponential retry/backoff and a terminal/dead-letter state after the configured limit; expose failures through structured logging/health diagnostics as appropriate.
7. Pass a stable message/event identity into the mail adapter so retries are logically idempotent and observable.
8. Add crash-boundary tests: before commit, after commit/before dispatch, delivery failure, retry, worker restart and concurrent dispatchers.
9. Ensure command/API success depends on the DB transaction, not immediate SMTP availability.

## Acceptance criteria

- [ ] Help state change and notification intent commit or rollback together.
- [ ] No Help command sends email directly after its DB commit.
- [ ] A retry never creates a second logical outbox event for the same command.
- [ ] Pending events survive process restart and are retried with bounded policy.
- [ ] Concurrent dispatchers cannot actively deliver the same claimed event at the same time.
- [ ] Mail transport delivery guarantees/limitations are accurately represented and tested at the application boundary.
- [ ] Notification failure does not roll back or falsely report failure for an already committed Help command.

## Validation

Run DB-backed outbox transaction/concurrency/restart tests with a fake mail adapter, Help command tests, dispatcher lifecycle tests, migration tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the product requires strict exactly-once external email delivery but the configured mail transport exposes no usable idempotency primitive and duplicate delivery is unacceptable; record the transport capability gap rather than claiming exactly-once semantics.

## Dependencies

- `0150-establish-versioned-typeorm-migrations.md`, `0152-introduce-canonical-typeorm-unit-of-work.md` and `0157-make-help-public-ids-single-source-and-deterministic.md` must be `DONE`.
- Bounded graceful-shutdown infrastructure from the BE section should be `DONE`.

## Implementation notes

Keep domain events/versioning independent of the current Handlebars template filename. The outbox should capture stable notification intent, while `0162` maps that intent to the current template registry.

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
