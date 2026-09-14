# 0057 - Create a typed route manifest

- [x] DONE
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
`feature/FE-035`, based on `85dce97bc4d68186a8743460b6390767030a9732`.

### Preflight
- Confirmed the clean `feature/FE-035` branch exactly matched the supplied
  base SHA and the exact base SHA had successful GitHub Actions CI run
  `34553337050`. No local `npm ci` or `npm run ci:check` was run.
- Process inventory found no task-owned Angular, Nest, Tox21, or watcher
  process.
- Completed the unchanged browser capability preflight in the required order:
  Tox21 from `../MercurionTox21`, Nest from the workspace root, then Angular
  from `MercurionWebNg`, with live attached sessions. The edge produced two
  consecutive complete `200/200` readiness rounds.
- Using only `http://localhost:8888` and the dedicated browser profile,
  performed a fresh ordinary login with the local real test account and
  proved protected dashboard state (authenticated identity and workspace
  counts). No dummy-auth route was used. All preflight processes were stopped
  before editing.

### Summary
Added `route-manifest.ts` as the typed registry for every current Angular
route identity, canonical path, title, access/shell policy, navigation
metadata, static builder, parameterized builder, duplicate checks, and
required-parameter validation. Rebuilt `app.routes.ts` from descriptors while
preserving wildcard and compatibility redirects, MFA aliases, guards, and
component-managed titles. Migrated header, sidenav, auth guard, and auth
redirect navigation/path comparisons to manifest builders. The initial route
consumer inventory used `git grep` over Angular navigation, redirects,
router-link, title, and path consumers.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Focused Angular route command using `npx ng test --watch=false
  --karma-config=karma.conf.js` with the manifest, route-policy, and
  auth-redirect specs — 9 tests passed.
- `npm run lint --workspace mercurion_web_ng` — exit 0; existing warnings only.
- Added manifest uniqueness, encoded parameter-builder, and missing-parameter
  tests.

### Full pre-merge CI-parity validation
Not run locally because clean-install and aggregate `npm ci` /
`npm run ci:check` validation is reserved for GitHub Actions. Feature-SHA CI
is coordinator-owned after push.

### Browser validation performed
Restarted the same three canonical processes in the required order and again
obtained two complete readiness rounds. Fresh login reached the protected
dashboard. UI navigation reached settings and preserved the authenticated
shell. Direct public status routes reached `/403-forbidden` with title
`403 Accesso negato` and `/404-not-found` with title `404 Pagina non trovata`.
Parameterized molecule and collection URLs were exercised through the
canonical origin; guards/redirects remained compatible. All task-owned
processes were stopped afterward and the local process inventory was clean.

### Commits
Task implementation and metadata are pending the feature commit on
`feature/FE-035`; no protected branch was modified.

### Merge / CI
Not merged. Exact feature-SHA CI is coordinator-owned after publication.

### Rollback
Not applicable.

### Blocker / human decision required
None.