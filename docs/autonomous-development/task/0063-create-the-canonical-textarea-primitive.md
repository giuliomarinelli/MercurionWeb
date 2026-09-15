# 0063 - Create the canonical Textarea primitive

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Introduce one canonical accessible textarea field with typed resize policy, optional character limit/count and consistent hint/error/disabled presentation, then remove duplicated textarea structure and counter logic from feature components.

Source: `UI-005` in Series `0001`.

## Context

Textarea controls and character counters are currently assembled locally in feature templates with divergent structure, spacing and error handling. This task builds on the common field semantics introduced by `0062` while keeping text-area-specific behaviour explicit.

## Relevant files and modules

- feature templates containing `<textarea>`
- action/help/feedback components using multiline text
- canonical field semantics from `0062`
- shared form validators and styles

## In scope

- Add a canonical textarea primitive compatible with Angular forms.
- Support label, hint, error, required, disabled and optional character count/limit.
- Define typed resize policy.
- Migrate application textarea usages.
- Remove feature-local counter/error/layout duplication.
- Add component/accessibility tests.

## Out of scope

- Rich-text/code editors.
- Product-specific content validation/copy.
- Search or select controls.

## Decisions already made

- Character counting is presentation derived from the current value; validation ownership remains with the form.
- The primitive does not silently truncate input unless an explicit native/configured limit requires it.
- Resize behaviour is a finite semantic option, not arbitrary CSS injection.
- Field accessibility semantics should reuse the canonical field contract from `0062` where practical.

## Requirements

1. Inventory all textarea/counter implementations and classify legitimate behavioural differences.
2. Implement a canonical textarea with deterministic label/described-by/error wiring.
3. Support typed resize modes and optional max-length/count display.
4. Make count output accessible without creating noisy live-region announcements for every keystroke.
5. Migrate all ordinary application textareas.
6. Remove obsolete feature-local counter/error wrappers.
7. Add tests for form propagation, max-length/count, disabled/invalid states and resize configuration.

## Acceptance criteria

- [ ] Ordinary application textareas use the canonical primitive.
- [ ] Label/hint/error/required/disabled semantics match canonical fields.
- [ ] Character limits/counts are consistent and testable.
- [ ] Resize policy is typed.
- [ ] No duplicated textarea counter markup remains for migrated controls.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run focused textarea/form tests, search for remaining ordinary raw textarea patterns, then canonical CI-parity validation.

## Browser validation

Through `http://localhost:8888`, verify representative multiline forms at desktop/mobile widths: focus, typing, counter, invalid state, resize policy and light/dark appearance.

## Stop conditions

Mark `BLOCKED` if a textarea is actually a domain-specific editor requiring behaviours not captured by the audit's normal textarea pattern. Do not force specialized editors into this primitive.

## Dependencies

- `0062-create-the-canonical-textfield-primitive.md`

## Implementation notes

If a reusable field-shell was introduced in `0062`, use it rather than reimplementing label/error wiring.

## Execution notes

### Feature branch
`feature/UI-005`, starting from supplied base
`3884c095aeab033f2ab3e6672cb7c7523b7aed9a`.

### Preflight
- Confirmed a clean `feature/UI-005` worktree, expected branch identity and
  exact base SHA.
- Confirmed exact base GitHub Actions CI run `34644729861` for
  `3884c095aeab033f2ab3e6672cb7c7523b7aed9a`: Classify validation, Ubuntu
  quality, Windows quality and `Required gate` all succeeded.
- Confirmed repository-local `commit.gpgSign=false` and
  `origin/develop` matched the supplied base.
- Confirmed no task-owned Angular, Nest, Tox21 or workspace watcher was active
  before either runtime phase.
- Unchanged-baseline checks passed:
  `npm run test:ci --workspace mercurion_web_ng -- --include=src/app/components/common/text-field/text-field.component.spec.ts`
  completed with 410 successful Angular specs (npm emitted its existing
  invalid `include` configuration warning), and
  `npm run typecheck --workspace mercurion_web_ng` passed.

### Implementation
- Added standalone `TextareaComponent` (`m-textarea`) with Angular forms
  ControlValueAccessor support, stable IDs, label/hint/error/required/disabled
  wiring, optional native max length and derived accessible character count.
- Added typed `TextareaResizeMode` values (`none`, `vertical`, `horizontal`,
  `both`) with deterministic CSS mapping and non-live count output.
- Migrated the custom molecule save notes field and feedback page textarea.
  The audit found exactly two ordinary application textareas; only the new
  primitive retains native `<textarea>` markup.
- Added focused accessibility, form propagation, count/limit, invalid,
  disabled and resize tests.

### Task-specific validation
- `npx ng test --watch=false --karma-config=karma.conf.js --include=src/app/components/common/textarea/textarea.component.spec.ts`
  passed: 4 specs.
- `npm run typecheck --workspace mercurion_web_ng` passed.
- Targeted ESLint passed with no errors; two existing-style warnings remain in
  the migrated overlay focus helpers.
- `npm run build --workspace mercurion_web_ng` passed. Existing bundle-budget
  and CommonJS warnings remained; no build error occurred.
- `git diff --check` passed.
- Raw textarea audit confirmed only the canonical primitive contains
  `<textarea>` markup.

### Browser validation performed
Using the dedicated Chrome DevTools MCP profile and only
`http://localhost:8888`:
- Pre-implementation capability preflight started Tox21, Nest and Angular in
  the required order, retained all three live execution handles, observed two
  consecutive complete `/health` + `/` readiness rounds, and performed a
  fresh ordinary login with the shared local test account through MCP
  `fill_form`; protected dashboard state was observed.
- Post-implementation validation repeated the required startup order and two
  complete readiness rounds, then performed a fresh ordinary login after
  logout and reached the protected dashboard.
- On `/feedback`, the canonical field exposed its associated label and
  multiline textbox semantics, accepted multiline keyboard input, and updated
  the accessible count from `0` to `39`.
- The field rendered at 390x844 and 1440x900; light and dark theme snapshots
  both showed the canonical field, and DOM inspection confirmed
  `resize: vertical` / `resize-y`.
- Invalid, disabled, reactive-form propagation and max-length/count behavior
  were verified by the focused component suite. No task-owned runtime process
  remained after validation.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are forbidden in
autonomous workers. Exact feature-SHA clean-install and aggregate CI evidence
is owned by GitHub Actions after the feature commit is pushed.

### Commits
- `ee6df94580f33c1139a8a8308520992ca614c302` (`feat(UI-005): add canonical
  textarea primitive`) contains the implementation and focused tests.
- This update records the validated terminal `DONE` state and execution
  evidence; the coordinator must observe the exact pushed feature-SHA
  `Required gate` before integration.

### Merge / CI
No merge or protected-branch operation was performed. The feature branch must
be pushed only after the task-specific commit, then exact feature-SHA CI must
be observed before integration.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
