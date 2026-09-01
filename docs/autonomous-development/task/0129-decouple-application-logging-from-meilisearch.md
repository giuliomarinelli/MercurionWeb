# 0129 - Decouple application logging from Meilisearch

- [ ] DONE
- [ ] BLOCKED

## Objective

Introduce a structured `LoggerPort` owned by neutral/core application infrastructure and migrate production domains so they no longer import `MeiliLoggerService`, Meilisearch logger interfaces or the Meilisearch module merely to log.

Source: `BE-015` in Series `0001`.

## Context

The audit found 37 files depending directly on Meilisearch logging. Current examples span Auth guards/services, Redis, Socket.IO and bootstrap; many classes call `MeiliLoggerService.forContext()` and import `MeiliContextLogger` from the Meilisearch domain. This couples every domain to a search/infrastructure adapter and contributes to the module SCC addressed by `0115`. Meilisearch may remain one logging sink/adapter, but it must not define the application logging API.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/meilisearch/services/meili-logger.service.ts`
- `MercurionWebNode/src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface.ts`
- every production import of `MeiliLoggerService` / `MeiliContextLogger`
- `MercurionWebNode/src/main.ts`
- Redis/Auth/Socket/Help/etc. modules currently importing Meilisearch for logging
- logging/audit specs

## In scope

- Define a structured LoggerPort/context logger API independent of Meilisearch and any single sink.
- Support contextual fields and typed/structured metadata rather than interpolated opaque strings as the primary contract.
- Provide a Meilisearch-backed adapter implementing the port if that sink remains required.
- Migrate production domains to inject the neutral logger token/factory.
- Remove Meilisearch module imports that existed only for logging.
- Preserve logging levels and security redaction requirements.
- Add an architecture gate prohibiting application/domain imports of Meilisearch logging implementation.

## Out of scope

- Do not remove Meilisearch search/index functionality.
- Do not redesign the later audit/outbox architecture (`DATA-029/034`). Security audit is a separate effect from ordinary application logging.
- Do not log secrets, access/refresh tokens, OAuth tokens, OTPs or sensitive payloads to gain observability.
- Do not require one specific external log vendor.

## Decisions already made

- Application code depends on a structured LoggerPort, never a Meilisearch implementation.
- Logging adapter/sink selection belongs to infrastructure/composition root.
- Context is structured metadata with stable keys where useful; message strings are not machine-readable control contracts.
- Redaction occurs before/safely within adapter output and is testable.

## Requirements

1. Inventory all Meili logging imports and classify ordinary logging versus security-audit/indexing concerns.
2. Define neutral logger/context interfaces and injection tokens in a dependency-safe layer.
3. Implement the current Meili sink as an adapter without exposing its types to callers.
4. Migrate all ordinary production logging consumers.
5. Remove now-unnecessary `MeilisearchModule` dependency edges.
6. Add structured metadata/redaction tests and adapter failure tests; logging failure must not create recursive application failure.
7. Add a static boundary rule rejecting direct application/domain imports of the Meili logger implementation.

## Acceptance criteria

- [ ] No production application/domain class imports `MeiliLoggerService` or `MeiliContextLogger` directly.
- [ ] Ordinary logging uses a neutral structured LoggerPort.
- [ ] Meilisearch, if retained as a sink, is an infrastructure adapter replaceable without domain changes.
- [ ] Module edges that existed only for logging are removed.
- [ ] Sensitive values are covered by redaction tests.
- [ ] Architecture/CI rejects a new direct Meili logging dependency.

## Validation

Run logger adapter/consumer/redaction tests, architecture graph checks, affected module tests, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a current Meili logging call is actually a required security-audit/domain effect whose ownership cannot be separated without the later outbox/audit design; classify it explicitly instead of silently treating it as ordinary logging.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` must be `DONE`.
- `0128-unify-rest-graphql-and-websocket-error-presentation.md` should be `DONE` so error observability uses the neutral logger contract.

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
