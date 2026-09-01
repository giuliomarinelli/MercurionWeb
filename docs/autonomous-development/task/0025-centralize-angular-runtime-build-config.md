# 0025 - Centralize Angular runtime and build configuration

- [ ] DONE
- [ ] BLOCKED

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

- [ ] Endpoint/capability/release consumers use one typed config API.
- [ ] `wsUrl`, beta/feedback state and release version are not independently hard-coded across feature consumers.
- [ ] All supported environments produce a valid application config.
- [ ] Config mapping is covered by tests.
- [ ] Angular builds succeed for development, testing, staging and production.
- [ ] No browser bundle receives secret values through the new configuration path.
- [ ] Existing route/access behaviour remains unchanged.

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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._