# 0052 - Standardize modern Angular component APIs

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Normalize standalone production components on Angular's modern functional/signal component APIs for inputs, outputs, queries and dependency injection, removing the current mixture of decorator-era and modern patterns.

Source: `FE-030` in Series `0001`.

## Context

The audited codebase mixes `@Input`, `@Output` + `EventEmitter`, `@ViewChild` and constructor/decorator-era patterns with `inject`, signals, `model()` and newer APIs. Examples include floating-input, history, Ketcher, combo select/multi-select, file uploader and search input components. The mixed conventions increase lifecycle/nullability boilerplate and make shared-component contracts inconsistent.

## Relevant files and modules

- all standalone production components
- components using `@Input` / `@Output` / `EventEmitter`
- components using `@ViewChild` / query decorators
- components using constructor injection where `inject()` is appropriate
- Angular tests/templates consuming migrated APIs
- Angular lint/static architecture configuration

## In scope

- Migrate standalone component inputs to `input()` / `input.required()` where semantically appropriate.
- Use `model()` only for genuine two-way component state contracts.
- Migrate outputs to `output()` and queries to `viewChild` / `viewChildren` / related signal query APIs where supported.
- Standardize dependency injection on `inject()` for application components/services in the migration scope.
- Preserve aliases, requiredness and template API compatibility where possible.
- Add a static gate for deprecated/mixed APIs after migration, with narrow technical exceptions only.

## Out of scope

- Changing public component semantics merely to use a new syntax.
- Converting reactive forms into signal forms.
- Rewriting third-party Angular library source.
- Design-system consolidation owned by later UI tasks.

## Decisions already made

- Standalone application components use one modern API convention.
- `model()` is not a replacement for every input/output pair; it represents actual two-way state.
- Required inputs remain required and output/event semantics remain compatible.
- Query timing/lifecycle changes must be covered by tests rather than assumed equivalent.

## Requirements

1. Inventory decorator-based inputs, outputs and view/content queries in production standalone components.
2. Migrate input contracts while preserving defaults, aliases, transforms and requiredness.
3. Replace `EventEmitter` outputs with `output()` and update tests/call sites as needed.
4. Replace view/content query decorators with signal query APIs when supported by the current Angular version and semantics.
5. Replace component constructor injection with `inject()` unless constructor semantics are independently required.
6. Review setter-based `@Input` patterns and convert them to effects/computed state or explicit input transforms without introducing feedback loops.
7. Add tests for migrated required inputs, emitted outputs and query availability/lifecycle.
8. Add a static/lint rule preventing reintroduction of the legacy APIs in migrated production scope, with documented framework-required exceptions only.

## Acceptance criteria

- [ ] Standalone production components follow the canonical modern input/output/query/injection convention.
- [ ] `EventEmitter` is absent from migrated application component output contracts.
- [ ] Legacy query decorators are removed where signal-query APIs provide equivalent supported semantics.
- [ ] Input requiredness/default/alias behaviour remains compatible.
- [ ] Static validation prevents convention drift.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run component tests, template/typecheck/build, the new static convention gate and canonical CI-parity gate. Pay special attention to setter-input and view-query components such as history, Ketcher, search input and selection controls.

## Browser validation

Through `http://localhost:8888`, smoke-test migrated shared controls and routes that depend on them: forms, search, molecule editor/detail and action overlays. Verify inputs update, outputs fire once and focus/query-dependent behaviour still works.

## Stop conditions

Mark `BLOCKED` for a specific API only if the current Angular version/framework integration cannot express its required semantics with the target modern API. Document and narrowly allowlist that case instead of abandoning the repository-wide convention.

## Dependencies

- `0051-standardize-production-components-on-onpush-change-detection.md`

## Implementation notes

Prefer Angular-provided migrations where safe, followed by manual review. Do not convert a setter input mechanically if its side effects actually belong in a computed/effect or facade command.

## Execution notes

### Feature branch
`feature/FE-030`, created from
`7cbe65e00a5dd35187c0897819c5d083689a8547` and preserved for diagnosis.

### Preflight
Passed unchanged: no task-owned workspace processes were active; `npm ci` and
`npm run ci:check` both succeeded.

### Preflight remediation
_None._

### Summary
Blocked before implementation because the task worker was denied filesystem
write capability. The required component/API migration, task metadata update,
commit, and push could not be performed. No source files changed.

### Task-specific validation performed
Not run; the required implementation could not begin.

### Full pre-merge CI-parity validation
Not applicable; no implementation changes exist.

### Browser validation performed
Not applicable; the task was blocked before implementation.

### Commits
Blocked-status metadata only.

### Merge / CI
No feature merge. The preserved branch is frozen after its status commit.

### Rollback
_Not applicable._

### Blocker / human decision required
Required capability: permit repository file writes and Git commit/push
operations for this task in a new authorized session.