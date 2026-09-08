# 0076 - Move toast contracts to a neutral UI model

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Break the `ToastService` ↔ toast component dependency cycle by moving toast contracts into a neutral typed UI model consumed independently by the service and renderer.

Source: `UI-018` in Series `0001`.

## Context

`ToastService` imports `ToastContext` directly from `components/common/toast/toast.component.ts`, while that component imports `ToastService`. The service therefore depends on its renderer solely to obtain a type, creating an avoidable service/component import cycle and making the toast contract presentation-owned.

Current evidence includes:

- `toast.component.ts` exporting `ToastContext = 'error' | 'warn' | 'success'` and importing `ToastService`;
- `toast.service.ts` importing that `ToastContext` from the component.

## Relevant files and modules

- `MercurionWebNg/src/app/components/common/toast/toast.component.ts`
- `MercurionWebNg/src/app/services/toast.service.ts`
- toast callers across Angular
- any toast tests/model helpers

## In scope

- Move toast context/message/configuration types into a neutral UI/domain-independent module.
- Make service and renderer depend on that neutral contract, never on each other for types.
- Tighten toast state into an explicit typed model where existing separate signals permit inconsistent combinations.
- Preserve current success/warn/error behaviour, timeout/close semantics and public service API unless simplification is source-compatible.
- Add dependency-cycle and service/component tests.

## Out of scope

- Redesigning toast visual appearance.
- Replacing toasts with another notification system.
- Changing product copy or error mapping.

## Decisions already made

- Shared UI contracts live in a neutral module; services never import a component to obtain a type.
- The renderer may consume the service/store, but the service/store remains render-implementation independent.
- Toast context is a finite typed union and should remain exhaustive.
- Notification lifecycle state should not be representable as contradictory independent fields when one immutable toast entity/state can express it more clearly.

## Requirements

1. Create a neutral toast model module containing `ToastContext` and any shared toast payload/config types.
2. Update `ToastService` and the toast component to import only from that model as appropriate.
3. Remove the service → component import completely and verify no indirect cycle remains.
4. Preserve existing caller API or provide a mechanical typed migration for all callers.
5. If the current service maintains multiple signals that can drift, consolidate them into one immutable/current-toast state without changing visible behaviour.
6. Preserve dismiss/timeout/replacement semantics and make timer cleanup deterministic.
7. Add tests for success/warn/error, replacement, manual close and timeout lifecycle.
8. Add/import-cycle tooling coverage if the repository's canonical static gate supports detecting this class of dependency regression.

## Acceptance criteria

- [ ] `ToastService` imports no component module.
- [ ] Toast service and renderer share a neutral typed model.
- [ ] The service ↔ component import cycle is absent.
- [ ] Existing success/warn/error caller behaviour remains compatible.
- [ ] Toast lifecycle/timer cleanup is deterministic and covered by tests.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused toast service/component tests, static dependency/cycle checks where available, and the canonical repository CI-parity gate.

## Browser validation

Through `http://localhost:8888`, trigger representative success, warning and error notifications using local/test-safe flows. Verify rendering, replacement/dismiss/timeout behaviour, keyboard/accessibility behaviour and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if current callers rely on undocumented toast behaviours whose intended replacement/queue semantics cannot be determined safely. Preserve the cycle fix independently where possible, but do not invent a new notification policy.

## Dependencies

- `0050-own-browser-listeners-timers-and-animation-frames-deterministically.md`

## Implementation notes

A path such as `src/app/ui/toast/toast.model.ts` or the repository's canonical neutral UI-model location is preferable to moving the type into another component-adjacent file. Keep model imports one-directional.

## Execution notes

### Feature branch
`feature/UI-018`, based on `353ec33621b22763546633fa822cb9a858b9d305`,
is preserved and frozen at `36ccc5d09cb2258b151c6cd6fee82807417f6155`.

### Preflight
Passed unchanged: root `npm ci` followed by `npm run ci:check`.

### Preflight remediation
_None._

### Summary
The preserved feature branch moves toast contracts to a neutral typed model,
removes the service-to-renderer dependency, consolidates mutable toast signals
into immutable discriminated state, adds deterministic timer cleanup, and adds
focused lifecycle/import-boundary coverage. It cannot be integrated because
the mandatory browser validation prerequisite could not be made ready.

### Task-specific validation performed
On the preserved feature branch: focused service/component Karma tests (13
passing), `npm run ci:angular:toast-imports`, Angular typecheck, and focused
ESLint completed successfully.

### Full pre-merge CI-parity validation
On the preserved feature branch after its task-owned runtimes stopped: root
`npm ci` followed by `npm run ci:check` passed.

### Browser validation performed
Blocked before Chrome DevTools MCP interaction. The canonical nginx edge served
the Angular application at `http://localhost:8888/`, but Nest could not start
without required local APP, SQL, JWT, cookie, email, TOTP, Redis, SSO, and
related configuration. `http://localhost:8888/health` consequently returned
HTTP 502. No Angular-direct or frontend-only browser result is claimed.

### Commits
Preserved feature commits: `34a10cc87eb5fc7e96b162663765ee48dfc63d0b`
(`refactor(UI-018): decouple toast contracts`) and
`36ccc5d09cb2258b151c6cd6fee82807417f6155`
(`docs(UI-018): record blocked task evidence`).

### Merge / CI
No merge attempted. The feature branch is frozen at its final pushed SHA.

### Rollback
_Not applicable._

### Blocker / human decision required
Provision a test-safe canonical local Nest runtime environment and local
dependencies so `/health` is ready through `http://localhost:8888`, then
authorize a new session to perform the required success/warning/error,
replacement/dismiss/timeout, keyboard/accessibility, and light/dark browser
checks. Production credentials are neither required nor permitted.
