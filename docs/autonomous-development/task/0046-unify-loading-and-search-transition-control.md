# 0046 - Unify loading and search transition control

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace duplicated, uncancelled mount/visibility timers in `LoadingContextService` and `SearchContextService` with one deterministic cancellable transition controller where the latest intent always wins.

Source: `FE-024` in Series `0001`.

## Context

Both services independently maintain a primary open/loading signal plus `isMounted` and `isVisible`, then use `setTimeout(..., 10)` for showing and `setTimeout(..., 300)` for unmounting. Existing callbacks are not cancelled when intent reverses quickly, so an obsolete timeout can mutate state after a later start/open/stop/close.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/loading-context.service.ts`
- `MercurionWebNg/src/app/services/context/search-context.service.ts`
- loading/search overlay components and consumers
- transition timing constants/styles used by the corresponding UI

## In scope

- Create one small reusable transition controller/primitive for mounted-visible lifecycle.
- Cancel obsolete show/unmount timers when intent changes.
- Preserve existing transition durations unless a shared canonical constant already exists.
- Make state readonly to consumers where practical.
- Migrate both loading and search contexts to the shared primitive.
- Add deterministic fake-timer tests for rapid reversals.

## Out of scope

- General animation framework or design-system refactor.
- Action overlay state machine; task `0045` owns that richer lifecycle.
- Search query/data-flow redesign.
- Changing loading/search UX timing.

## Decisions already made

- Latest intent wins.
- No stale timer may change mount/visibility after a newer intent.
- Mount/visibility transition mechanics are infrastructure and should not be duplicated by each context.
- Tests use fake time, not real sleeps.

## Requirements

1. Extract the shared semantics from the two current services without coupling their domain commands.
2. Provide explicit `open/start` and `close/stop` intent to a transition controller that owns timer handles/generation.
3. Cancel/revoke pending show/unmount work on every superseding intent.
4. Guarantee state invariants such as visible implies mounted.
5. Expose domain-friendly APIs (`start/stop`, `open/close`) while sharing only transition mechanics.
6. Ensure teardown clears outstanding timers if the owner can be destroyed.
7. Add fake-timer tests for open→close before show, close→open before unmount, repeated identical intents and final teardown.

## Acceptance criteria

- [ ] Loading and search no longer duplicate raw mount/visibility timeout logic.
- [ ] Stale callbacks cannot override newer state.
- [ ] Visible state cannot survive after unmount.
- [ ] Repeated rapid open/close sequences settle deterministically to the latest intent.
- [ ] Existing UI transition timing remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused context/controller tests under fake timers, affected overlay/component tests and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, rapidly open/close the search overlay and exercise an available loading transition. Confirm there is no delayed remount/flicker after close, no hidden-but-mounted stale overlay beyond the intended transition, and no console errors.

## Stop conditions

Mark `BLOCKED` only if the two contexts intentionally require incompatible transition semantics not represented by current code/styles. Document the difference rather than forcing a misleading shared abstraction.

## Dependencies

- None.

## Implementation notes

Share the state-transition mechanism, not the domain service. A tiny controller/composable with cancellable timers is preferable to merging Loading and Search into one generic global context.

## Execution notes

### Feature branch
`feature/FE-024` at base `f1bd8d2724ae913251cbae85dadb504e4ebe7114`.

### Preflight
Stopped task-owned runtimes/watchers before install. Unchanged `npm ci` passed
(Node 22.16.0 / npm 10.9.2), followed by unchanged `npm run ci:check` passing
all autonomous validation, lint, typecheck, Angular/Nest unit and E2E tests,
builds, GraphQL, contract, and static policy gates.

### Preflight remediation
_None._

### Summary
Added `MountedVisibleTransitionController`, which centralizes the 10 ms show
and 300 ms unmount timings, cancels both pending timers on every newer intent,
guards callbacks with a generation, enforces visible-implies-mounted, and
clears timers on teardown. Loading and search retain their `start`/`stop` and
`open`/`close` APIs and expose readonly signals. Direct search signal mutations
were migrated to those domain APIs.

### Task-specific validation performed
`npm run test:ci --workspace mercurion_web_ng -- --include=src/app/services/context/loading-context.service.spec.ts --include=src/app/services/context/search-context.service.spec.ts`
passed (194 specs; Angular CLI still compiled the complete configured suite).
The added Jasmine fake-clock coverage verifies open-to-close before show,
close-to-open before unmount, repeated intents, invariant preservation, and
teardown timer cancellation. Also passed Angular lint (existing warnings only),
Angular typecheck, and Angular build.

### Full pre-merge CI-parity validation
After stopping all runtime descendants, the first final `npm ci` encountered
EPERM on `node_modules/@esbuild/win32-x64/esbuild.exe`; process inspection
identified lingering Angular/esbuild descendants from the browser runtime.
They were stopped by PID, no MercurionWeb/Tox21 workspace process remained,
and the retry `npm ci` passed. The subsequent complete `npm run ci:check`
passed (exit 0), including all repository-controlled gates.

### Browser validation performed
Using Chrome DevTools MCP through `http://localhost:8888/login`, clicked the
search trigger, observed the molecular-search dialog, clicked close, observed
the dialog remain mounted during its intended transition, then after 400 ms
observed it unmounted with no stale remount. Console inspection found no
application errors; the only error was the runtime limitation
`ws://localhost:8888/socket.io` returning 502 because the local Nest health/
WebSocket upstream was unavailable. The nginx edge served the SPA (200).

### Commits
`d6a8ccb341a810d30e9438a248da26272aac83d7` implementation commit; the
following metadata-only commit records these execution notes.

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._