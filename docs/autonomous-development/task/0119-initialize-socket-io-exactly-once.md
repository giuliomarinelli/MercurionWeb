# 0119 - Initialize Socket.IO exactly once

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Ensure `SocketIoModule` and its gateway/provider lifecycle are initialized exactly once per Nest application context, with tests that prevent duplicate imports or duplicate side effects.

Source: `BE-005` in Series `0001`.

## Context

`MercurionWebNode/src/app.module.ts` currently lists `SocketIoModule` twice in the root `imports` array. Even when Nest deduplicates some module metadata internally, duplicate registration is an architectural error and makes gateway/adapter lifecycle reasoning ambiguous. Provider ownership is normalized by `0118`; this task gives the realtime module one explicit composition-root entry and verifies runtime lifecycle.

## Relevant files and modules

- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.module.ts`
- Socket.IO gateway/adapter/providers and their specs
- application bootstrap/module-compilation tests

## In scope

- Remove duplicate `SocketIoModule` imports.
- Establish one intentional owner/composition-root path for Socket.IO initialization.
- Verify gateway/provider construction and connection/listener registration occur once per app context.
- Ensure imports by other modules, if any, consume public realtime ports rather than reinitializing the gateway module.
- Add regression tests/static checks for duplicate root-module import.

## Out of scope

- Do not redesign the WebSocket protocol or auth semantics.
- Do not change Redis pub/sub capability policy; `BE-024` owns readiness for keyspace notifications.
- Do not implement shutdown hooks yet; `BE-021` owns coordinated shutdown.

## Decisions already made

- Socket.IO infrastructure has one production initialization point.
- Domains may depend on public realtime capabilities/events but cannot import infrastructure in a way that creates a second gateway lifecycle.

## Requirements

1. Remove the duplicate root import and verify the final module graph contains one Socket.IO initialization path.
2. Add an observable/test hook or module test proving the gateway/provider is instantiated once.
3. Verify Redis adapter/pub-sub bindings and event listeners are not registered twice.
4. Ensure reconnect/session tests still pass after deduplication.
5. Extend the architecture/configuration test to fail on duplicate production module entries where applicable.

## Acceptance criteria

- [ ] `SocketIoModule` appears exactly once in the production composition graph as an initializing module.
- [ ] Socket.IO gateway and infrastructure providers have one lifecycle per app context.
- [ ] No duplicate event/listener/Redis adapter registration is observed in tests.
- [ ] Existing WebSocket behaviour remains compatible.

## Validation

Run Socket.IO module/gateway/guard tests, Nest app compilation/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable; WebSocket compatibility is covered through transport-level E2E tests.

## Stop conditions

Mark `BLOCKED` if current runtime behaviour depends on duplicate module initialization; diagnose that dependency rather than preserving duplicate registration.

## Dependencies

- `0118-give-every-core-nest-provider-a-single-owner.md` must be `DONE`.

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
