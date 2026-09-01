# 0127 - Replace string-based status mapping with typed application errors

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace the giant textual HTTP-status/error-message mapping with a closed typed application-error taxonomy whose code/class carries stable classification and default status independently of message text.

Source: `BE-013` in Series `0001`.

## Context

`HttpExceptionFilter` currently interprets `RpcException` strings such as `AuthenticationInvalidCredentials`, `TicketNotFound`, `Mfa::TooManyAttempts`, misspelled `Unauthanticated`, and many compound message variants to choose HTTP status. `http-status-map.ts` is over 1,000 lines. This makes message wording part of control flow and creates transport inconsistency. `0128` will unify REST/GraphQL/WebSocket presentation; this task establishes the transport-neutral typed error source that all presenters consume.

## Relevant files and modules

- `MercurionWebNode/src/exception-handling/http-status-map.ts`
- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- application/domain services throwing `RpcException`/`HttpException` strings
- `MercurionWebNode/src/Models/error-res.dto.ts`
- error-related specs

## In scope

- Define a stable `ApplicationError`/error-code taxonomy with typed metadata such as code, category/default status, safe/public message policy and cause/diagnostic metadata.
- Convert application/domain error sites from string parsing contracts to typed errors/codes.
- Keep validation/framework exceptions adaptable into the same classification model at the boundary.
- Remove message-text switches/lookups as the authority for status classification.
- Delete or reduce `http-status-map` to framework-standard status-description functionality only if genuinely needed.
- Add exhaustive/table-driven tests for all existing public error classifications.

## Out of scope

- Do not redesign which existing business/security failures map to 4xx/5xx unless a mapping is demonstrably inconsistent with an already approved contract.
- Do not expose internal exception/cause messages in production responses.
- Do not yet implement each transport's final presentation shape; `0128` owns REST/GraphQL/WebSocket presenters.
- Do not turn error codes into user-facing localization strings.

## Decisions already made

- Stable machine-readable error code/class, not human message text, determines classification.
- Public message and diagnostic/internal cause are separate fields.
- Unknown/unhandled failures classify as internal errors and fail safely.
- Error codes are unique, documented/tested and refactor-safe.

## Requirements

1. Inventory every string/case currently used by HTTP filter/status map and every production throw site.
2. Define typed codes/errors covering the existing contract, including validation, auth, forbidden, not-found, conflict, rate-limit and infrastructure/internal categories.
3. Migrate throw sites incrementally while providing one temporary compatibility adapter only if necessary; remove it before task completion.
4. Ensure rate-limit/public-message normalization is represented by error metadata/presenter policy rather than mutating arbitrary strings.
5. Preserve causes/diagnostic metadata for logging without exposing them publicly.
6. Add exhaustive classification tests and a static check preventing new raw string `RpcException` application contracts where governed.
7. Remove message parsing from the status decision path.

## Acceptance criteria

- [ ] Application/business errors use stable typed codes/classes.
- [ ] HTTP status/classification never depends on parsing a message string.
- [ ] The 1,000-line textual lookup/switch mechanism is removed as an application contract.
- [ ] Existing public status/error classifications remain compatible.
- [ ] Unknown failures become safe typed internal errors.
- [ ] CI prevents reintroduction of raw string error contracts in governed application code.

## Validation

Run exhaustive error-classification tests, affected service/controller tests, REST/GraphQL/socket error integration tests as available, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if two existing public transports intentionally map the same domain failure to different classifications and no approved canonical mapping exists; record the conflict for `0128` rather than guessing.

## Dependencies

- `0121`/`0122`/`0123` use-case decompositions should be `DONE` so new handlers emit the canonical typed errors.

## Implementation notes

Error `message` is not an identifier. Use a stable code such as `AUTH_INVALID_CREDENTIALS` (exact naming may follow existing project conventions) and keep the message independently changeable.

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
