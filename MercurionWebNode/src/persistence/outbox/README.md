# Transactional outbox

`outbox_events` is the shared persistence boundary for post-commit email,
notification, indexing, audit, and log effects. Domain producers keep their
own event type and payload contracts; the dispatcher only requires the
versioned envelope fields stored by `OutboxEvent`.

Consumers are registered by `(event_type, version)`. A contract change adds a
new version and consumer rather than mutating the meaning of an existing
version. Existing consumers remain available while pending events drain, after
which an old version can be retired in a separate migration.

Delivery is at-least-once. Consumers must use the event ID or domain dedupe key
when the provider supports idempotency. Claims use a bounded lease and
`FOR UPDATE SKIP LOCKED`; transient failures are retried with bounded
exponential backoff, while exhausted or permanent failures become
`dead_letter`. Operators can requeue a dead-letter event through the repository
after correcting the underlying cause.

Completed events are retained for operational inspection and duplicate
diagnosis. A scheduled maintenance operation may purge `succeeded` events
older than the configured retention window, but must retain `dead_letter`
events until reviewed or explicitly requeued. Purging is deliberately
separate from dispatch so retention changes cannot affect delivery or
idempotency.
