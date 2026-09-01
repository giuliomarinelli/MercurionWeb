# 0023 - Enforce Angular environment import boundaries

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Angular environment replacement deterministic by requiring all application code to import only `src/environments/environment.ts`, never an environment-specific implementation such as `environment.development.ts`.

Source: `FE-001` in Series `0001`.

## Context

`MercurionWebNg/angular.json` already defines Angular file replacements for development, testing and staging, with `environment.ts` acting as the production/default file. The audit found application files that bypass this mechanism by importing `environment.development` directly. Current examples include `AppComponent`, `SessionSyncService`, `RealtimeSocketService`, login/register/feedback UI and Turnstile/footer code.

Direct imports make a production/staging/testing build capable of silently receiving development configuration and undermine the meaning of the Angular build configuration.

## Relevant files and modules

- `MercurionWebNg/angular.json`
- `MercurionWebNg/src/environments/environment.ts`
- `MercurionWebNg/src/environments/environment.development.ts`
- `MercurionWebNg/src/environments/environment.testing.ts`
- `MercurionWebNg/src/environments/environment.staging.ts`
- `MercurionWebNg/src/app/app.component.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- all Angular imports matching `environment.*`
- Angular test/build configuration and the repository CI introduced by earlier tasks

## In scope

- Replace application imports of environment-specific files with imports of the canonical `environment` module.
- Verify all Angular build configurations still resolve their intended replacement.
- Add a deterministic static check that rejects future imports of environment-specific files from production application code.
- Cover source files, lazy-loaded code and tests where an environment-specific import could accidentally enter a real bundle.

## Out of scope

- Redesigning the environment object itself; that is handled by `0024` and `0025`.
- Moving route access policy out of environment files; later FE tasks own that work.
- Changing runtime URLs, feature semantics or environment values except where required to prove replacement correctness.
- Backend Nest configuration.

## Decisions already made

- `src/environments/environment.ts` is the only import target for Angular application consumers.
- Angular file replacement remains the build-time mechanism for environment-specific variants unless a later numbered task deliberately replaces it.
- The static rule must fail deterministically in local/CI validation rather than relying on code review.

## Requirements

1. Inventory every Angular import whose resolved path contains `environment.development`, `environment.testing`, `environment.staging` or another specific variant.
2. Replace each application import with the canonical `environment` import using the correct relative path.
3. Verify `angular.json` maps development, testing and staging to the intended files and leaves production/default on `environment.ts`.
4. Add a static repository check that fails if application code directly imports a specific environment variant.
5. Ensure the check does not prohibit the environment files themselves or test code that must import variants explicitly to validate their values.
6. Wire the check into an existing/new package or CI validation command without introducing a second competing lint stack solely for this rule.
7. Do not change the observable configuration semantics in this task.

## Acceptance criteria

- [ ] No production Angular application source imports an environment-specific file directly.
- [ ] Development, testing, staging and production builds resolve the intended environment implementation through Angular configuration.
- [ ] A deterministic static check fails on a deliberately introduced forbidden import and passes after it is removed.
- [ ] The check is included in the project/repository validation path used by CI.
- [ ] Angular build and affected tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg` run the repository's resulting static check plus representative builds for every configured environment. At minimum verify:

```text
npm run build
npm run build -- --configuration development
npm run build -- --configuration testing
npm run build -- --configuration staging
npm test -- --watch=false
```

If earlier workspace tasks expose equivalent root-workspace commands, those may be used instead, but validate the same configurations.

Search the final Angular source tree for imports of environment-specific modules and confirm the only allowed occurrences are declarations/config-validation fixtures.

## Browser validation

Not required. This task establishes build-time import resolution; browser behaviour is covered by later configuration/auth tasks.

## Stop conditions

Mark `BLOCKED` if the current Angular build configuration no longer uses file replacement because an earlier task intentionally introduced a different canonical configuration mechanism. In that case, document the new mechanism and update this task only with a human-approved replacement strategy rather than restoring obsolete architecture.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` should be `DONE` first if it changes the repository/workspace package-command topology.

## Implementation notes

Prefer a small deterministic import-boundary check that fits the existing toolchain. Do not add a broad new lint framework merely to satisfy one rule unless the repository has already adopted that framework by execution time.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._