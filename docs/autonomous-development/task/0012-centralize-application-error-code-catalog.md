# 0012 - Centralize application error code catalog

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace string-based and independently mapped application errors with one exhaustive, typed error-code catalog consumed by producers and Angular/Nest transport handlers.

Source: `SYS-012` in Series `0001`.

## Context

Error semantics are currently encoded through string messages such as `Forbidden::missing permissions`, `InvalidSession`, `MfaTemporarilyLocked`, and many `RpcException` messages. `HttpExceptionFilter`, GraphQL `errorFormatter`, guards/services, and Angular consumers interpret subsets independently. This makes renames and omissions runtime failures rather than compile-time contract failures.

## Relevant files and modules

- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/app_modules/auth/services/scope.service.ts`
- `MercurionWebNode/src/app_modules/auth/guards/global.guard.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- services/controllers throwing `RpcException` or domain errors
- `MercurionWebNg/src/app/interceptors/`
- Angular components/services comparing `message` strings
- canonical contract mechanism

## In scope

- Inventory stable application/domain error meanings currently encoded as strings.
- Define one typed catalog with stable machine codes and transport/status/public-message policy metadata where appropriate.
- Replace producer and consumer string comparisons with catalog-derived codes/helpers.
- Make mapping switches exhaustive at compile time.
- Add automated policy preventing new unmanaged application error literals.

## Out of scope

- Cross-transport envelope shape; task `0011` owns serialization.
- User-facing copy redesign beyond preserving current safe meaning.
- Logging-only diagnostic text that is not part of program control flow.

## Decisions already made

- Application logic must branch on stable codes, not human-readable messages.
- The catalog is shared/canonical and exhaustive for contract-visible errors.
- Public message text may evolve independently from the stable code.

## Requirements

1. Inventory error literals used for control flow or transport mapping.
2. Allocate stable semantic codes without leaking internal implementation details.
3. Associate current HTTP/application status and safe public-message policy with each code where needed.
4. Update throws/factories to carry codes explicitly.
5. Update REST, GraphQL, WebSocket and Angular consumers to match on codes.
6. Make mapping functions exhaustive using TypeScript type checking.
7. Add a static/test guard against new unmanaged string-based error branching.

## Acceptance criteria

- [ ] One canonical catalog contains every contract-visible application error code.
- [ ] Producers and consumers no longer depend on strings such as `Forbidden::missing permissions` for application control flow.
- [ ] Adding a new catalog code causes relevant exhaustive mappings to require handling at compile/test time.
- [ ] Existing status/public-message behaviour is preserved unless explicitly documented.
- [ ] Builds and targeted error/auth tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

Run Nest and Angular builds/tests plus the new error-catalog policy/exhaustiveness checks.

## Browser validation

Not required except for a safe representative Angular error flow if task `0011` is already complete; if performed, use only `http://localhost:8888`.

## Stop conditions

Block if two existing string errors that appear identical semantically are known to require distinct externally stable behaviours and that distinction is undocumented. Preserve them separately until a human decides consolidation.

## Dependencies

- None.
- Advisory: coordinate with `0011-unify-cross-transport-error-envelope.md`; do not create two permanent error vocabularies.

## Implementation notes

Prefer codes that describe domain meaning rather than transport, e.g. avoid baking `HTTP_403` into a code whose status mapping could vary by transport.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable / not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
