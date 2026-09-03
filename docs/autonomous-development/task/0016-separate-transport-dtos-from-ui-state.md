# 0016 - Separate transport DTOs from UI state

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make transport DTOs immutable, serialization-safe data structures and move UI-only state such as signals, collapse state, animation triggers and derived presentation fields into explicit Angular view models.

Source: `SYS-016` in Series `0001`.

## Context

The audit found API models mixed with UI state. A concrete example is `MercurionWebNg/src/app/Models/graphql/help.models.ts`, where `Ticket` and `TicketMessage` include `WritableSignal<boolean>` fields such as `triggerDisappear` and `collapse`, while API variants are expressed as `Omit` types derived from those UI-rich interfaces. This reverses the desired dependency: transport data should be canonical and view state should extend/adapt it locally.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/graphql/help.models.ts`
- `MercurionWebNg/src/app/Models/graphql/`
- Angular components/services that add presentation state to API responses
- generated GraphQL/REST contract types from earlier tasks

## In scope

- Inventory transport/API types containing Angular signals, animation state, collapse flags or presentation-only derived fields.
- Define clean immutable transport DTO types sourced from the canonical REST/GraphQL contracts.
- Define separate Angular view-model types/adapters for UI state.
- Update affected services/components so transport objects are not mutated with UI-only fields.
- Add tests for DTO-to-view-model mapping and serialization boundaries.

## Out of scope

- Redesigning component UX/visual behaviour.
- Removing legitimate domain fields merely because they are consumed by UI.
- Backend DTO changes where the current backend already exposes pure transport data.

## Decisions already made

- Transport DTOs contain only serializable transport/domain data.
- Angular framework types such as `WritableSignal` never cross or define the API boundary.
- View models may compose/extend transport data locally but do not become the canonical contract.

## Requirements

1. Identify every client contract type with UI-only fields or Angular runtime types.
2. Make transport types derive from generated/shared contract definitions where available.
3. Introduce explicit view models/adapters for presentation state.
4. Remove `Omit` patterns that define API shapes by subtracting UI state from a richer view model when a direct transport type can be used instead.
5. Ensure network serialization/deserialization never depends on signals/classes with UI state.
6. Add tests proving transport objects remain plain serializable data and view models initialize UI state deterministically.

## Acceptance criteria

- [ ] No transport DTO contains `WritableSignal`, animation triggers, collapse flags or other UI-only state.
- [ ] `Ticket`/`TicketMessage` and any other audited examples use a clean transport-to-view-model direction.
- [ ] API services expose transport/domain data or explicit mapped view models without mutating the transport contract.
- [ ] Relevant Angular tests and build pass.
- [ ] Existing UI behaviour remains compatible.

## Validation

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

Run contract/codegen checks introduced by earlier tasks.

## Browser validation

Using the canonical local runtime and Chrome DevTools MCP, open affected routes through `http://localhost:8888` (for example Help when changed) and verify existing collapse/animation interactions still behave correctly and no uncaught console errors appear. Use development/test state only.

## Stop conditions

Block if a field classified by the audit as UI-only is actually persisted or transmitted as part of a documented external API contract. Record the evidence and leave that field in the transport model until the contract decision is clarified.

## Dependencies

- `0002-generate-angular-graphql-documents-and-types.md` and/or `0001-canonicalize-rest-contract-ownership.md` should be available for affected transport types.

## Implementation notes

Prefer pure mapping functions/factories from transport DTO to view model. Keep mutable UI state close to the component/facade that owns its lifecycle.

## Execution notes

### Summary

Separated Help GraphQL transport aliases from Angular view state. Help services now
return the generated transport shapes without adding signals; Help list/detail
components explicitly adapt tickets and messages through pure view-model
factories. The implementation is preserved on `feature/SYS-016`, but the task
is blocked because the canonical runtime did not provide an authenticated/test
Help state for the required browser interaction validation.

### Validation performed

- Unchanged task-start preflight: `npm ci` and `npm run ci:check` passed.
- Angular build: `npm run build --workspace mercurion_web_ng` passed.
- Angular CI tests: `npm run test:ci --workspace mercurion_web_ng` passed
  (174 tests).
- Final pre-merge preflight after stopping task-owned runtimes: `npm ci` and
  `npm run ci:check` passed.

### Browser validation performed

Blocked after navigating to `http://localhost:8888/help`: the development
runtime redirected to `http://localhost:8888/login?redirect_to=%2Fhelp`
without authenticated/test data, and the browser console reported an
uncaught WebSocket handshake failure for
`ws://localhost:8888/socket.io/?EIO=4&transport=websocket` (HTTP 502).
Therefore Help collapse/animation interactions could not be exercised safely.
Nest, Angular, and Tox21 processes started for this attempt were stopped before
the final clean install.

### Changed files

- `MercurionWebNg/src/app/Models/graphql/help.models.ts`
- `MercurionWebNg/src/app/Models/graphql/help.view-models.ts`
- `MercurionWebNg/src/app/Models/graphql/help.models.spec.ts`
- `MercurionWebNg/src/app/services/graphql/help.service.ts`
- `MercurionWebNg/src/app/pages/help/help.page.component.ts`
- `MercurionWebNg/src/app/components/action-components/ticket-detail/ticket-detail.component.ts`

### Blocker / human decision required

Provide safe development/test authentication and a healthy canonical backend
WebSocket/API runtime so the required Help-route browser validation can be
completed. No production credentials or data were used.
