# 0009 - Create typed Socket.IO event registry

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace duplicated Socket.IO event-name strings and ad-hoc payload/ack/error shapes with one typed, versioned registry consumed by both Angular and Nest.

Source: `SYS-009` in Series `0001`.

## Context

The audited client emits string literals such as `auth_refresh` and `so.pub.session_init`; Nest gateway/guards use strings such as `so.pub.public_test`, `sv.pub.public_test`, `so.pub.private_test`, `sv.pub.private_test`, `so.pub.session_init`, and `sv.pub.err`. Payloads and acknowledgements are currently inferred locally rather than derived from one contract.

## Relevant files and modules

- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- `MercurionWebNode/src/app_modules/redis/services/pub-sub.service.ts`
- any additional `.emit`, `.on`, `@SubscribeMessage` or server broadcast call sites discovered during inventory

## In scope

- Inventory client-to-server, server-to-client, ack and error events.
- Establish one canonical event contract/registry.
- Provide generated/shared TypeScript event names and payload/ack types to Angular and Nest.
- Replace string literals at event producer/consumer boundaries.
- Add static/automated checks preventing undeclared event names.
- Introduce explicit contract version metadata or a versioning mechanism suitable for later compatibility evolution.

## Out of scope

- Redesigning session semantics; task `0010` owns that protocol.
- Changing Socket.IO transport topology or Redis adapter architecture.
- Adding new product events unrelated to existing behaviour.

## Decisions already made

- Event names, payloads, acknowledgement shapes and transport error shapes derive from one typed registry.
- Existing event wire names remain stable unless the task can migrate all internal producers/consumers atomically with no external compatibility impact.
- The registry must be usable at compile time by both Angular and Nest.

## Requirements

1. Enumerate every Socket.IO event emitted/listened/subscribed/broadcast by both projects.
2. Record direction, payload type, acknowledgement type and error semantics for each event.
3. Introduce the canonical typed registry without maintaining a second handwritten mirror.
4. Replace boundary string literals with registry-derived constants/types.
5. Type the wrappers used by Angular and Nest so an incompatible payload/ack fails compilation where practical.
6. Add an automated inventory/policy check for event literals outside the canonical contract layer.
7. Add contract tests for representative public, private, session-init and error events.

## Acceptance criteria

- [ ] Every current Socket.IO event belongs to the canonical registry.
- [ ] Angular and Nest consume the same contract-derived event identifiers and payload/ack types.
- [ ] `so.pub.session_init`, public/private test events, current auth/session events and `sv.pub.err` are covered.
- [ ] Introducing an undeclared event or incompatible typed payload is caught by static/automated validation.
- [ ] Existing Socket.IO tests/builds pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

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

Run the new Socket.IO contract/policy check.

## Browser validation

Using the canonical local runtime and Chrome DevTools MCP at `http://localhost:8888`, exercise one existing flow that opens the Socket.IO connection. Verify there are no unexpected console errors, the connection goes through the nginx `/socket.io/` edge, and the expected session/public event exchange succeeds where test credentials/state permit it.

If authentication/test data needed for the declared runtime verification is unavailable, mark the runtime portion `BLOCKED` rather than using production credentials.

## Stop conditions

Block if the repository has an externally consumed Socket.IO event whose compatibility/version contract is undocumented and the implementation would require renaming or changing its wire payload.

Also block if choosing how to physically share/generate the registry between the two independently built applications requires an unresolved repository packaging decision not already established by task `0001` or project tooling.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` only if it establishes a reusable cross-project contract package/generation mechanism; otherwise this task may use an equivalent approved canonical-codegen mechanism without coupling REST and Socket contracts semantically.

## Implementation notes

Keep direction explicit. A client-to-server event and server-to-client response should not become ambiguous merely because they share a conceptual feature name.

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
