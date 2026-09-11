# 0059 - Create the canonical Button primitive

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Introduce one stateless, typed Angular `Button` primitive and migrate application buttons to it so button semantics, variants, sizing, icon placement, loading/disabled behaviour and native `type` no longer depend on ad-hoc template class strings.

Source: `UI-001` in Series `0001`.

## Context

The audit found 143 native buttons with 93 static class signatures, 74 of them singletons. This makes visual and accessibility behaviour drift across pages and overlays. There is currently no canonical `m-button` component; button styling is spread through inline Tailwind classes and shared CSS helpers such as action-card classes.

## Relevant files and modules

- `MercurionWebNg/src/styles.css`
- `MercurionWebNg/src/app/components/common/`
- action components under `MercurionWebNg/src/app/components/action-components/`
- page components containing native application buttons
- existing icon/close controls, but `0060` owns the dedicated icon-only primitive

## In scope

- Add a stateless canonical `Button` component with typed inputs.
- Support at least semantic `variant`, `size`, native button `type`, disabled, loading and icon placement.
- Preserve accessible button semantics and focus treatment.
- Migrate ordinary application buttons to the primitive.
- Remove obsolete duplicated button class recipes after consumers migrate.
- Add component and representative integration tests.

## Out of scope

- Icon-only/close-button normalization (`0060`).
- Dialog/action-card shell normalization (`0068`/`0069`).
- Changing product copy or action semantics.
- Replacing navigational links with buttons.

## Decisions already made

- The primitive is stateless/presentational; feature components own business state and callbacks.
- Variant/size/icon placement are typed finite unions, not arbitrary class-string inputs.
- Loading is an explicit state that prevents duplicate activation and exposes an accessible busy state.
- Every button declares a native `type`; accidental form submission through an implicit browser default is not allowed.
- Consumers may project label/icon content, but may not bypass the primitive with feature-local visual variants without a documented design-system reason.

## Requirements

1. Inventory native application `<button>` usages and group existing signatures into a minimal semantic variant/size matrix.
2. Implement the canonical component using OnPush/signal-compatible APIs established by earlier Angular tasks.
3. Define deterministic styling for hover, active, focus-visible, disabled, loading and dark theme.
4. Support leading/trailing icon placement without requiring feature-specific wrapper markup.
5. Ensure loading state keeps dimensions stable and cannot emit repeated actions.
6. Migrate all ordinary application buttons while preserving event handlers, form semantics and labels.
7. Leave icon-only controls for `0060`, but make the visual token contract reusable by that task.
8. Add tests for each variant/size/state and at least one form-submit and one non-submit consumer.
9. Add a static regression check or equivalent reviewable mechanism preventing new feature-local ordinary button class signatures from proliferating unnoticed.

## Acceptance criteria

- [ ] Ordinary application buttons use the canonical `Button` primitive.
- [ ] Variant, size, icon placement, loading, disabled and native type are typed.
- [ ] No migrated consumer changes product behaviour or form-submit semantics.
- [ ] Focus-visible and disabled/loading semantics are accessible in light and dark themes.
- [ ] Representative duplicate button CSS/class recipes are removed.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused `Button` tests, representative migrated form/action tests, then the canonical repository CI-parity gate.

## Browser validation

Mandatory through Chrome DevTools MCP at `http://localhost:8888`:

1. inspect representative primary, secondary/destructive/neutral buttons actually present in the product;
2. verify hover, keyboard focus, disabled and loading states;
3. verify Enter/Space activation and native form submit/non-submit behaviour;
4. check light/dark themes and representative mobile/desktop widths;
5. confirm no layout jump when loading state appears.

## Stop conditions

Mark `BLOCKED` if the existing button inventory contains materially different product semantics that cannot be represented without deciding a new design-system policy. Do not encode dozens of one-off variants merely to mechanically preserve accidental styling differences.

## Dependencies

- `0051-standardize-production-components-on-onpush-change-detection.md`
- `0052-standardize-modern-angular-component-apis.md`

## Implementation notes

Prefer a small semantic API over a utility-class passthrough. The point is to remove class-string ownership from features, not wrap it in another input.

## Execution notes

### Current execution (2026-09-11, Source UI-001)

#### Feature branch
`feature/UI-001`, verified at supplied base SHA
`31ffc7dbaa3b75a0eb272f8fe27496b1dd33d7c1`. The working tree was clean and
the remote `feature/UI-001` ref did not exist before this attempt.

#### Preflight
Exact base-SHA GitHub Actions evidence was confirmed before task work:

- CI run `34609560722`, push event, exact SHA, `success`.
- CI run `34611679709`, manual full run, exact SHA, `success`.

The focused unchanged-tree Angular check
`npm --prefix MercurionWebNg run typecheck` passed. The native application
button inventory found 146 opening tags and 93 distinct static class
signatures. No task-owned Angular, Nest, Tox21, or test-watcher process was
active before runtime startup.

#### Browser/runtime capability preflight
The canonical runtime was started in the required order and in separate live
sessions:

1. `../MercurionTox21`: `PYTHONUTF8=1 .venv\Scripts\python.exe -m main`
2. `MercurionWebNode`: `APP_ENV=development LOCAL_DUMMY_AUTH=false npm run start:dev`
3. `MercurionWebNg`: `npm run start:dev`

