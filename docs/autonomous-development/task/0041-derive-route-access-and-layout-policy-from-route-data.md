# 0041 - Derive route access and layout policy from route data

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Angular route metadata the single authority for access and shell/layout policy so `AppComponent`, guards and environment files no longer maintain parallel public/protected/logged-out-only path lists.

Source: `FE-019` in Series `0001`.

## Context

`app.routes.ts` already owns route definitions and uses `AuthGuard` on protected routes, but `AppComponent` independently classifies URLs through `environment.PUBLIC_EXACT_PATHS`, `PUBLIC_PREFIXES` and `LOGGED_OUT_ONLY_PATHS`. Those arrays are duplicated in every environment file and are then combined with special-case checks for login, welcome, 403 and 404. This lets route configuration and shell/auth policy drift apart.

## Relevant files and modules

- `MercurionWebNg/src/app/app.routes.ts`
- `MercurionWebNg/src/app/app.component.ts`
- `MercurionWebNg/src/app/guards/auth.guard.ts`
- `MercurionWebNg/src/environments/environment*.ts`
- canonical auth store/selector from `0026` / `0027`
- redirect-intent handling from `0033`

## In scope

- Define typed route metadata for access and shell/layout policy.
- Annotate all current routes with the required policy, directly or through typed route helpers.
- Make guard/shell decisions derive from the matched route metadata instead of URL-string lists.
- Remove `PUBLIC_EXACT_PATHS`, `PUBLIC_PREFIXES` and `LOGGED_OUT_ONLY_PATHS` from environment configuration when no consumer remains.
- Preserve current reachable/public/protected behaviour unless another task explicitly changes it.
- Add route-policy tests covering static and parameterized routes.

## Out of scope

- Full path/title/navigation-manifest centralization; task `0057` owns that broader route manifest.
- Authentication-state redesign.
- New routes or product navigation changes.
- Reworking post-login redirect sanitization.

## Decisions already made

- Route access and shell/layout policy belong to route metadata, not environment files.
- Access policy and layout policy are distinct concepts; a public route may still use a different shell.
- Parameterized routes must be classified by the route definition, never by prefix string matching in application code.
- Existing route behaviour is the migration baseline.

## Requirements

1. Define a typed route-data contract able to express at least public, authenticated and logged-out-only access plus the existing shell/layout distinctions.
2. Inventory every current route, including login/MFA, welcome, molecule detail, recovery/activation/OAuth, status pages and admin-maintenance callback.
3. Annotate each route deterministically and make `AuthGuard`/equivalent access logic consume the canonical metadata/selector.
4. Replace `AppComponent` public/prefix/logged-out-only sets and special path-policy duplication with resolved route metadata.
5. Ensure wildcard/redirect routes and parameterized routes resolve policy without ad-hoc prefix matching.
6. Remove duplicated environment policy arrays and related config typing/tests.
7. Add tests proving a route cannot silently become public/protected merely because an environment list was forgotten.

## Acceptance criteria

- [ ] Route definitions are the only source of access and shell/layout policy.
- [ ] Environment files contain no public/protected/logged-out-only route arrays.
- [ ] `AppComponent` does not classify route access through path sets/prefix arrays.
- [ ] Guards and shell policy agree for all current routes, including parameterized routes.
- [ ] Public, protected and logged-out-only route tests pass.
- [ ] Angular build/tests and canonical CI gates pass.

## Validation

Run focused router/guard/shell tests plus the canonical CI-parity gate. Include table-driven tests for every route definition and at least one parameterized URL per parameterized route.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`, verify representative routes under the available local auth state:

1. `/welcome` and another public route render without protected-shell misclassification.
2. An anonymous visit to a protected route follows the existing safe redirect flow.
3. A logged-in visit to a logged-out-only auth route follows the existing authenticated redirect behaviour.
4. A parameterized molecule-detail route receives the policy declared by its route definition.
5. 403/404 layout behaviour remains correct.

## Stop conditions

Mark `BLOCKED` if two current consumers intentionally apply incompatible access policy to the same route and repository evidence does not establish which behaviour is authoritative. Document the conflict rather than choosing a weaker access rule.

## Dependencies

- `0027-unify-authenticated-session-selector.md`
- `0033-centralize-safe-post-auth-redirect-state.md`

## Implementation notes

Keep the metadata small and semantic. Do not build the full route manifest here; task `0057` will later make route paths/titles/navigation metadata share the same typed source.

## Execution notes

### Feature branch
`feature/FE-019`, based on `2bd843a28e237e214764c379c9b9131b25a33a64`.
The branch was clean and exactly at the supplied base before implementation.

### Preflight
- Exact base SHA GitHub Actions run `34536865860` was successful, including
  Windows and Ubuntu quality jobs and the stable `Required gate`.
- No task-owned Angular, Nest, Tox21, or test-watcher process was active before
  the runtime probe.
- The canonical runtime was started in the required order in separate sessions:
  `../MercurionTox21/.venv/Scripts/python.exe -m main` with `PYTHONUTF8=1`,
  `npm run start:dev --workspace mercurion_web_node` with
  `APP_ENV=development LOCAL_DUMMY_AUTH=false`, then
  `MercurionWebNg: npm run start:dev`.
- Both `http://localhost:8888/` and `http://localhost:8888/health` returned
  HTTP 200 in two consecutive complete readiness rounds after the initial
  HTTP 502 upstream-wait period. Tox21 connected through NATS, Nest reported
  zero compile errors and listened on port 8099, and Angular completed its
  development build on port 3498.
