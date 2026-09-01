# 0057 - Create a typed route manifest

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create one typed route manifest as the source of truth for path construction, titles, access policy and navigation metadata, replacing replicated route/path/title strings throughout Angular.

Source: `FE-035` in Series `0001`.

## Context

`app.routes.ts` owns route declarations, while path strings such as `/login`, `/dashboard`, `/settings`, `/welcome`, status routes and molecule paths are also repeated across guards, components, services and navigation code. Task `0041` moves access/layout policy into route metadata; this task completes the model by giving route identity, paths/builders, titles and navigation metadata one typed source.

## Relevant files and modules

- `MercurionWebNg/src/app/app.routes.ts`
- route policy metadata introduced by `0041`
- `MercurionWebNg/src/app/services/path.service.ts`
- guard/navigation coordinator and redirect store
- header/sidenav/footer/navigation components
- components/services using hard-coded application path strings
- title metadata and dynamic-title routes

## In scope

- Define a typed manifest/registry for named application routes.
- Provide safe path builders for parameterized routes.
- Drive Angular `Routes` definitions or validate them from the manifest so path/title/access metadata cannot drift.
- Migrate internal navigation/link/path comparisons to manifest identifiers/builders.
- Represent navigation visibility/group/icon/label metadata only where current navigation needs it.
- Preserve component-managed dynamic titles where explicitly declared.
- Add static/type tests for uniqueness and route-builder correctness.

## Out of scope

- Product information-architecture redesign.
- Adding/removing routes except changes already authorized by prior tasks.
- Translating all UI copy.
- Replacing Angular Router.

## Decisions already made

- Route path, title, access policy and navigation metadata derive from one typed source.
- Parameterized routes expose builders; callers do not concatenate route strings manually.
- Route identity is semantic and stable even if a path changes later.
- Task `0041`'s route access/layout metadata becomes part of or is consumed by the manifest rather than duplicated.
- Component-managed titles remain an explicit manifest/route capability.

## Requirements

1. Inventory all routes and application path string consumers.
2. Define stable route IDs and typed descriptors for static and parameterized routes.
3. Represent canonical path segments/builders, title and access/layout metadata from `0041`.
4. Generate/build Angular route declarations from descriptors or add deterministic consistency checks if direct generation would reduce clarity.
5. Replace hard-coded router navigation targets/routerLinks/path comparisons with manifest references/builders across production code.
6. Make parameter requirements compile-time visible where practical (`molId`, `colId`, admin token, etc.).
7. Preserve wildcard/redirect and compatibility redirect semantics explicitly.
8. Add checks for duplicate route IDs/paths, missing required metadata and invalid parameter builders.
9. Ensure navigation components consume manifest navigation metadata rather than maintaining parallel path/title definitions.

## Acceptance criteria

- [ ] One typed manifest defines every application route identity/path/title/access policy.
- [ ] Internal navigation does not replicate literal canonical route paths where a manifest reference exists.
- [ ] Parameterized route construction uses typed builders.
- [ ] Header/sidenav/navigation metadata cannot drift independently from route definitions.
- [ ] `app.routes.ts` and manifest cannot disagree silently.
- [ ] Redirect/wildcard/dynamic-title behaviour remains compatible.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run manifest consistency/uniqueness tests, router tests, a repository search for migrated canonical path literals, and the canonical CI-parity gate. Remaining literals must be justified as external URLs/test fixtures/content rather than internal route ownership.

## Browser validation

Through `http://localhost:8888`, navigate via UI links and direct URLs across welcome/login/dashboard/settings, one molecule parameter route, one collection parameter route and status pages. Confirm titles, active navigation, guards and redirects remain correct.

## Stop conditions

Mark `BLOCKED` if two existing path aliases/routes have ambiguous semantic identity and consolidating them would change supported public navigation without a compatibility decision. Preserve explicit aliases until decided.

## Dependencies

- `0041-derive-route-access-and-layout-policy-from-route-data.md`
- `0044-make-programmatic-navigation-suppression-transaction-scoped.md`

## Implementation notes

Avoid a manifest that is only a bag of strings. The value is typed identity plus metadata/builders and deterministic agreement with Angular Router configuration.

## Execution notes

### Feature branch
_Not started._

### Preflight
_Not started._

### Preflight remediation
_None._

### Summary
_Not started._

### Task-specific validation performed
_Not started._

### Full pre-merge CI-parity validation
_Not started._

### Browser validation performed
_Not started._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._