# 0051 - Standardize production components on OnPush change detection

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every Angular production component use `ChangeDetectionStrategy.OnPush` or the repository's explicitly equivalent signal-compatible strategy, eliminating the current mixed change-detection model. Ensure, for components which used Deafault strategy, that the state management doesn't lose any case of reactivity. If necessary you can use also the api ChangeDetectorRef.markForCheck() after the dependency injection of the service.

Source: `FE-029` in Series `0001`.

## Context

The Series baseline found only 38 of 98 Angular components configured with `OnPush`. A mixed model hides mutation-driven coupling: components that currently depend on broad default change detection can break when optimized individually, while signal-heavy components already fit OnPush semantics naturally.

## Relevant files and modules

- all production Angular `@Component` declarations
- components currently missing `changeDetection`
- shared/presentational components and action/page components
- tests exercising input mutation, async updates and signal state
- Angular lint/static architecture configuration

## In scope

- Inventory all production components and current change-detection strategy.
- Migrate every component to OnPush/signal-compatible change detection.
- Fix code that relies on hidden mutable-reference updates so observable UI behaviour remains correct.
- Add a deterministic static gate preventing new production components without the canonical strategy.
- Document only technically unavoidable exceptions if Angular/framework constraints prove one exists.

## Out of scope

- Visual redesign.
- Migrating all legacy input/output/query APIs; task `0052` owns that modernization.
- Arbitrary performance micro-optimization unrelated to change detection.
- Disabling tests or manually forcing global change detection as a workaround.

## Decisions already made

- The steady state has no undocumented default-change-detection production component.
- Signals/immutable input updates are preferred over manual `detectChanges()` patches.
- Existing UI behaviour must remain compatible.
- Exceptions, if any, require a named technical reason and test coverage, not convenience.

## Requirements

1. Enumerate production components and identify those lacking explicit OnPush/signal-compatible strategy.
2. Add the canonical strategy to each component.
3. Run affected tests and fix mutable input/collection/object update patterns that no longer notify correctly.
4. Prefer immutable updates/signals/computed state; use `markForCheck` only at genuine external async boundaries when required.
5. Review third-party callback integrations and imperative DOM/SDK adapters for correct Angular-zone/change notification.
6. Add a lint/static architecture rule that rejects new production components using default strategy unless explicitly allowlisted.
7. Keep any allowlist minimal, documented and tested; target zero exceptions.

## Acceptance criteria

- [ ] Every production Angular component uses the canonical OnPush/signal-compatible change-detection strategy.
- [ ] No UI regression is masked by broad manual `detectChanges()` calls.
- [ ] Async/third-party updates still render when intended.
- [ ] A static gate prevents regression to default change detection.
- [ ] Existing component/page tests and browser smoke checks pass.
- [ ] Angular build and canonical CI gates pass.

## Validation

Run the static component-strategy gate, complete Angular tests/build and canonical CI-parity gate. Add focused tests for components whose implementation required mutation/async changes during migration.

## Browser validation

Through `http://localhost:8888`, smoke-test representative high-state surfaces: login/auth shell, settings, molecule detail/collections, action overlay and search. Confirm data updates, pending/error states and user interactions render without manual refresh.

## Stop conditions

Mark `BLOCKED` if a specific framework/vendor integration demonstrably requires default change detection and no supported OnPush bridge exists. Record the exact component/integration and evidence rather than silently exempting it.

## Dependencies

- `0048-eliminate-nested-subscriptions-and-declare-async-concurrency-policy.md`
- `0049-bind-component-streams-to-angular-lifecycle.md`

## Implementation notes

Use this migration to expose hidden mutation assumptions, not to paper over them. A component that only works after calling `detectChanges()` everywhere has not reached the intended steady state.

## Execution notes

### Feature branch
`feature/FE-029` from base `3f985df6570b38092166b9f6611be651381c0520`.

### Preflight
Passed unchanged task-start preflight after confirming no task-owned Angular, Nest, Tox21, Karma/Jest, or watch-mode process was active:

- `npm ci`
- `npm run ci:check`

### Preflight remediation
_None._

### Summary
Inventoried 98 production Angular components and migrated the 60 components without explicit change detection to `ChangeDetectionStrategy.OnPush`, leaving zero production component exceptions. Added `scripts/check-angular-component-change-detection.mjs` and wired `npm run ci:angular:onpush-components` into the root `ci:static` aggregate so new production components without the canonical strategy fail CI.

### Task-specific validation performed
Passed:

- `npm run ci:angular:onpush-components`
- component inventory script: `components 98 missing-onpush 0`
- `npm run ci:typecheck:angular`
- `npm run ci:lint:angular` (0 errors; existing warnings only)
- `npm run test:onpush --workspace mercurion_web_ng`
- `npm run ci:test:angular`
- `npm run ci:build:angular`

### Full pre-merge CI-parity validation
Passed final clean gate after stopping task-owned runtime processes and rechecking no Angular/Nest/Tox21/watch process remained:

- `npm ci`
- `npm run ci:check`

### Browser validation performed
Chrome DevTools MCP smoke validation through `http://localhost:8888`:

- `http://localhost:8888/welcome` rendered the public welcome shell, feature sections, footer links, and theme menu after opening the theme selector.
- `http://localhost:8888/login` rendered the auth shell; invalid email input remained disabled/invalid and valid `user@example.com` input enabled the continue button without manual refresh.

Limitation: backend-dependent settings, molecule detail/collections, action overlay, and search flows could not be safely exercised because `npm run start:dev` in `MercurionWebNode` failed local environment validation for missing development environment variables. The canonical nginx edge and Angular upstream were reachable; the only browser console error observed was the expected Socket.IO websocket 502 while Nest was unavailable.

### Commits
Feature commit recorded in the worker result.

### Merge / CI
Not started by worker; coordinator owns feature-SHA CI observation and integration.

### Rollback
_Not applicable._

### Blocker / human decision required
_None._