- The dedicated persistent Chrome profile opened `/welcome`, then performed a
  fresh ordinary login through `/login` using the local development test
  account. The protected dashboard rendered with the server-backed user state.
  No dummy-auth route, production origin, isolated profile, or credential value
  was used or recorded. All probe processes were stopped before editing.

### Summary
Added a typed `RoutePolicy` contract and `defineRoute` helper. Every current
route, including redirects, wildcard, parameterized molecule, recovery,
activation, OAuth, status, and maintenance routes now declares access and shell
metadata. `AppComponent`, `AuthGuard`, and `SessionSyncService` resolve the
matched route metadata; URL prefix/exact-set classification was removed.
Environment route policy arrays and their configuration tests were removed.

### Task-specific validation performed
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- Direct focused Angular Karma command using `ng test --watch=false` with
  `route-policy.spec.ts`, `local-dummy-auth.service.spec.ts`, and
  `environment.config.spec.ts` — 11 tests passed.
- Focused `app.component.spec.ts` and `auth.guard.spec.ts` — 2 tests passed.
- `npm run lint --workspace mercurion_web_ng` — passed (pre-existing warnings
  only).
- `npm run build --workspace mercurion_web_ng` — passed; only existing bundle
  budget/CommonJS warnings were reported.
- `git diff --check` — passed; source search found no remaining
  `PUBLIC_EXACT_PATHS`, `PUBLIC_PREFIXES`, or `LOGGED_OUT_ONLY_PATHS`
  consumers.

### Browser validation performed
After restarting the canonical runtime in Tox21/Nest/Angular order and again
obtaining two consecutive HTTP 200 readiness rounds through nginx:
- Anonymous `/welcome` rendered the landing shell without the protected header,
  sidebar, or workspace shell.
- Anonymous `/settings` followed the existing safe redirect flow to
  `/login?redirect_to=%2Fsettings`.
- A fresh ordinary login through `/login` rendered the protected dashboard and
  server-backed user identity.
- Authenticated `/molecules/detail/chembl-123` stayed on the parameterized
  route and rendered the standard authenticated shell.
- `/403-forbidden` rendered only the minimal status page; an unknown URL
  redirected to `/404-not-found`, which also rendered the minimal status page.
- `/privacy` rendered the declared standard public shell.
All task-owned runtime processes, including the temporary local credential
bridge used only to transfer the ignored local account into the browser, were
stopped after evidence capture.

### Full pre-merge CI-parity validation
The unchanged base evidence was green as recorded above. Local sessions did not
run `npm ci` or `npm run ci:check`. Exact feature-SHA run
`34539174691` for `3f8270f5700928fdc137e8779f1f49bcb7d1b0a8` failed its
Windows `Validate autonomous control plane` step before task quality gates:
`docs/autonomous-development/LAUNCH-2026-09-10-overweek-v6.md: launch must
forbid HTTP before starting Tox21, Nest and Angular`. Ubuntu quality passed,
but the stable `Required gate` failed. The diagnostic is outside the Angular
task scope and was not repaired on this branch.

### Commits
- `a89543c6635c656b7ee276293ef11ed1d7923ac6` — `feat(angular): derive
  access and shell policy from routes`
- This task-status and execution-notes update is the follow-up feature-branch
  commit.

### Merge / CI
No merge or post-merge action was performed by the worker. The feature branch
is preserved and frozen pending human-authorized repair or disposition of the
control-plane validation failure.

### Rollback
_Not applicable._

### Blocker / human decision required
Human decision required: repair or explicitly disposition the unrelated
prepared-launch/control-plane baseline failure, then authorize a fresh attempt.
The task implementation itself passed all focused local and browser validation.