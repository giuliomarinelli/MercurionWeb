# 0118 - Give every core Nest provider a single owner

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make every stateful/core Nest provider owned and declared by exactly one module so the application context contains one intentional provider instance and consumers import that owner instead of redeclaring the class.

Source: `BE-004` in Series `0001`.

## Context

`AppModule` currently declares `JwtToolsService`, `SessionService`, `JwtService` and `ResponseService` directly even though `AuthModule` also declares the same providers; `AuthModule` additionally redeclares `RedisService` while importing `RedisModule`. This creates ambiguous provider ownership and can produce multiple instances/lifecycles. Task `0115` establishes module direction; this task makes DI ownership explicit before the larger service decompositions.

## Relevant files and modules

- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/app_modules/auth/auth.module.ts`
- `MercurionWebNode/src/app_modules/redis/redis.module.ts`
- modules declaring/exporting `JwtToolsService`, `SessionService`, `JwtService`, `ResponseService`, `RedisService`
- global guard registration and module-compilation specs

## In scope

- Inventory duplicate provider declarations across production modules.
- Assign exactly one owner module to each core/stateful provider.
- Remove duplicate class-provider declarations from consumer modules/root module.
- Export narrow provider tokens/services from the owner only where genuinely needed.
- Update `APP_GUARD` and other global registrations to resolve dependencies through owner imports.
- Add a DI ownership test/static gate that detects duplicate production provider declarations for governed providers.

## Out of scope

- Do not merge all core providers into a giant global module.
- Do not make feature modules global merely to avoid imports.
- Do not yet split `SessionService`; task `0124` owns its domain/repository decomposition.
- Do not change request/singleton scope unless current semantics demonstrably require it.

## Decisions already made

- A provider class/token has one production owner.
- Consumers import the owner module and request the exported public token; they never redeclare a foreign provider class.
- Global modules are used only for capabilities that are truly application-global and remain explicitly owned.

## Requirements

1. Produce a duplicate-provider inventory from all production `@Module()` metadata.
2. Assign owners for at least JwtTools, Session, JwtService, ResponseService and RedisService based on responsibility.
3. Remove duplicate declarations from `AppModule`, `AuthModule` and other consumers.
4. Ensure module imports/exports expose only required public providers.
5. Add tests that resolve each governed provider from representative consumers and prove a single application-context instance where singleton semantics apply.
6. Add a static check preventing duplicate governed provider declarations.

## Acceptance criteria

- [ ] Each governed provider is declared by exactly one production module.
- [ ] `AppModule` does not redeclare feature-owned auth/session providers.
- [ ] `AuthModule` does not redeclare Redis infrastructure owned by `RedisModule`.
- [ ] Representative consumers resolve the same intended singleton instance.
- [ ] A deterministic gate detects a temporary duplicate declaration.

## Validation

Run affected module-compilation/DI tests, architecture checks, Nest build, full tests/E2E and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if two existing consumers demonstrably depend on separate instances of a provider and the intended lifecycle cannot be resolved from current behaviour without an architecture/security decision.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` must be `DONE`.
- `0116-separate-identity-token-and-authorization-services.md` should be `DONE` before finalizing auth provider ownership.

## Execution notes

### Feature branch
`feature/BE-004`, created from green `develop` SHA
`ee1f644fb2a764f0081b3919f0a2873c372c6bdb`.
### Preflight
- Confirmed the clean local branch was exactly `feature/BE-004` at the supplied
  base SHA, with no remote feature ref and no commits ahead of the base.
- Confirmed no Angular, Nest, Tox21, or test watcher process was active.
- Confirmed GitHub Actions run
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34686704819`
  succeeded for the exact base SHA with successful Windows and Ubuntu `Quality`
  jobs and the stable `Required gate`.
- Confirmed prerequisite tasks 0115 and 0116 are `DONE`.
- Focused unchanged checks passed:
  - `npm run ci:nest:architecture`
  - `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath src/app.module.spec.ts src/app_modules/auth/auth.module.spec.ts src/app_modules/redis/redis.module.spec.ts src/app_modules/socket.io/socket.io.module.spec.ts`
    (4 suites, 4 tests)
  - `npm run typecheck --workspace mercurion_web_node`
### Preflight remediation
_None._
### Summary
- Assigned auth ownership of `GlobalGuard`, `JwtService`, `JwtToolsService`, and
  `SessionService`; Redis ownership of `RedisService`; and a new narrow
  `ResponseModule` ownership of `ResponseService`.
- Removed duplicate governed providers from `AppModule`, `AuthModule`,
  `AdminModule`, and `SSO_Module`; consumers now import their owner modules.
- Registered the global guard as `APP_GUARD` through `useExisting`, so the
  Auth-owned `GlobalGuard` instance is reused instead of constructed again.
- Added a deterministic production-module ownership inventory/gate and a
  negative test that injects a temporary duplicate declaration.
- Added DI coverage that compiles the production owner modules with controlled
  infrastructure dependencies and verifies representative consumers receive
  identical singleton instances.
### Task-specific validation performed
- `node scripts/check-nest-provider-ownership.mjs --root=MercurionWebNode --json`
  reported one expected owner for all six governed providers, no duplicates,
  and no violations.
- `npm run ci:nest:architecture` passed: 22 production modules and 8
  configuration files were acyclic; the existing cycle negative test passed;
  all six governed providers had one owner; and the duplicate-provider negative
  test passed.
- Focused Jest command passed 5 suites / 7 tests:
  `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath src/provider-ownership.spec.ts src/app.module.spec.ts src/app_modules/auth/auth.module.spec.ts src/app_modules/redis/redis.module.spec.ts src/app_modules/socket.io/socket.io.module.spec.ts`.
- Final production-owner DI test passed 1 suite / 3 tests:
  `npm test --workspace mercurion_web_node -- --runInBand --runTestsByPath src/provider-ownership.spec.ts`.
- `npm run lint --workspace mercurion_web_node` passed with 60 pre-existing
  warnings and no errors.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run build --workspace mercurion_web_node` passed.
- Full Nest unit suite passed: 132 suites / 249 tests via
  `npm test --workspace mercurion_web_node -- --runInBand`.
- Full Nest E2E suite passed: 1 suite / 1 test via
  `npm run test:e2e --workspace mercurion_web_node -- --runInBand`.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were not run, as required by repository
policy. Complete clean-install and aggregate CI parity remain pending for
GitHub Actions on the exact pushed feature SHA.
### Browser validation performed
_Not applicable._
### Commits
- `485703ab` - `BE-004 enforce Nest provider ownership`
### Merge / CI
Provisional `DONE` / `CI_PENDING`; integration and exact feature-SHA CI are
owned by the coordinator.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
