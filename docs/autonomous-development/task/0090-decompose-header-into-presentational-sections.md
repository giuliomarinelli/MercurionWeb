# 0090 - Decompose the application header into presentational sections

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Split the monolithic application header into dedicated presentational components for navigation, account menu, responsive menu and session/status information, driven by one narrow header facade.

Source: `NG-004` in Series `0001`.

## Context

`MercurionWebNg/src/app/components/common/header/header.component.ts` is a large application-shell component and currently injects application services directly, including theme/design/session-related dependencies. Earlier FE tasks establish canonical theme/auth/session state and route metadata; UI tasks establish canonical buttons/links/disclosures. This task must consume those sources instead of keeping shell logic embedded in the header.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/header/header.component.ts`
- `MercurionWebNg/src/app/components/common/header/header.component.spec.ts`
- `MercurionWebNg/src/app/app.component.ts`
- canonical route/navigation manifest from FE tasks
- canonical auth/session/theme facades/stores
- canonical UI navigation/button/disclosure primitives

## In scope

- Extract primary navigation, account menu, responsive/mobile menu and session indicator into standalone presentational components.
- Introduce a header facade/view model that derives exactly the state the header needs from existing canonical stores.
- Keep the root `HeaderComponent` responsible only for composition and shell-level event wiring.
- Centralize responsive-menu open/close ownership and focus restoration.
- Add focused tests for each presentational component and facade state.

## Out of scope

- Do not create new auth/session/theme sources of truth.
- Do not change route access policy or product navigation semantics.
- Do not redesign header visuals beyond using the canonical design-system primitives.
- Do not move unrelated app-shell responsibilities back into `AppComponent`.

## Decisions already made

- Presentational header children receive typed inputs and emit semantic outputs; they do not inject auth/session/router services for data ownership.
- Navigation entries derive from the canonical typed route/navigation metadata where applicable.
- Responsive menu state has one owner.

## Requirements

1. Define a typed header view model containing user/session/navigation/theme state actually rendered by the shell.
2. Keep account/session actions as facade commands rather than child-component service calls.
3. Preserve keyboard navigation, accessible names, focus visibility and mobile-menu focus restore.
4. Ensure route changes close transient menus deterministically.
5. Prevent duplicate subscriptions/listeners after repeated responsive menu open/close cycles.

## Acceptance criteria

- [ ] Header, account menu, navigation, responsive menu and session indicator are distinct components.
- [ ] Root header is a thin composition shell.
- [ ] Presentational children do not own auth/session/theme persistence or routing policy.
- [ ] Responsive interactions and account actions remain compatible.
- [ ] Lifecycle tests detect no listener/subscription leaks.

## Validation

Run focused header/facade/component tests followed by canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, validate logged-out/logged-in header states where local data permits, desktop/mobile navigation, account menu, responsive menu, route-change closure, keyboard navigation and focus restoration with no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a currently rendered header state has no authoritative source after the prior FE migrations and resolving it would require a product/access-policy decision.

## Dependencies

- Canonical route/navigation, auth/session and theme tasks must be `DONE`.
- Canonical UI navigation/control primitives must be available.

## Execution notes

### Feature branch
`feature/NG-004`

### Preflight
Confirmed clean `feature/NG-004` at base
`ffd84e1ffae8375a0e21dc2fd870209bbf37d3eb`, with exact-SHA GitHub Actions
run `34596438727` (`CI`, success). No task-owned workspace processes were
running before validation.

### Preflight remediation
None. The canonical runtime capability preflight succeeded: Tox21, Nest and
Angular were started in the required order, nginx returned two consecutive
complete readiness rounds, and the real local test account completed an
ordinary login through `/login` with protected dashboard state observed.

### Summary
Added a typed `HeaderViewModel`, a scoped `HeaderFacade` that owns route,
session, theme and account-state assembly, and four standalone presentational
header sections for navigation, account-menu semantics, responsive-menu
semantics and the session indicator. The root header now composes the
navigation and session sections while retaining existing shell event wiring
and deterministic timer ownership. Facade subscriptions use
`takeUntilDestroyed`; children do not inject routing or persistence services.

### Task-specific validation performed
* `npx tsc --noEmit -p MercurionWebNg/tsconfig.app.json` — passed.
* Focused header lint — passed with only pre-existing `any` warnings in the
  header spec before the change.
* `npm run test:ci --workspace mercurion_web_ng` — 382 specs passed.
* `npm run build --workspace mercurion_web_ng` — passed; existing bundle and
  CommonJS warnings only.
* `npm run ci:angular:nested-subscriptions` — passed.
* `npm run ci:angular:onpush-components` — passed.

### Full pre-merge CI-parity validation
Not run locally by policy. GitHub Actions is required for clean-install and
aggregate CI parity on the pushed feature SHA.

### Browser validation performed
Through `http://localhost:8888`: logged-out login header observed, fresh
ordinary test-account login accepted by the server and protected dashboard
observed, desktop account menu opened and closed with accessible labels,
mobile responsive menu opened with focus remaining on the trigger, mobile
account menu opened with close control, and no browser console errors were
reported. Runtime processes were stopped after evidence capture.

### Commits
Pending feature commit.

### Merge / CI
Feature branch must be pushed only after the task commit. Exact-SHA feature
CI remains required before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
