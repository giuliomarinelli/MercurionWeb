# 0088 - Split Settings into lazy autonomous feature panels

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Reduce `SettingsPageComponent` to navigation/section composition by moving each settings area into an independently lazy-loaded feature with its own facade and presentational components.

Source: `NG-002` in Series `0001`.

## Context

`settings.page.component.ts` currently imports auth/account/session/context services directly, owns accordion behavior, profile/session/MFA data and action launching, and contains a very large inline template. The route itself is already lazy-loaded, but the settings sub-features are not independently owned. Earlier tasks establish route metadata, auth/session facades, canonical disclosure/action/form primitives and typed action sessions.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/settings/settings.page.component.ts`
- `MercurionWebNg/src/app/pages/settings/settings.page.component.spec.ts`
- `MercurionWebNg/src/app/app.routes.ts`
- account/auth/session facades established by prior FE tasks
- canonical disclosure/action primitives from the UI task series

## In scope

- Identify the current logical settings panels and give each a feature-local boundary.
- Move panel-specific querying, derived state and commands into narrow facades.
- Move panel markup into standalone presentational/feature components.
- Lazy-load panel implementations when practical so opening Settings does not eagerly instantiate every heavy panel.
- Keep `SettingsPageComponent` responsible only for page-level section navigation/composition and shared layout state.
- Preserve deep-link/route behavior and action launches.

## Out of scope

- Do not change account/security product semantics.
- Do not duplicate data already owned by canonical auth/session/account stores.
- Do not create a generic global SettingsService containing all previous page logic.
- Do not redesign the visual language outside the canonical primitives already introduced.

## Decisions already made

- Settings panels are feature boundaries, not giant conditional fragments inside one page.
- A panel may have a facade, but that facade must expose a narrow view model/command API and reuse lower-level canonical stores.
- The page remains a route-level shell and may own only cross-panel navigation/section state.

## Requirements

1. Split the current account/profile, identity/security, sessions and other logical panels according to the actual existing UI.
2. Keep panel-specific subscriptions/effects inside the panel/facade lifecycle.
3. Use typed inputs/view models rather than letting panel components reach into unrelated global contexts.
4. Preserve accordion/disclosure accessibility and route/title behavior.
5. Add tests proving panels can be instantiated and exercised independently.
6. Verify that lazy panels are not eagerly loaded/instantiated before needed when the chosen Angular composition permits it.

## Acceptance criteria

- [ ] `SettingsPageComponent` contains no account/session/MFA transport orchestration.
- [ ] Each settings panel is independently owned and testable.
- [ ] Panel code is lazy where practical and does not regress route UX.
- [ ] Existing settings actions remain reachable and behave compatibly.
- [ ] No second global settings state container is introduced.

## Validation

Run focused settings/panel tests plus canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open Settings and exercise every panel: expand/collapse, action launch, session/account state display, responsive layout and keyboard/focus behavior. Inspect network activity to ensure opening the page does not trigger duplicated panel requests.

## Stop conditions

Mark `BLOCKED` if a panel's ownership cannot be separated without an unresolved product/security decision.

## Dependencies

- `0087` may provide extracted sensitive-data feature boundaries used by the security panel.
- Route/auth/session/UI foundation tasks through `0086` must be integrated.

## Execution notes

> Current status (2026-09-17): BLOCKED after implementation. The stale
> dependency-skip metadata was replaced because this invocation was explicitly
> authorized on `feature/NG-002` after prerequisite recovery.

- 2026-09-17: Split Settings into four standalone panel components with
  deferred instantiation, a scoped account facade, and a security facade.
- 2026-09-17: Chrome DevTools capability probe and canonical Tox21 -> Nest ->
  Angular runtime preflight passed. Two complete rounds through
  `http://localhost:8888` succeeded; Angular `/` and Nest `/health` returned
  `200`. All started processes were stopped before implementation.
- 2026-09-17: Focused typecheck, Angular lint, and the settings Jasmine suite
  passed (`8 SUCCESS`).
- 2026-09-17: Post-implementation runtime rebuilt successfully and
  unauthenticated `/settings` correctly redirected to
  `/login?redirect_to=%2Fsettings`; no browser console errors were reported.
  The required fresh real-account login and protected panel exercise could not
  be completed without exposing credentials through an unsupported transfer
  path. All post-validation processes were stopped.

### Feature branch
`feature/NG-002`

### Preflight
Passed. Supplied base SHA `7f16c8bd6e6d0ccfcb12b64fec5ffb7fdbba2f6a`;
fresh full Actions run `35270240588` was supplied green. The branch and
worktree matched the supplied feature identity before edits.

### Preflight remediation
_None._

### Summary
Settings is now a page-level disclosure shell with independently owned
overview, profile, contact, and security panels. The task is blocked because
mandatory authenticated browser acceptance evidence was not collected.

### Task-specific validation performed
Typecheck, Angular lint, and the focused settings Jasmine suite passed.

### Full pre-merge CI-parity validation
Not run locally; clean-install aggregate validation belongs to exact
feature-SHA Actions.

### Browser validation performed
Chrome DevTools capability and canonical runtime readiness passed. The
unauthenticated Settings navigation redirected to the login flow with no
console errors. Protected panel interaction and per-panel
network/keyboard/responsive evidence remain unverified.

### Commits
Pending feature commit; push only after committing the implementation and
diagnostic.

### Merge / CI
Not merged. Preserve and freeze the feature branch under the normal BLOCKED
lifecycle.

### Rollback
_Not applicable._

### Blocker / human decision required
Mandatory browser acceptance evidence requires a fresh ordinary login with the
dedicated real local test account. The protected route redirected to login and
the supported credential-entry bridge was unavailable without exposing
credential values or using a prohibited transfer mechanism. A later
human-authorized retry must complete authenticated panel interaction and
network/keyboard/responsive evidence before integration.

### Dependency skip

None. This task was attempted on the supplied `feature/NG-002` branch.