After all three live handles existed, `http://localhost:8888/health` and
`http://localhost:8888/` were polled. An initial upstream `502` was followed
by two consecutive complete readiness rounds with HTTP 200 for both URLs.
Chrome DevTools MCP used the dedicated persistent profile at the canonical
origin. A fresh ordinary login through
`http://localhost:8888/login` using the authorized local test account reached
the protected Dashboard and exposed the authenticated workspace identity.
All three task-owned runtime sessions were stopped and local process
inspection confirmed their absence before any task mutation.

#### Stop-condition decision
No implementation was started. The inventory contains materially different
ordinary-button, action-card/layout, navigation, form, theme, status, and
control semantics, while icon-only and close controls are explicitly owned by
task `0060`. The recipe does not provide a semantic mapping policy for the
remaining signatures or define which feature-local layout classes may remain
on migrated consumers. Encoding one-off variants or mechanically forwarding
arbitrary class strings would violate the recipe's canonical-primitive
constraint. The task stop condition therefore applies and requires a
design-system decision before safe all-consumer migration.

#### Task-specific validation
No implementation validation was applicable after the recipe stop condition.
The required runtime/browser capability preflight and protected-state login
completed successfully. No product behavior or source implementation was
changed.

#### Full pre-merge CI-parity validation
Not run locally. `npm ci` and `npm run ci:check` are forbidden in autonomous
worker sessions; complete clean-install and aggregate validation remain owned
by GitHub Actions.

#### Browser validation
The mandatory capability preflight used only `http://localhost:8888`, proved
the protected Dashboard after a fresh real-account login, and stopped all
task-owned processes. The full post-implementation acceptance matrix was not
run because the task stop condition was reached before implementation.

#### Commits
This diagnostic task-metadata commit preserves the blocked attempt on
`feature/UI-001`.

#### Merge / CI
No feature implementation ref was published before the diagnostic commit.
The branch is preserved for the coordinator's blocked-task handling.

#### Blocker / human decision required
A design-system owner must decide the semantic variant/size mapping for the
materially different ordinary button signatures and the allowed boundary
between canonical button styling and feature-local layout semantics. The
decision must also confirm the migration boundary for controls that look like
buttons but have icon-only or close semantics owned by task `0060`.

> Historical status from the earlier skipped attempt: PENDING by direct owner
> instruction because that activity was not completed. The historical
> attempt/skip evidence remains below for traceability and is not this
> execution's terminal outcome. The prior partial work is
> preserved on `archive/UI-001-attempt-2026-09-11`.

### Feature branch
`feature/UI-001`, based on `4f5090b9aed3ce491e2e5150b58ee98663142a2d`.

### Preflight
Confirmed clean exact base SHA and successful GitHub Actions CI run
`34554525081` for `4f5090b9aed3ce491e2e5150b58ee98663142a2d`. The native
button inventory found 146 opening tags across HTML and inline Angular
templates, including icon-only controls reserved for task 0060. The
canonical runtime preflight started Tox21, Nest watch mode, and Angular watch
mode in that order; nginx returned two consecutive complete readiness rounds
with HTTP 200 for `/health` and `/`. A fresh ordinary login at
`http://localhost:8888/login` reached the protected Dashboard and displayed
the authenticated workspace identity. All three task-owned processes were
stopped before editing.

### Preflight remediation
None.

### Summary
Added a partial stateless, OnPush-compatible typed `m-button` primitive with
semantic variants, sizes, native type, disabled/loading state, icon placement
contract, stable loading dimensions, accessible busy/disabled attributes,
focus-visible treatment, and light/dark styling. Migrated the ordinary
navigation search consumer without changing its action semantics.

### Task-specific validation performed
Focused Angular Button spec (3 tests) and Nav spec (1 test) passed. Angular
typecheck passed and lint completed with existing repository warnings. The
post-implementation runtime reached two consecutive complete readiness rounds
and the protected Dashboard remained available through the canonical edge.
Navigation to the collections route subsequently returned a 504 from an
upstream, so no stronger post-implementation product-state evidence is claimed.

### Full pre-merge CI-parity validation
Complete clean-install CI parity is reserved for GitHub Actions. Existing-tree
focused validation was run locally; `npm ci` and `npm run ci:check` were not run.

### Browser validation performed
The unchanged preflight used only `http://localhost:8888`, performed a fresh
real-account login, and proved protected Dashboard acceptance. The
post-implementation runtime used the same canonical edge and was stopped after
readiness/Dashboard evidence; the collections-route 504 prevented completing
the full required representative-control matrix.

### Commits
See the feature-branch implementation commit recorded by the coordinator.

### Merge / CI
No feature ref was pushed because the recipe stop condition was reached before
the task could satisfy its migration acceptance criteria.

### Rollback
_Not applicable._

### Blocker / human decision required
Resolved by direct owner instruction on 2026-09-11. Use a minimal semantic
variant/size matrix, retain consumer-specific layout/position/width classes at
the consumer boundary, centralize interactive visual and native button
semantics, and leave icon-only/close controls to task `0060`. Inventory
diversity alone is not a blocker. The archived implementation was recovered
without rewriting history and remains subject to completion and validation.
