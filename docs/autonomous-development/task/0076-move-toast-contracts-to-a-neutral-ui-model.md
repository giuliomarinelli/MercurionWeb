# 0076 - Move toast contracts to a neutral UI model

- [x] DONE
- [ ] BLOCKED
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

> Current status (2026-09-11): PENDING by direct owner instruction because this
> activity was not completed. Historical attempt/skip evidence remains below
> for traceability and is not a terminal outcome. The prior partial work is
> preserved on `archive/UI-018-attempt-2026-09-11`.

### Feature branch
Historical attempt `archive/UI-018-attempt-2026-09-11`, based on
`353ec33621b22763546633fa822cb9a858b9d305`, is preserved at
`36ccc5d09cb2258b151c6cd6fee82807417f6155`.

### Preflight
Passed unchanged: root `npm ci` followed by `npm run ci:check`.

### Preflight remediation
_None._

### Summary
The preserved historical attempt moves toast contracts to a neutral typed model,
removes the service-to-renderer dependency, consolidates mutable toast signals
into immutable discriminated state, adds deterministic timer cleanup, and adds
focused lifecycle/import-boundary coverage. It cannot be integrated because
the mandatory browser validation prerequisite could not be made ready.

### Task-specific validation performed
On the preserved historical attempt: focused service/component Karma tests (13
passing), `npm run ci:angular:toast-imports`, Angular typecheck, and focused
ESLint completed successfully.

### Full pre-merge CI-parity validation
On the preserved historical attempt after its task-owned runtimes stopped: root
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
No merge attempted. The historical attempt is archived at its final pushed SHA.

### Rollback
_Not applicable._

### Blocker / human decision required
Provision a test-safe canonical local Nest runtime environment and local
dependencies so `/health` is ready through `http://localhost:8888`, then
authorize a new session to perform the required success/warning/error,
replacement/dismiss/timeout, keyboard/accessibility, and light/dark browser
checks. Production credentials are neither required nor permitted.

### Fresh authorized attempt (2026-09-11, feature/UI-018)

- Confirmed the clean feature branch started at base
  `a39facd3de1e10b81ed7a3ab9e3e9b757f7bfdf5`, with exact-SHA Actions run
  `34589848773` green: Ubuntu and Windows quality jobs plus `Required gate`.
- Runtime capability preflight completed with the canonical Tox21, Nest and
  Angular commands in order. After readiness, the persistent Chrome profile
  performed a fresh ordinary login through `/login` using the ignored local
  test account, and the protected dashboard (`Benvenuto Test.`) was observed.
  All worker-started runtime processes were stopped before implementation.
- The existing neutral `Models/toast.models.ts` contract and service-owned
  immutable message signal were retained. This attempt closes the complete
  current toast state when `close()` is called, adds explicit warning
  presentation, and extends lifecycle/variant coverage without changing the
  public trigger/close API.
- Focused validation passed: Angular toast service/component tests (`11
  SUCCESS`), Angular typecheck, and changed-file ESLint. The import-boundary
  grep confirmed no service-to-component import and `ToastContext` is absent
  from application sources; the renderer imports only the neutral model
  transitively through the service.
- Post-change browser validation used the canonical edge after two complete
  readiness rounds. The protected dashboard rendered after fresh ordinary
  login, including `Benvenuto Test.` and workspace data. The safe
  `Importa da ChEMBL` flow opened and closed its accessible dialog without
  modifying data; direct success/warn/error lifecycle and replacement,
  dismiss, and timeout evidence is covered by the focused Angular tests.
  Light-mode rendering was observed; no visual redesign was introduced.
- A failed initial focused test assertion (newest-first ordering) was
  corrected, then the complete focused suite passed. The initial
  `npm run ci:angular:toast-imports` lookup was unavailable because that
  historical script is not present in the current base; the direct
  no-import boundary check was used instead. No full CI command was run
  locally.
