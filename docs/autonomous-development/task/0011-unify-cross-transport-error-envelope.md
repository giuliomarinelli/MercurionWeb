# 0011 - Unify cross-transport error envelope

- [x] DONE
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

Implemented a canonical application error envelope shared by REST, GraphQL and Socket.IO. The shared contract now defines `ApplicationErrorEnvelope` with stable `code`, `status`, safe public `message`, optional permitted `details`, and public `correlationId`. REST responses keep transport metadata (`statusCode`, `error`, `timestamp`, `path`, `requestId`) while exposing the canonical fields at the same top-level; `requestId` is the transport alias for the canonical `correlationId`.

GraphQL errors now expose the canonical envelope through `extensions.applicationError` and duplicate the stable `code`, `status`, `correlationId`, and optional `details` in GraphQL-compliant extensions. Socket.IO `sv.pub.err` payloads now extend the same envelope and keep the existing `detail` alias for compatibility.

Angular error utilities now parse canonical REST, GraphQL and Socket.IO envelope shapes, including nested `extensions.applicationError`, instead of depending on transport-specific ad-hoc strings.

### Validation performed

- Verified `feature/SYS-011` was checked out at base SHA `28da04f8b36b2e7980fe3cb5a6b197999eeefde7` before changes.
- Initial unchanged preflight: `npm ci`; `npm run ci:check` passed.
- Targeted validation: `npm run build --workspace @mercurion/rest-contracts`; `npm run build --workspace @mercurion/socket-contracts`; Nest targeted Jest specs for `application-error-envelope`, `http-exception-filter`, `socket-contract-runtime`, and `ws.guard`; Angular `application-error.util` spec passed. The targeted Angular Karma wrapper did not terminate on its own after reporting `TOTAL: 303 SUCCESS`, so it was stopped after success output was captured.
- Full aggregate before metadata update: `npm run ci:check` passed.

### Browser validation performed

Started task-scoped Tox21, Nest and Angular runtimes, validated the app through the canonical nginx origin `http://localhost:8888`, and stopped all task-owned runtimes before clean-install validation.

Using Chrome DevTools MCP on `http://localhost:8888/welcome`, triggered a safe development-only malformed GraphQL request to `/api/graphql` with `x-correlation-id: browser-sys-011`. The network response was HTTP 200 with GraphQL error extensions carrying canonical fields: `code`, `status`, `correlationId`, and `applicationError` containing the same canonical envelope. The returned correlation ID propagated the safe public seed as `browser-sys-011-...`. Chrome console inspection reported no error messages after Angular parsed the response.

### Changed files

- `packages/rest-contracts/src/application-error-envelope.ts`
- `packages/rest-contracts/src/index.ts`
- `packages/socket-contracts/src/index.ts`
- `packages/socket-contracts/src/contract-type.assertions.ts`
- `MercurionWebNode/src/Models/error-res.dto.ts`
- `MercurionWebNode/src/exception-handling/application-error-envelope.ts`
- `MercurionWebNode/src/exception-handling/application-error-envelope.spec.ts`
- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/exception-handling/http-exception-filter.spec.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- `MercurionWebNode/src/contracts/socket-contract-runtime.spec.ts`
- `MercurionWebNg/src/app/utils/application-error.util.ts`
- `MercurionWebNg/src/app/utils/application-error.util.spec.ts`

### Blocker / human decision required

None.
