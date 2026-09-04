# 0041 - Derive route access and layout policy from route data

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY

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
No task branch or worker was created because hard prerequisites
`0027-unify-authenticated-session-selector.md` (`FE-005`) and
`0033-centralize-safe-post-auth-redirect-state.md` (`FE-011`) are both
`SKIPPED_DEPENDENCY`.

### Preflight
Not applicable; the task was skipped before implementation.

### Preflight remediation
_None._

### Summary
Skipped at the normal filename-order selection point. Both direct
prerequisites are terminal `SKIPPED_DEPENDENCY`; each transitively depends on
blocked `0026-create-canonical-angular-auth-state-store.md` (`FE-004`).

### Task-specific validation performed
No implementation or validation was performed.

### Full pre-merge CI-parity validation
Not applicable; no feature branch was created.

### Browser validation performed
Not applicable; the task was skipped before implementation.

### Commits
Only this task metadata was updated on `develop`.

### Merge / CI
No feature merge; skip metadata CI is required before continuing.

### Rollback
_Not applicable._

### Blocker / human decision required
No implementation blocker. Re-enable only after the hard dependency chain is
deliberately resolved in a new authorized session.