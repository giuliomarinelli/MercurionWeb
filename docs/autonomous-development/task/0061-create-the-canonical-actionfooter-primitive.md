# 0061 - Create the canonical ActionFooter primitive

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create a stateless `ActionFooter` primitive that standardizes primary/secondary action ordering, responsive layout, pending state and disabled behaviour across forms and action overlays.

Source: `UI-003` in Series `0001`.

## Context

Multiple action components repeat an `action-card-footer` container and then independently reconstruct cancel/back/confirm/submit buttons with different class strings and conditional layouts. `styles.css` already contains an `action-card-footer` helper, but structure, button order and pending/disabled semantics remain feature-owned and inconsistent.

## Relevant files and modules

- `MercurionWebNg/src/styles.css`
- `MercurionWebNg/src/app/components/action-components/create-collection/`
- `.../sensitive-data-change/`
- `.../profile-registry-edit/`
- `.../select-collection-then-route/`
- `.../bind-collections-to-molecule/`
- `.../add-molecules-to-collection/`
- canonical `Button` from `0059`

## In scope

- Add a stateless footer layout primitive for action/form flows.
- Define a canonical responsive order/layout for primary and secondary actions.
- Support pending and disabled state consistently.
- Migrate repeated action footers.
- Remove obsolete structural helper CSS where superseded.
- Add component and representative flow tests.

## Out of scope

- Action-card header/body shell (`0069`).
- Business-specific multistep state machines.
- Changing labels or action semantics.

## Decisions already made

- `ActionFooter` owns layout and visual hierarchy, not business logic.
- Actions are supplied as projected/typed button slots/configuration using the canonical Button.
- Pending state must prevent duplicate primary action while preserving an understandable UI.
- Responsive ordering is uniform unless a documented UX requirement requires an explicit variant.

## Requirements

1. Inventory repeated footer structures and classify primary/secondary/back/cancel patterns.
2. Implement a small API that can render/project primary and secondary action regions without importing feature services.
3. Define mobile and desktop ordering explicitly and test it.
4. Standardize pending/disabled presentation using `Button` rather than local class toggles.
5. Migrate all action-card/footer consumers that match the pattern.
6. Preserve multistep conditional visibility while moving only layout responsibility into the primitive.
7. Remove dead `action-card-footer` CSS or reduce it to design-system implementation detail.
8. Add tests for one-action, two-action, pending and disabled states.

## Acceptance criteria

- [ ] Repeated action/form footer layout is represented by `ActionFooter`.
- [ ] Primary/secondary ordering and responsive behaviour are consistent.
- [ ] Pending/disabled semantics use the canonical Button contract.
- [ ] Feature components no longer own duplicated footer layout classes.
- [ ] Existing flow behaviour remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused footer tests plus representative action-component tests, then the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, inspect at least three migrated action flows at mobile and desktop widths. Verify action order, wrapping, pending/disabled behaviour and keyboard focus order.

## Stop conditions

Mark `BLOCKED` if existing flows intentionally require incompatible primary/secondary ordering and the repository does not establish which pattern is canonical. Document the affected flows instead of adding an unbounded per-feature layout mode.

## Dependencies

- `0059-create-the-canonical-button-primitive.md`

## Implementation notes

Prefer content projection or a narrow typed action contract. Do not make `ActionFooter` aware of form models or specific action scopes.

## Execution notes

> Current status (2026-09-11): DONE on `feature/UI-003`, pending exact
> feature-SHA GitHub Actions validation and coordinator integration.

### Feature branch
`feature/UI-003`, based on `8ce5f198ce131ac9fbe8335693947850a0119e3d`.

### Preflight
- Verified clean `feature/UI-003` at the supplied base SHA before edits.
- Verified exact base CI run `34637950040` for
  `8ce5f198ce131ac9fbe8335693947850a0119e3d`: Classify validation, Ubuntu
  quality, Windows quality, and Required gate all succeeded.
- Confirmed no task-owned Angular, Nest, Tox21, or test watcher was active.
- Focused baseline checks: `npm run typecheck --workspace mercurion_web_ng`
  passed; the existing Angular suite completed `402 SUCCESS`.
- No local `npm ci` or `npm run ci:check` was run.

### Preflight remediation
The runtime preflight used the required direct startup order and separate live
handles: Tox21 from `../MercurionTox21` with `.venv\Scripts\python.exe -m
main`, Nest with `APP_ENV=development LOCAL_DUMMY_AUTH=false npm run
start:dev --workspace mercurion_web_node`, then Angular from `MercurionWebNg`
with `npm run start:dev`. After all three handles existed, nginx readiness
returned two consecutive complete `health=200 root=200` rounds. The first
Angular invocation was corrected to its declared `MercurionWebNg` working
directory before any HTTP request. All preflight processes were stopped and
verified absent before implementation.

### Summary
Added stateless `ActionFooterComponent` with projected secondary and primary
slots. Desktop layout keeps secondary actions on the left and primary actions
on the right; mobile layout stacks secondary before primary for consistent
keyboard order and wrapping. Migrated the repeated footer patterns in Create
Collection, Add Molecules, Bind Collections, Select Collection, Essential
Profile Registry Edit, and Sensitive Data Change. All migrated actions now use
the canonical `ButtonComponent` for neutral/primary styling, disabled state,
and loading state. Removed the superseded global `.action-card-footer` helper.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` passed.
- Focused Angular tests for ActionFooter and representative migrated flows:
  `10 SUCCESS` (ActionFooter, Create Collection, Add Molecules, Bind
  Collections, Select Collection, Essential Profile Registry Edit, and
  Sensitive Data Change).
- `npm run lint --workspace mercurion_web_ng` passed with `0 errors` (existing
  warnings only).
- `npm run build --workspace mercurion_web_ng` passed; existing bundle-budget,
  CommonJS, and unused-import warnings remained non-fatal.
- `git diff --check` passed and no obsolete `action-card-footer` consumer
  remains under `MercurionWebNg/src`.

### Full pre-merge CI-parity validation
The complete clean-install/aggregate gate was not run locally, per repository
policy. Exact base-SHA CI was green as recorded above; exact feature-SHA CI is
owned by the coordinator after the feature commit is pushed.

### Browser validation performed
Using the canonical persistent Chrome profile and only `http://localhost:8888`,
performed a fresh ordinary login after the final runtime restart and verified
the protected Dashboard welcome marker. With final Tox21, Nest, and Angular
processes alive and two readiness rounds complete:

- Add Molecules to Collection: at mobile viewport (`526x844` effective
  viewport), `Annulla` and disabled `Aggiungi` stacked at separate y positions;
  at desktop (`1280x900`), secondary was left and primary right on one row.
- Select Collection then Route: at mobile, `Annulla` preceded disabled
  `Continua` in the stacked footer; at desktop both were on one row with
  primary on the right. The live dialog showed the loading/disabled state
  during collection loading.
- Create Collection: at mobile, `Annulla` and disabled `Crea` stacked; at
  desktop they were aligned in the canonical secondary/primary order.

Accessibility snapshots and DOM focus-order inspection confirmed dialog close/
form controls precede the footer, with secondary action before primary action.
No data-changing action was submitted. All final runtime processes were
stopped by specific process ID and verified absent afterward.

### Commits
- `9ac71db6bc05dbfa68cf96d4aaa6e47d86c91e25` — scoped ActionFooter
  implementation and migrations, with Copilot coauthor trailer.
- A follow-up task-note/status commit records this execution evidence and the
  single `DONE` terminal outcome.

### Merge / CI
No merge was performed. The feature branch must be pushed and its exact SHA
validated by the coordinator before no-FF integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
