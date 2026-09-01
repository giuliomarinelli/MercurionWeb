# 0043 - Reduce AppComponent to a thin application shell

- [ ] DONE
- [ ] BLOCKED

## Objective

Remove auth/session/route orchestration, storage reconstruction, redirect policy and timer-driven state machines from `AppComponent` so the root component only composes the application shell, outlet and presentation-facing facades.

Source: `FE-021` in Series `0001`.

## Context

`AppComponent` currently performs session synchronization, login-cookie/storage reconstruction, redirect parsing/sanitization, public/protected route classification, navigation suppression, route-driven layout state, provided-email prefetch, scroll-root registration and shell rendering. Much of this logic lives in the constructor and duplicates responsibilities assigned to the canonical auth store, redirect store and route-policy metadata established by earlier tasks.

## Relevant files and modules

- `MercurionWebNg/src/app/app.component.ts`
- auth/session store and coordinator from `0026`–`0039`
- route policy from `0041`
- redirect store from `0033`
- `MercurionWebNg/src/app/services/path.service.ts`
- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- shell/header/sidenav/footer components

## In scope

- Move auth/session bootstrap and synchronization to the canonical auth/session boundary.
- Move route policy and programmatic redirect decisions to a dedicated route/navigation coordinator or route-aware facade.
- Keep shell/layout-derived state in a small facade rather than inline route string checks.
- Remove direct browser auth persistence/cookie reconstruction from `AppComponent`.
- Keep root-level composition, scroll-host handoff and purely presentational shell wiring where that ownership is appropriate.
- Add focused unit tests for extracted coordinators and a thin root-component test.

## Out of scope

- Final split of the generic `AppContextService`; task `0053` owns that cleanup.
- Full typed route manifest; task `0057` owns path/title/navigation centralization.
- Header/sidenav visual redesign.
- Changing auth or redirect product semantics.

## Decisions already made

- `AppComponent` is a composition root/view shell, not the owner of authentication or navigation state machines.
- Route access/layout decisions come from route metadata.
- Session truth comes from the canonical auth/session services.
- Redirect intent uses the canonical redirect store.
- Extracted orchestration must remain testable without constructing the entire application shell.

## Requirements

1. Inventory every responsibility currently in the constructor, lifecycle hooks and route subscription.
2. Assign each responsibility to an existing canonical owner or a narrowly scoped new facade/coordinator.
3. Remove direct `localStorage`, login-cookie parsing and session-state repair from the root component.
4. Remove route access classification and authentication redirect policy from the root component.
5. Make shell visibility/layout derive from route metadata/facade state.
6. Preserve scroll-host registration only until task `0053` moves it to its final owner; do not expand `AppContextService` further.
7. Remove provided-email cache warming from the root when `0042` makes cache lifecycle session-owned.
8. Keep constructor/lifecycle code limited to root view wiring that genuinely requires the component instance.
9. Add tests proving root creation does not itself implement or duplicate auth/route rules.

## Acceptance criteria

- [ ] `AppComponent` contains no auth storage/cookie reconstruction or session state machine.
- [ ] It contains no duplicated public/protected/logged-out-only route policy.
- [ ] Auth/session/navigation orchestration is delegated to focused testable services/facades.
- [ ] Root template behaviour remains compatible across welcome/status/authenticated shells.
- [ ] Root component is materially smaller and its constructor is composition-only.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused unit tests for the extracted route/session coordinators and `AppComponent`, then the canonical CI-parity gate. Verify a source review of `app.component.ts` finds no direct auth persistence reads or policy path lists.

## Browser validation

Through `http://localhost:8888`, smoke-test welcome, login, one protected route, logout/session transition, 403/404 and normal shell scrolling. Confirm no redirect loops, duplicate navigation, duplicate session synchronization or console errors.

## Stop conditions

Mark `BLOCKED` if an existing root-component behaviour has no clear owner because its product semantics conflict with the route/session contracts established by prior tasks. Record the conflict instead of creating another root-level special case.

## Dependencies

- `0041-derive-route-access-and-layout-policy-from-route-data.md`
- `0042-scope-provided-email-cache-to-the-active-session.md`
- `0033-centralize-safe-post-auth-redirect-state.md`
- `0038-create-one-atomic-client-session-entity.md`

## Implementation notes

A dedicated `AppShellFacade` and/or navigation coordinator is acceptable, but do not merely move the same 170-line constructor into a new god service. Split by ownership and test each policy independently.

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
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._