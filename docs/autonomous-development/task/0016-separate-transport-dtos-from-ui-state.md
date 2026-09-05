# 0016 - Separate transport DTOs from UI state

- [ ] DONE
- [ ] BLOCKED
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
factories. A direct human-authorized recovery supplied an authenticated local
test state and resumed the preserved branch. The task is now `CI_PENDING`:
its local implementation and browser validation are complete, while the exact
feature-SHA and post-merge GitHub Actions gates are still required before the
`DONE` outcome can be recorded.

### Validation performed

- Unchanged task-start preflight: `npm ci` and `npm run ci:check` passed.
- Angular build: `npm run build --workspace mercurion_web_ng` passed.
- Angular CI tests: `npm run test:ci --workspace mercurion_web_ng` passed
  (287 tests).
- Nest build: `npm run build --workspace mercurion_web_node` passed.
- The final clean-install CI-parity preflight remains pending until the
  task-owned runtime processes are stopped.

### Browser validation performed

The human completed local test authentication in the browser. With the
canonical nginx edge responding `200` for both the frontend and `/health`,
`http://localhost:8888/help` rendered two open test tickets. Opening
`MTCK-000000082` loaded its detail and existing message; closing the detail
returned cleanly to the Help ticket list. No browser console errors were
reported during the interaction. This exercises the UI state now produced by
the explicit ticket and ticket-message view models without mutating the
transport DTOs.

### Changed files

- `MercurionWebNg/src/app/Models/graphql/help.models.ts`
- `MercurionWebNg/src/app/Models/graphql/help.view-models.ts`
- `MercurionWebNg/src/app/Models/graphql/help.models.spec.ts`
- `MercurionWebNg/src/app/services/graphql/help.service.ts`
- `MercurionWebNg/src/app/pages/help/help.page.component.ts`
- `MercurionWebNg/src/app/components/action-components/ticket-detail/ticket-detail.component.ts`

### Recovery notes

- Reconciled the preserved branch with current `develop` through merge commit
  `f71517e9`; the Help/Ticket conflict retains the current overlay,
  invalidation, and session semantics while preserving the SYS-016 adapters.
- Corrected the Nest development runtime paths for the current TypeScript
  output layout (`dist/src/**`) and documented root-workspace launch commands.
  The fixes are verified by a successful Nest watch bootstrap and bootstrap-file
  copy; they are intentionally separate from local `env.vars.ts` and VS Code
  launch configuration changes.
