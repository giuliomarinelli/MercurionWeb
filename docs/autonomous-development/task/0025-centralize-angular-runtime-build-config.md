# 0025 - Centralize Angular runtime and build configuration

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove duplicated URL, beta/feedback and release-version decisions from raw Angular environment objects and expose one canonical, typed application configuration boundary to feature code.

Source: `FE-003` in Series `0001`.

## Context

The current environment files repeat `wsUrl`, `beta`, `feedbackEnv`, `version`, Turnstile configuration and route-policy arrays. Consumers read `environment` directly in multiple components/services. After `0023` and `0024`, environment selection and identity are reliable, but feature code still depends on an implementation object whose responsibilities are mixed.

This task specifically owns endpoint/capability/version configuration. Route access metadata is intentionally left to later route-policy/manifest tasks.

## Relevant files and modules

- `MercurionWebNg/src/environments/*`
- `MercurionWebNg/src/app/app.config.ts`
- consumers of `environment.wsUrl`, `environment.beta`, `environment.feedbackEnv`, `environment.version`, `environment.CLOUDFLARE_SITE_KEY`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- feedback/footer/Turnstile/application-shell consumers
- release/version client integration, if already present

## In scope

- Introduce one typed Angular application-config API/token/service for endpoint and capability/version reads.
- Derive environment-specific values from the canonical environment identity/config established by `0024`.
- Replace direct feature-level reads of duplicated endpoint/capability/version fields with the canonical configuration API.
- Ensure release version has one source of truth appropriate to the existing build/release process.
- Keep the configuration testable without mutating global environment modules.

## Out of scope

- Public/protected route lists and navigation metadata (`FE-019`, `FE-035`).
- Auth/session state (`FE-004+`).
- A general remote feature-flag service or third-party configuration platform.
- Secret management: browser configuration remains public by definition and must not contain secrets.
- Backend configuration refactors.

## Decisions already made

- Feature code should depend on a typed application configuration boundary rather than scattered raw environment fields.
- Browser-visible values are configuration, never secrets.
- Environment identity remains canonical from `0024`.
- Do not introduce network-fetched runtime configuration unless the repository/project already requires deploy-time mutation independently of a build; build-time configuration is acceptable for current values.

## Requirements

1. Inventory direct Angular reads of URL, beta, feedback environment, release version and public integration configuration.
2. Define a minimal typed application config model grouped by responsibility where useful (for example endpoints, capabilities, release, public integrations).
3. Provide the config through Angular DI or an equivalently testable stable API.
4. Derive values from the selected environment/build configuration rather than copy-pasting equivalent constants across feature code.
5. Replace direct consumer access with the canonical config boundary.
6. Establish one source for the displayed/reported release version consistent with the repository release process; do not maintain unrelated hard-coded versions in multiple environment variants.
7. Add unit tests covering environment-to-app-config mapping and representative consumers.
8. Do not migrate route access arrays in this task; leave them intact until their dedicated task unless moving them is mechanically required and does not preempt the route-policy design.

## Acceptance criteria

- [x] Endpoint/capability/release consumers use one typed config API.
- [x] `wsUrl`, beta/feedback state and release version are not independently hard-coded across feature consumers.
- [x] All supported environments produce a valid application config.
- [x] Config mapping is covered by tests.
- [x] Angular builds succeed for development, testing, staging and production.
- [x] No browser bundle receives secret values through the new configuration path.
- [x] Existing route/access behaviour remains unchanged.

## Validation

Run Angular unit tests and builds for all configured environments:

```text
npm test -- --watch=false
npm run build
npm run build -- --configuration development
npm run build -- --configuration testing
npm run build -- --configuration staging
```

Search application consumers for direct access to the migrated raw fields and confirm only the canonical configuration boundary/environment adapter owns them.

## Browser validation

Use Chrome DevTools MCP through `http://localhost:8888` for one development smoke check after the refactor:

1. Load the application through nginx.
2. Confirm the frontend boots without uncaught configuration errors.
3. Verify the Socket.IO connection still targets the same-origin `/socket.io` path.
4. Verify representative version/beta/feedback UI, when visible in development, reflects the selected development configuration.

This is a smoke check; build/config tests remain the primary evidence.

## Stop conditions

Mark `BLOCKED` if choosing a single release-version source requires a product/release-process decision not represented in repository code or prior tasks. Document the competing sources and required decision instead of silently selecting one.

## Dependencies

- `0023-enforce-angular-environment-import-boundaries.md`
- `0024-enforce-typed-angular-environment-config.md`

## Implementation notes

Keep the boundary intentionally small. This task should reduce configuration coupling, not create a global dumping-ground service. Route manifest, auth state and theme state have separate owners in later tasks.

## Execution notes

### Summary

Introduced `MercurionWebNg/src/app/config/app-config.ts`, a minimal typed Angular DI
configuration boundary (`AppConfig` + `APP_CONFIG` injection token with a tree-shakable
root factory). `createAppConfig(environment)` derives four responsibility groups from the
selected build environment:

- `endpoints`: same-origin realtime URL `/` and Socket.IO path `/socket.io`;
- `capabilities`: `beta` (true for every non-production environment) and `feedbackEnv`
  (`prod` for production, `staging` otherwise);
