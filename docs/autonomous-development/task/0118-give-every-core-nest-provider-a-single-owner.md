# 0118 - Give every core Nest provider a single owner

- [ ] DONE
- [ ] BLOCKED

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
