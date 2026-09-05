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
`feature/UI-018`, based on
`353ec33621b22763546633fa822cb9a858b9d305`.

### Preflight
Passed unchanged on 2026-09-05. No task-owned Angular, Nest, Tox21 or test
watcher was active. Root `npm ci` completed successfully (1,925 packages,
zero vulnerabilities), followed by successful root `npm run ci:check`.

### Preflight remediation
_None._

### Summary
Implemented the cycle fix as coherent partial work: added the neutral
`Models/toast.models.ts` contract, migrated every `ToastContext` consumer away
from the renderer, consolidated the service's four independently mutable
signals into one discriminated immutable `ToastState`, retained the public
`show`, `slideIn`, `message`, `context`, `trigger` and `close` API, and made all
three lifecycle timers explicitly owned and cleared. Added a canonical static
gate that rejects direct component imports and indirect service-to-renderer
dependency paths.

The branch is blocked solely because mandatory browser validation could not
run against the complete canonical runtime. The implementation remains
preserved for review.

### Task-specific validation performed
- `npm run ci:angular:toast-imports`: passed, including the synthetic indirect
  cycle regression check.
- Angular workspace `npm run typecheck`: passed.
- Focused ESLint over changed Angular files: zero errors (nine pre-existing
  warning-policy findings in touched legacy files).
- Focused Karma command for the toast service and component specs: 13 tests
  passed in Chrome Headless. Coverage includes success/warn/error rendering,
  active-toast replacement policy, manual close, timeout lifecycle and timer
  destruction.

### Full pre-merge CI-parity validation
Run after every task-owned runtime was stopped: root `npm ci` and
`npm run ci:check` passed.

### Browser validation performed
Blocked before Chrome DevTools MCP interaction because the canonical runtime
readiness prerequisite failed. The nginx edge was reachable and served the
Angular application at `http://localhost:8888/` with HTTP 200. Angular started
successfully on its configured internal port, and Tox21 remained running after
restarting it with UTF-8 console mode. Nest compiled with zero TypeScript
errors but rejected startup because no local runtime environment was
configured: required `APP_*`, SQL, JWT, cookie, email, TOTP, Redis, SSO and
related variables were absent. Consequently
`http://localhost:8888/health` returned nginx HTTP 502.

All three task-owned runtime processes were stopped after this diagnostic. No
weaker Angular-direct or frontend-only browser result is claimed.

### Commits
`34a10cc836efc5c41ebd24b83005c50206ad55f8` -
`refactor(UI-018): decouple toast contracts`.

### Merge / CI
No merge attempted. The coordinator must preserve and freeze the pushed
feature branch.

### Rollback
_Not applicable._

### Blocker / human decision required
Provision a test-safe canonical local Nest runtime environment (and its local
service dependencies) so `npm run start:dev` can pass environment validation
and `http://localhost:8888/health` can become ready. Then authorize a new
session to perform the mandatory Chrome DevTools MCP checks for representative
success, warning and error toasts, replacement/dismiss/timeout behaviour,
keyboard/accessibility behaviour and light/dark appearance. Production
credentials are neither required nor permitted.
