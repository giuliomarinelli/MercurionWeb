# 0069 - Create the canonical ActionCard shell

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one stateless action-card shell that standardizes title/header, close control, body, footer and responsive width/layout across action-overlay feature components.

Source: `UI-011` in Series `0001`.

## Context

At least six action components duplicate `action-card-close-btn`, header/body/footer structure and responsive card sizing. `styles.css` contains action-card helper classes, but each feature still owns large repeated shells. After `0068`, the outer dialog/overlay owns modal semantics; this task normalizes the inner feature card.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/`
- `MercurionWebNg/src/styles.css` action-card helpers
- canonical Dialog shell from `0068`
- canonical IconButton from `0060`
- canonical ActionFooter from `0061`

## In scope

- Implement a stateless action-card shell with title/header, body, optional footer and close slot/action.
- Define finite responsive width/size variants.
- Compose canonical close and footer primitives.
- Migrate action components that share the repeated shell.
- Remove duplicated structural markup/helper CSS after migration.
- Add component and representative feature tests.

## Out of scope

- Feature business state/step logic.
- Outer modal focus/backdrop semantics (`0068`).
- Redesigning action content.

## Decisions already made

- The card is presentation/layout only; feature state stays in the action component/session.
- The outer Dialog owns `role=dialog`, focus trap and scroll lock; ActionCard must not duplicate those semantics.
- Close action is explicit and may be omitted/disabled according to the outer flow policy.
- Widths are semantic finite variants, not arbitrary per-feature Tailwind strings.

## Requirements

1. Inventory action-component shell structures and identify common header/body/footer/width patterns.
2. Implement one action-card primitive using content projection/typed slots.
3. Compose `IconButton` for close and `ActionFooter` for standard action regions.
4. Define responsive sizing variants sufficient for current flows without one variant per component.
5. Migrate all compatible action components while preserving their step/content logic.
6. Remove obsolete duplicated header/close/footer structural CSS and markup.
7. Add tests for title, close presence, body/footer projection and responsive variant classes/semantics.

## Acceptance criteria

- [ ] Compatible action components use one ActionCard shell.
- [ ] Header/body/footer/close structure is no longer duplicated per feature.
- [ ] Responsive widths come from a finite canonical variant set.
- [ ] Dialog semantics remain exclusively owned by the outer dialog shell.
- [ ] Feature behaviour remains unchanged.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run ActionCard tests and representative migrated action-component tests, search for obsolete action-card structural helpers, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, open several action scopes with short/long and multistep content at desktop/mobile widths; verify title/close/body/footer layout, scroll behaviour and no nested dialog semantics in the accessibility tree.

## Stop conditions

Mark `BLOCKED` if a feature currently depends on a materially different shell whose UX purpose cannot be represented by a bounded canonical size/layout variant. Document the exception rather than turning ActionCard into an arbitrary-class wrapper.

## Dependencies

- `0060-create-the-accessible-iconbutton-primitive.md`
- `0061-create-the-canonical-actionfooter-primitive.md`
- `0068-create-the-canonical-dialog-and-overlay-shell.md`

## Implementation notes

Keep feature conditionals inside projected content. The shell should not learn action-scope names or step enums.

## Execution notes

> Current status (2026-09-11): PENDING by direct owner instruction because this
> activity was not completed. Historical attempt/skip evidence remains below
> for traceability and is not a terminal outcome.

### Feature branch
`feature/UI-011`, based on `25311ffa7d9cf137011a4e6337e674051a96b618`
(`origin/develop`, exact green CI run `34660471233`).

### Preflight
Clean feature branch created from current `origin/develop`; no
workspace-consuming Angular, Nest, Tox21, or test-watcher process was active.
The supplied develop SHA had successful Ubuntu and Windows quality jobs plus
the stable `Required gate` in Actions run `34660471233`. The canonical runtime
capability preflight started Tox21, Nest, and Angular in the required order,
recorded live handles `581`, `582`, and `583`, waited through nginx `502`
upstream-build responses, then obtained two consecutive `200/200` readiness
rounds. A fresh ordinary login through `/login` succeeded and protected
dashboard state was observed. Handles `581`, `582`, and `583` were stopped
before implementation.

### Preflight remediation
The first focused test invocation was corrected to run from `MercurionWebNg`
(the initial root invocation reported the expected missing root script). No
dependency installation or aggregate `ci:check` was run locally.

### Summary
Implemented the stateless `m-action-card` shell with finite `compact`,
`standard`, `wide`, and `full` size variants, projected title/body/footer and
close slots, canonical `IconButton` close behavior, responsive body scrolling,
and no dialog semantics. Migrated the seven compatible action components:
create collection, save molecule, add molecules, bind collections, profile
registry edit, select collection, and sensitive-data workflow. Removed the
duplicated global action-card header/body helper CSS while preserving feature
step and business logic.

### Task-specific validation performed
* `npm run typecheck` from `MercurionWebNg`: passed.
* `npm run test:ci` from `MercurionWebNg`: passed, `434 SUCCESS`.
* `npm run lint` from `MercurionWebNg`: passed with existing warnings only.
* `npm run build` from `MercurionWebNg`: passed; only existing bundle-size and
  CommonJS warnings were emitted.
* `git diff --check`: passed.
* Search for `class="action-card"`, `.action-card-header`,
  `.action-card-body`, and `action-card-close-btn`: no obsolete helper usage.
* Added `ActionCardComponent` unit coverage for title, close, body/footer
  projection, finite size class, close output, and absence of nested dialog
  semantics.

### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI parity remain Actions-owned and were
not run locally. The exact pushed feature SHA is submitted for the required
GitHub Actions feature validation.

### Browser validation performed
After implementation, canonical Tox21/Nest/Angular sessions `632`, `633`, and
`634` were started in order. Nginx returned retryable `502` responses while
upstreams compiled, followed by two consecutive complete `200/200` readiness
rounds. Through `http://localhost:8888`, the dedicated profile showed:

* desktop create-collection action: canonical title, close control, body,
  footer actions, and one outer `role="dialog"` with the inner card exposed as
  a region;
* mobile (390x844) create-collection action: same projected shell at the
  responsive compact width;
* mobile (390x844) add-molecules multistep action: long body, radio-step
  content, close control, footer actions, and no nested dialog role.

The protected dashboard and collection routes were server-accepted after
ordinary login. Sessions `632`, `633`, and `634` were stopped; final process
inventory showed no task-owned runtime or watcher remaining.

### Commits
Pending final feature commit with the required Copilot co-author trailer.

### Merge / CI
No develop merge was performed by the worker. Coordinator must observe the
exact feature-SHA Actions gate before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
