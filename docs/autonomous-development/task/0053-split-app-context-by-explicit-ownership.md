# 0053 - Split AppContextService by explicit ownership

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove `AppContextService` as a generic global container by assigning scroll-host state, shell/layout state and domain refresh/events to separate focused owners with minimal APIs.

Source: `FE-031` in Series `0001`.

## Context

`AppContextService` currently owns unrelated concerns: generic added ticks, scroll ticks, global scroll-root references, dashboard refetch ticks, header height, off-canvas close triggers and smooth-scroll implementation. Earlier tasks remove anonymous refetch ticks and thin the root component; this task completes the ownership split instead of leaving a smaller but still generic global context.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- `MercurionWebNg/src/app/app.component.ts`
- consumers of `globalScollRootRef`, `headerHeight`, scroll/refetch/off-canvas ticks
- domain invalidation infrastructure from `0047`
- shell/navigation facade from `0043`
- UI components using global smooth-scroll/root state

## In scope

- Inventory every remaining `AppContextService` signal/method and its consumers.
- Move scroll root, scroll helpers and viewport/scroll coordination to a dedicated scroll owner.
- Move shell-specific dimensions/off-canvas state to a shell/layout owner if still required.
- Route domain refresh/change signals through the typed invalidation mechanism from `0047`.
- Remove obsolete generic ticks and `AppContextService` once no mixed ownership remains.
- Add focused tests for each replacement service.

## Out of scope

- Full viewport/overlay design-system work.
- Reworking action overlay state.
- Route manifest work.
- General application event bus.

## Decisions already made

- Scroll infrastructure, domain refresh and shell state have separate owners.
- No replacement service may become a generic dumping ground named “global/app context”.
- Domain changes use semantic events/invalidation, not numeric ticks.
- DOM `ElementRef` ownership remains as close as possible to the shell/view that creates the element.

## Requirements

1. Produce a consumer map for every property/method of `AppContextService` at execution time.
2. Remove fields already made obsolete by prior tasks rather than relocating them.
3. Create narrowly scoped scroll/root service or directive/facade for scroll host registration and smooth-scroll operations.
4. Move header/shell geometry/off-canvas coordination only to a shell-specific owner where still necessary.
5. Ensure no domain data refresh depends on the scroll/shell services.
6. Refactor all consumers and remove `AppContextService` when empty; a temporary compatibility adapter may exist only within the task and must not be the final state.
7. Add tests proving owners can be used independently without constructing unrelated global state.

## Acceptance criteria

- [x] `AppContextService` no longer exists as a heterogeneous global container.
- [x] Scroll host/helpers have a dedicated owner.
- [x] Shell/layout state has a dedicated owner or remains local to the shell.
- [x] Domain refresh uses typed invalidation from `0047`.
- [x] No generic added/refetch tick survives in replacement services.
- [x] Angular tests/build and canonical CI gates pass.

## Validation

Run focused replacement-service tests, repository search for `AppContextService`/removed tick APIs, then the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, verify shell scrolling/smooth-to-top, header/sidenav behaviour, route transitions and one domain refresh flow still work without cross-coupling or console errors.

## Stop conditions

Mark `BLOCKED` if a remaining field's ownership cannot be established and moving it would create another generic service. Record the consumers and required ownership decision.

## Dependencies

- `0043-reduce-appcomponent-to-a-thin-application-shell.md`
- `0047-replace-anonymous-refetch-ticks-with-typed-domain-invalidation.md`
- `0050-own-browser-listeners-timers-and-animation-frames-deterministically.md`

## Implementation notes

Deleting a god service is preferable to renaming it. Focused owners should expose semantic APIs and keep DOM/runtime dependencies out of unrelated domain state.

## Execution notes

### Feature branch
`feature/FE-031`, based on `930fc655ced00f0e520895214a330c9facd69658`.

### Preflight
Passed unchanged baseline preflight. The branch was clean and exactly at the
supplied base SHA. The exact base SHA has a successful GitHub Actions CI run
(`34548777210`). No task-owned Angular, Nest, Tox21, or test-watcher process
was active before startup.

The required browser capability preflight passed with the canonical runtime
startup order and separate attached sessions:

1. `../MercurionTox21/.venv/Scripts/python.exe -m main` from
   `../MercurionTox21` with `PYTHONUTF8=1`;
2. `APP_ENV=development LOCAL_DUMMY_AUTH=false npm run start:dev
   --workspace mercurion_web_node`;
3. `MercurionWebNg` `npm run start:dev`.

All three remained alive. After the startup barrier, two consecutive complete
readiness rounds returned `200` from `http://localhost:8888/health` and
`http://localhost:8888/`. The dedicated persistent Chrome profile completed a
fresh ordinary login at `http://localhost:8888/login` with the authorized local
test account and proved protected dashboard state (`Benvenuto Test.` and
protected dashboard data). All preflight runtime processes were stopped before
editing.

### Summary
Replaced the heterogeneous `AppContextService` with two explicit owners:
`ScrollContextService` for scroll-root registration, relative-position
calculation, smooth scrolling and bounded animation ownership; and
`ShellLayoutService` for header geometry and semantic off-canvas close
requests. Refactored every consumer, removed the obsolete numeric scroll/root
and close ticks, and retained domain refresh through `DomainInvalidationService`.
The consumer inventory covered `AppComponent`, `AppShellFacade`, header,
history, ticket detail, molecule collection cards, search results, collection
and register pages, settings, terms/policies, and welcome.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npx ng test --watch=false --karma-config=karma.conf.js` with focused includes
  for `ScrollContextService`, `ShellLayoutService`, `AppShellFacade`, and
  `TermsAndPoliciesPageComponent` — 13 tests passed.
- `npm run lint --workspace mercurion_web_ng` — passed with pre-existing
  warnings only.
- `npm run build --workspace mercurion_web_ng` — passed; existing bundle-size
  and CommonJS warnings only.
- Tracked-source search confirmed no `AppContextService`, removed tick API, or
  misspelled `globalScollRootRef` remains.

### Full pre-merge CI-parity validation
Not run locally because clean-install and aggregate CI parity are GitHub Actions
only. Exact feature SHA `ca3a8146f1aa418baa56538c8de47f8cb760ebda` passed
GitHub Actions run `34549949295`: Classify validation, Ubuntu quality, Windows
quality, and `Required gate` all succeeded.

### Browser validation performed
After implementation, the same canonical runtime was restarted in the required
Tox21/Nest/Angular order. Two consecutive readiness rounds passed. Fresh
ordinary login through `http://localhost:8888/login` succeeded and protected
state was verified on the dashboard and settings route (masked account email,
active session and account data). Route transition to
`http://localhost:8888/terms-and-policies#aup` loaded the policy anchor through
the shared shell/scroll owner. Chrome reported no console errors. All three
post-validation runtime processes were stopped.

### Commits
Implementation commit: `6003cb68` (`FE-031 split app context ownership`).
Execution metadata commit: `ca3a8146` (`docs: record FE-031 execution commit`).

### Merge / CI
No merge performed. The coordinator owns integration after exact feature-SHA
CI succeeds.

### Rollback
_Not applicable._

### Blocker / human decision required
None.