- `release`: one version derived from the single `RELEASE_BASE_VERSION` source;
- `integrations`: the public Turnstile site key taken from the environment.

`wsUrl`, `beta`, `feedbackEnv` and `version` were removed from `EnvironmentConfig` and from
all four environment variants, so no duplicated endpoint/capability/version constants remain
in the environment files. Environment identity (`name`, `production`, `testing`), route
arrays, `CLOUDFLARE_SITE_KEY` and `logoSrc` are unchanged; route/access metadata was
deliberately left to `FE-019`/`FE-035`.

Migrated consumers:

- `RealtimeSocketService` now reads `endpoints.realtimeUrl` / `endpoints.realtimePath`
  (the socket path was previously hard-coded in the service);
- `HeaderComponent` reads `capabilities.beta`;
- `FeedbackPageComponent` reads `capabilities.feedbackEnv` and `release.version`;
- `TurnstileComponent` reads `integrations.turnstileSiteKey`.

Release-version decision: `MercurionWebNg/package.json` (`1.0.0`) is the only version
manifest in the repository and is now the single source. Environment variants no longer
carry independent strings; the channel qualifier is derived from the environment name
(`development` -> `1.0.0d`, `testing` -> `1.0.0i`, `staging` -> `1.0.0-beta`,
`production` -> `1.0.0`). Development, testing and production keep their previous displayed
values; only staging changes from the unrelated hard-coded `1.0-beta-1` to the derived
`1.0.0-beta`, which is exactly the duplicated-version debt this recipe removes. No
product/release-process decision beyond repository code was required, so the stop condition
did not apply.

`resolveJsonModule` was enabled in `MercurionWebNg/tsconfig.json` so the unit test can assert
that `RELEASE_BASE_VERSION` equals the package manifest version. The manifest is imported by
the spec only; the production bundle contains no manifest content (`devDependencies` absent
from `dist`).

### Validation performed

Task-start preflight (unchanged branch, no workspace-consuming process running):

- `npm ci` (repository root) - success;
- `npm run ci:check` (repository root) - success.

Task-specific validation:

- `npx tsc --noEmit -p tsconfig.app.json` (MercurionWebNg) - success;
- `npx eslint` on all changed Angular files - 0 errors (pre-existing warnings only);
- `npm run test:ci` (MercurionWebNg) - 185 of 185 specs pass, including the new
  `src/app/config/app-config.spec.ts` (environment-to-app-config mapping for all four
  environments, release-version single-source parity with `package.json`, frozen config
  groups, DI provision, absence of secret-looking values, and a `RealtimeSocketService`
  consumer test asserting the configured Socket.IO path);
- `npx ng build --configuration production|development|testing|staging` - all four succeed;
- repository-wide search for `environment.wsUrl|beta|feedbackEnv|version|CLOUDFLARE_SITE_KEY`
  under `src/app` returns no matches.

Final pre-integration CI-parity gate (all task-owned runtime processes stopped first):

- `npm ci` (repository root) - success;
- `npm run ci:check` (repository root) - success.

### Browser validation performed

Canonical runtime started after the initial preflight: Tox21
(`.venv\Scripts\python.exe -m main`), Nest (`npm run start:dev`), Angular
(`npm run start:dev`). Browser origin: `http://localhost:8888` (nginx development edge),
Chrome DevTools MCP, no production credentials or data.

- `http://localhost:8888/` loads through nginx and the SPA boots (redirect to
  `/welcome`, HTTP 200 from the edge).
- Console contains no uncaught configuration errors; the only entries are a lazy-image
  sizing hint and the Socket.IO handshake failure described below.
- Socket.IO targets the same-origin path exactly as configured:
  `ws://localhost:8888/socket.io/?EIO=4&transport=websocket`.
- The development beta capability is visible in the header (`Beta` badge), consistent with
  `capabilities.beta === true` for the development configuration. The release version is not
  rendered in the UI; it is sent as `clientVersion` in the feedback DTO and is covered by
  unit tests.

Known local limitation, not caused by this task: `MercurionWebNode` cannot boot on this
host because no `.env` is present, so the Nest upstream returns 502 through nginx. The
Socket.IO handshake therefore fails at the upstream, which does not affect the evidence
required here: the client endpoint/path configuration is observable in the request URL and
is produced by the new configuration boundary. No credentials were invented or supplied.

### Changed files

- `MercurionWebNg/src/app/config/app-config.ts` (new)
- `MercurionWebNg/src/app/config/app-config.spec.ts` (new)
- `MercurionWebNg/src/environments/environment.config.ts`
- `MercurionWebNg/src/environments/environment.ts`
- `MercurionWebNg/src/environments/environment.development.ts`
- `MercurionWebNg/src/environments/environment.testing.ts`
- `MercurionWebNg/src/environments/environment.staging.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/components/common/header/header.component.ts`
- `MercurionWebNg/src/app/components/common/turnstile/turnstile.component.ts`
- `MercurionWebNg/src/app/pages/feedback/feedback.page.component.ts`
- `MercurionWebNg/tsconfig.json`
- `docs/autonomous-development/task/0025-centralize-angular-runtime-build-config.md`

### Blocker / human decision required

_None._

