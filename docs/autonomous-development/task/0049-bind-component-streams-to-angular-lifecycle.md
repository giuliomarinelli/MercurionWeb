# 0049 - Bind component streams to Angular lifecycle

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Ensure every component-owned RxJS stream terminates deterministically with the component lifecycle using `takeUntilDestroyed`, async-pipe/toSignal ownership or an equivalent explicit teardown contract.

Source: `FE-027` in Series `0001`.

## Context

The audit found component subscriptions to form `valueChanges`, RDKit and Notebook-related streams whose lifetime is not uniformly tied to destruction. Examples include login/register/recovery forms, action components and collection/select components. Some classes keep manual `Subscription` fields while others subscribe without retaining teardown ownership.

Task `0048` fixes concurrency composition; this task fixes lifecycle ownership even where a direct subscription is otherwise semantically valid.

## Relevant files and modules

- Angular components/pages containing `.subscribe()`
- form `valueChanges` subscriptions
- RDKit/editor/viewer consumers
- Notebook components/services consumers
- GraphQL `valueChanges` consumers owned by components
- `DestroyRef`, `takeUntilDestroyed`, `toSignal`, async-pipe usage

## In scope

- Inventory component/page subscriptions and classify their owner/lifetime.
- Migrate component-lifetime subscriptions to Angular lifecycle-aware teardown.
- Prefer template async pipe or `toSignal` where the stream is declarative view state.
- Keep imperative subscriptions only when they have clear lifecycle ownership.
- Remove redundant manual `Subscription` bookkeeping after migration.
- Add lifecycle tests proving no callbacks occur after destruction.

## Out of scope

- Application-lifetime singleton subscriptions that are intentionally owned for the whole app and documented as such.
- Socket.IO listener ownership already handled by `0040`.
- General DOM/timer/RAF cleanup; task `0050` owns non-RxJS browser resources.
- Async concurrency semantics already owned by `0048`.

## Decisions already made

- Component-owned streams end when their component is destroyed.
- `takeUntilDestroyed`/async pipe/`toSignal` are preferred over ad-hoc arrays of `Subscription` handles.
- Service streams do not become component-owned merely because a component consumes them; ownership remains explicit.

## Requirements

1. Search production component/page code for `.subscribe()` and manual `Subscription` fields.
2. Classify each subscription as declarative view state, imperative component side effect, or intentionally longer-lived service ownership.
3. Use async pipe/`toSignal` for declarative consumption when it simplifies ownership without changing semantics.
4. Bind imperative component subscriptions with `takeUntilDestroyed` or equivalent `DestroyRef` cleanup.
5. Migrate form `valueChanges` subscriptions in login/register/recovery/action components.
6. Verify RDKit and Notebook/component streams release observers when their owner is destroyed.
7. Remove manual unsubscribe boilerplate made redundant by lifecycle-aware APIs.
8. Add tests that destroy fixtures/components and emit afterward, asserting no state/side effect is produced.

## Acceptance criteria

- [ ] Every production component-owned RxJS subscription has deterministic destruction ownership.
- [ ] No component relies on forgetting/remembering a manual unsubscribe for correctness where Angular lifecycle APIs apply.
- [ ] Form/RDKit/Notebook audited streams have lifecycle coverage.
- [ ] Destroyed components do not receive later emissions.
- [ ] Observer/subscription counts return to expected baseline in lifecycle tests.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run lifecycle-focused component tests, a repository review/search of component subscriptions, and the canonical CI-parity gate.

## Browser validation

Use `http://localhost:8888` to navigate repeatedly into/out of at least one form-heavy route and one route owning a richer stream (molecule/Notebook if reachable). Verify returning to the route does not duplicate reactions/requests and console has no post-destroy errors.

## Stop conditions

Mark `BLOCKED` if a subscription that appears component-owned intentionally must outlive the component and its true owner cannot be established from existing architecture. Move ownership only after that contract is clarified.

## Dependencies

- `0048-eliminate-nested-subscriptions-and-declare-async-concurrency-policy.md`

## Implementation notes

Do not mechanically wrap every service subscription in `takeUntilDestroyed` if the subscription should actually live in a facade/store. Move work to its real owner first where necessary.

## Execution notes

### Feature branch
`feature/FE-027` from base `30e46d05085ad36db75ae8886c8e5e2d5fdfa4bb`.

### Preflight
Passed unchanged: `npm ci` followed by `npm run ci:check`.

### Preflight remediation
_None._

### Summary
Audited production Angular subscriptions. Long-lived form `valueChanges`, RDKit readiness, Notebook data/mutation, collection-selection, and collection-action streams now use `takeUntilDestroyed(DestroyRef)`. Notebook edit and landing pages no longer retain manual `Subscription` fields solely for lifecycle cleanup; the autosave subject is completed during destruction. Existing manually managed action/request subscriptions were retained where they preserve explicit cancellation/replacement semantics.

### Task-specific validation performed
Passed `npm run typecheck --workspace mercurion_web_ng`. Passed focused lifecycle tests with `npx ng test --watch=false --include='src/app/components/chem/molecule-viewer/molecule-viewer.component.spec.ts' --include='src/app/pages/notebook/notebook-landing/notebook-landing.component.spec.ts' --include='src/app/pages/account-recovery/account-recovery.page.component.spec.ts'` (6 specs). The tests prove form callbacks do not update state after fixture destruction and RDKit/Notebook observer counts become zero when fixtures are destroyed. Production review found no remaining direct `valueChanges.subscribe` or `instance$.subscribe` calls.

### Full pre-merge CI-parity validation
Passed: `npm ci` followed by `npm run ci:check`.

### Browser validation performed
Automated lifecycle validation used because the canonical nginx edge was unavailable: Chrome DevTools opening `http://localhost:8888/login` returned nginx's "An error occurred" / "currently unavailable" page. No task-owned runtime was started before the required preflight, and the externally managed proxy was left untouched.

### Commits
`820fab793352f1e2274fe6c42dde2f740bd2b506` - Bind component streams to Angular lifecycle.

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._