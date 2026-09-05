# 0088 - Split Settings into lazy autonomous feature panels

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
Not attempted. The required route/auth/session/UI foundation through task 0086
is terminally non-`DONE`. The reference to task 0087 is advisory and was not
treated as a hard prerequisite.

### Task-specific validation performed
Not applicable; no feature branch or implementation worker was created.

### Full pre-merge CI-parity validation
Not applicable; dependency-skip metadata only.

### Browser validation performed
Not applicable; the task was not attempted.

### Commits
Pending metadata commit on `develop`.

### Merge / CI
No feature branch or merge. Exact-SHA CI is required for the metadata commit.

### Rollback
_Not applicable._

### Blocker / human decision required
The required foundation includes FE-004 (BLOCKED because mandatory
authenticated browser validation was unavailable), FE-030 (BLOCKED because
worker filesystem-write capability was unavailable), and UI-018 (BLOCKED
because the local Nest runtime was unavailable for mandatory browser
validation). Their dependent foundation tasks are `SKIPPED_DEPENDENCY`.
