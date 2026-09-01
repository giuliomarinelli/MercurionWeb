# 0128 - Unify REST, GraphQL and WebSocket error presentation

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one transport-neutral error presentation model from typed application errors and use thin REST, GraphQL and WebSocket adapters so all transports preserve the same error classification, code and observability metadata.

Source: `BE-014` in Series `0001`.

## Context

Error handling is currently split between `HttpExceptionFilter`, the Mercurius/GraphQL `errorFormatter`, WebSocket/RPC exception paths and local catch/mapping code. Those paths duplicate decisions about internal/public messages, status/classification and logging. Task `0127` establishes typed application errors; this task makes that single classification authoritative while allowing each transport to serialize it appropriately.

## Relevant files and modules

- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- Socket.IO gateway/guards/error handlers
- typed application-error model from `0127`
- response/error DTOs and logging/observability helpers
- REST/GraphQL/WebSocket E2E tests

## In scope

- Define one canonical error presentation record containing stable code/category, public message/details policy, correlation/request metadata and internal diagnostic cause separately.
- Adapt Nest validation/framework errors and typed application errors into the canonical record once.
- Implement thin REST serializer/filter, GraphQL formatter and WebSocket/RPC serializer using that record.
- Ensure production redaction rules are shared rather than independently reimplemented.
- Preserve one correlation identifier/trace metadata model across transports where transport capabilities permit.
- Remove duplicated message/status classification switches from GraphQL/socket paths.
- Add contract tests asserting equivalent application errors classify identically over REST, GraphQL and WebSocket.

## Out of scope

- Do not force identical wire envelopes when transport standards require different shapes; classification semantics must match, serialization may differ.
- Do not leak stack traces/internal causes to clients.
- Do not change business-error mappings defined by `0127` without a human-approved contract decision.
- Do not redesign the logging backend; `0129` owns LoggerPort.

## Decisions already made

- Typed application errors are the classification source of truth.
- A shared presenter produces a canonical semantic record; transport adapters serialize it.
- Redaction and public/internal message policy are centralized.
- Request/correlation metadata is preserved consistently enough to join client failures with logs.

## Requirements

1. Inventory current REST, GraphQL and WebSocket error shapes and classification/redaction logic.
2. Define the canonical semantic error record and presenter.
3. Refactor HTTP filter, GraphQL formatter and socket/RPC error path to consume the presenter.
4. Ensure validation errors retain structured field/details information without becoming arbitrary internal messages.
5. Ensure unhandled errors are logged with cause/correlation metadata and serialize as safe internal errors.
6. Add a shared table of representative errors and assert each transport produces equivalent code/category/public semantics.
7. Remove duplicated status/message mapping logic from transport implementations.

## Acceptance criteria

- [ ] One presenter owns application-error classification/redaction semantics.
- [ ] REST, GraphQL and WebSocket expose the same stable error code/category for the same failure.
- [ ] Transport adapters contain serialization logic only, not business classification switches.
- [ ] Internal causes/stacks are never exposed in production responses.
- [ ] Correlation/request metadata is consistently available for diagnostics.
- [ ] Cross-transport error contract tests pass.

## Validation

Run shared presenter tests plus REST/GraphQL/WebSocket integration/E2E error cases, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if current external clients depend on contradictory transport error semantics and no canonical compatibility decision exists; preserve evidence and request that decision rather than silently breaking one client.

## Dependencies

- `0127-replace-string-status-mapping-with-typed-application-errors.md` must be `DONE`.

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
