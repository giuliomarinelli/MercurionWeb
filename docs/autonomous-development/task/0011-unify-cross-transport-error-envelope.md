# 0011 - Unify cross-transport error envelope

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Define one typed application-error envelope and make REST, GraphQL and WebSocket boundaries serialize equivalent errors with a stable code, status, safe public message, permitted details and correlation identifier.

Source: `SYS-011` in Series `0001`.

## Context

REST currently serializes `HttpErrorRes` with `statusCode`, `error`, optional `message`, `timestamp`, `path`, and `requestId` through `HttpExceptionFilter`. GraphQL has a separate `errorFormatter` using `message`, `path`, and `extensions.code`. WebSocket paths emit ad-hoc objects such as `{ detail: ... }` through `sv.pub.err`. These shapes do not provide one consistent application-level contract.

## Relevant files and modules

- `MercurionWebNode/src/Models/error-res.dto.ts`
- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNg/src/app/Models/http-error-body.dto.ts`
- Angular error/interceptor/GraphQL/Socket consumers
- typed event/error contracts introduced by tasks `0009` and `0012`

## In scope

- Define a canonical application error envelope independent from transport-specific wrappers.
- Map that envelope consistently into REST, GraphQL and Socket.IO wire representations.
- Carry a stable correlation ID across all three transports where a request/event context exists.
- Preserve safe production error-message redaction.
- Type Angular consumers against the canonical envelope.
- Add cross-transport serialization tests for representative error categories.

## Out of scope

- Defining the full error-code vocabulary; task `0012` owns the catalog.
- Changing product-level error policy/authorization decisions.
- Exposing stack traces or private internal details.

## Decisions already made

- Canonical fields include: stable application code, status, public message, allowed details, and correlation ID.
- Transport-specific metadata may wrap/augment the canonical envelope, but may not redefine its meaning.
- Production sanitization remains mandatory for internal failures.

## Requirements

1. Define the canonical TypeScript error contract in the shared contract mechanism.
2. Decide and document which existing REST metadata remains transport metadata (`timestamp`, `path`, etc.) versus canonical application fields.
3. Adapt `HttpExceptionFilter` to serialize from the canonical error representation.
4. Adapt Mercurius `errorFormatter` to expose the same code/status/message/details/correlation semantics through GraphQL-compliant error fields/extensions.
5. Adapt Socket.IO error events/acks to carry the same canonical envelope.
6. Ensure a correlation identifier is generated or propagated consistently and is safe to expose publicly.
7. Update Angular error consumers and type guards to parse the canonical shape rather than transport-specific ad-hoc strings where applicable.
8. Add tests demonstrating the same logical error maps consistently across REST, GraphQL and WebSocket.

## Acceptance criteria

- [ ] REST, GraphQL and WebSocket errors expose equivalent canonical application-error semantics.
- [ ] Every canonical error contains a stable code and correlation ID.
- [ ] Public message/details obey the same production redaction policy across transports.
- [ ] Angular has typed parsing/handling for the canonical error representation.
- [ ] Representative auth, forbidden, validation, not-found, rate-limit and internal errors are covered by cross-transport tests where those transports support them.
- [ ] Builds/tests pass.
- [ ] Existing security behaviour not targeted by this task remains compatible.

## Validation

Run targeted error/filter/GraphQL/socket tests and full builds for Angular and Nest.

From `MercurionWebNode`:

```text
npm run build
npm test -- --runInBand
```

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`, trigger a safe development-only HTTP or GraphQL error that needs no production credentials. Confirm the network response carries the expected canonical public fields and correlation identifier and that no unexpected console/runtime error is introduced by Angular parsing.

## Stop conditions

Block if the public exposure policy for `details` or correlation identifiers requires a security/product decision not inferable from current redaction rules. Preserve current secrecy and document the required decision.

## Dependencies

- Hard: `0009-create-typed-socket-io-event-registry.md`.
- Advisory: `0012-centralize-application-error-code-catalog.md` may be implemented immediately afterward; until then, this task must not create a competing permanent code catalog.

## Implementation notes

Keep HTTP status and application code conceptually distinct. GraphQL may return HTTP 200 for some application states; the canonical `status` must therefore retain the intended application/transport status semantics explicitly.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
