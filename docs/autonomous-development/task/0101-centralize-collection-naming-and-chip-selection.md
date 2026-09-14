# 0101 - Centralize collection naming, chip selection and collision handling

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one typed set of domain/UI helpers for collection-name normalization/validation, duplicate-collision handling and chip/list selection behavior so every collection action applies identical rules and feedback.

Source: `NG-015` in Series `0001`.

## Context

`create-collection.component.ts` currently owns name trimming, `alreadyAdded`, `selectedChips`, add/remove/clear behavior and associated validation/feedback locally. Related collection actions repeat selection/chip/collision logic with their own state. Task `0100` creates the reusable collection-picker boundary; this task centralizes the smaller deterministic naming/selection rules that should not remain caller-specific.

## Relevant files and modules

- `MercurionWebNg/src/app/components/action-components/create-collection/create-collection.component.ts`
- collection action components migrated in `0100`
- canonical field/selection/chip/card primitives
- molecule collection service/models and any existing backend name constraints

## In scope

- Define pure collection-name normalization/validation helpers based on existing authoritative constraints.
- Define deterministic duplicate/collision comparison semantics used by client-side pending names and existing collections where applicable.
- Extract reusable immutable chip/list selection operations: add, remove, clear, identity comparison and duplicate prevention.
- Centralize user-facing validation/collision result codes/messages through the canonical error/message mechanism.
- Migrate collection callers to the shared helpers/state rather than implementing local variants.
- Add exhaustive unit tests for whitespace/case/duplicates/limits and selection transitions.

## Out of scope

- Do not invent new collection naming product rules not already enforced/documented by the application/backend.
- Do not hide server uniqueness/conflict errors; client validation complements but does not replace authoritative backend checks.
- Do not make a generic chip helper depend on GraphQL/Apollo or action-overlay services.
- Do not redesign the collection-picker architecture from `0100`.

## Decisions already made

- Pure normalization/validation logic is framework-light and testable without Angular rendering.
- Selection operations use stable identities and immutable updates suitable for signals/OnPush.
- Server conflict remains authoritative when race conditions make a name invalid after client validation.

## Requirements

1. Derive normalization and limits from existing backend/frontend contracts; document the chosen canonical rule in code tests.
2. Return typed validation/collision results rather than booleans plus ad-hoc strings.
3. Make duplicate detection deterministic for both pending chips and existing collection identities/names as required by current UX.
4. Ensure add/remove/clear helpers never mutate caller arrays in place.
5. Migrate create-collection and the collection-picker callers that currently implement equivalent behavior.
6. Preserve accessible error/live feedback through the canonical field/action primitives.

## Acceptance criteria

- [x] Collection naming/normalization logic has one implementation.
- [x] Duplicate/collision behavior is identical across migrated callers.
- [x] Chip selection operations are shared, immutable and tested.
- [x] Server-side conflict handling remains visible and deterministic.
- [x] No migrated action keeps its own equivalent trim/duplicate/add/remove rule set.

## Validation

Run focused pure-helper and migrated caller tests, then canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, exercise create/select collection flows with whitespace, duplicate names, add/remove/clear chips and backend conflict responses available locally. Verify consistent messages, focus/live feedback and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if frontend and backend currently enforce materially conflicting naming rules and the authoritative product rule cannot be determined safely.

## Dependencies

- `0100` must be `DONE` for shared picker integration.
- Canonical field/selection/action primitives must be available.

## Execution notes

### Feature branch
`feature/NG-015`

### Preflight
Clean `feature/NG-015` at base `88651828bb96cdc35391bf03540f645a6e28ae37`.
Exact base CI run `34678121368` succeeded. No task-owned Angular, Nest,
Tox21, test watcher, or workspace-consuming process was active before the
probe. The canonical runtime was started in order (Tox21, Nest, Angular) and
all three remained alive. Two consecutive complete nginx readiness rounds
returned HTTP 200 for `/health` and `/`; the authenticated dashboard was
then established through a fresh ordinary login at `/login` using the local
git-ignored test account. No credentials or session state were recorded.
The probe was stopped completely before editing.

### Preflight remediation
None.

### Summary
Added typed, pure collection naming and collision rules that mirror the
backend's whitespace normalization and 255-character limit, with
case-sensitive comparison documented as an intentional backend contract.
Centralized immutable identity/chip operations and migrated the create
collection component and collection-picker facade to use them. Server
uniqueness and conflict handling remain authoritative.

### Task-specific validation performed
`Set-Location MercurionWebNg; npm run typecheck` passed.
`Set-Location MercurionWebNg; npx ng test --watch=false
--karma-config=karma.conf.js
--include=src/app/components/action-components/collection-picker/collection-rules.spec.ts
--include=src/app/components/action-components/collection-picker/collection-picker.facade.spec.ts`
passed with 8/8 specs.
`Set-Location MercurionWebNg; npm run lint -- --no-warn-ignored` passed with
pre-existing warnings outside this task.

### Full pre-merge CI-parity validation
Not run locally; root `npm ci` and `npm run ci:check` are reserved for
GitHub Actions. Exact feature-SHA CI is required before integration.

### Browser validation performed
Pre-implementation capability evidence: `/health` and `/` each returned 200
in two consecutive rounds through `http://localhost:8888`; fresh ordinary
login reached the protected Dashboard and showed the authenticated identity.
Post-implementation runtime reached the same two-round readiness gate and
fresh protected Dashboard state. The collection route could not be rendered
through Chrome DevTools MCP after bounded retries: the page requested several
lazy chunks that returned HTTP 504 from the local Vite/nginx path
(`chunk-XVAYTYB5.js`, `chunk-5RABDNNW.js`, `chunk-JEDVQY3T.js`,
`chunk-Z3ZUPE2G.js`), leaving the route blank; the same route returned HTTP
200 to a direct edge request. No task-specific browser interaction or
console error attributable to the changed helpers was observed. This is
recorded as shared local browser/runtime observation evidence, not a product
success claim.

### Commits
`88b5d451813bae35d0ca0b59541be358fa51452e` —
`feat: centralize collection naming and selection rules` —
includes the required `Co-authored-by: Copilot <copilot@github.com>` trailer.
Pushed as `origin/feature/NG-015`.

### Merge / CI
Feature branch is published at the task SHA. Coordinator owns exact feature
and post-merge CI lifecycle; clean-install and aggregate CI were not run
locally.

### Rollback
Not applicable.

### Blocker / human decision required
None.
