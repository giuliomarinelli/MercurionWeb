# 0130 - Define every Nest configuration property once

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Replace the duplicated env class/config factory/coercion/type declarations with one authoritative configuration schema that validates and converts runtime input and provides the TypeScript configuration shape consumed by the application.

Source: `BE-016` in Series `0001`.

## Context

Configuration is currently spread across `env.vars.ts`, `env-validation.ts`, `config.ts`, `config.types.ts` and helpers. More than one hundred properties have separately maintained declaration, coercion/default and result typing. Task `0117` already makes the package dependency graph acyclic; this task removes semantic duplication. `0131` then ensures validation is bootstrap-safe and `0132` enforces fail-closed handling for unknown `APP_ENV` values.

## Relevant files and modules

- `MercurionWebNode/src/config/config.ts`
- `MercurionWebNode/src/config/config.types.ts`
- `MercurionWebNode/src/config/env.vars.ts`
- `MercurionWebNode/src/config/env-validation.ts`
- `MercurionWebNode/src/utils/env-helpers.ts`
- ConfigService consumers and config tests

## In scope

- Establish one declarative schema/source for every supported environment/configuration property.
- Encode source name, required/optional status, allowed default, coercion and validation constraint once.
- Derive or directly expose typed configuration groups consumed through `ConfigService` without manually duplicating field lists.
- Centralize boolean/number/list/enum parsing so factories do not repeat ad-hoc `Number`, `JSON.parse`, casts and non-null assertions.
- Preserve existing configuration group keys (`App`, `Data`, etc.) or provide one mechanical migration with compile-time coverage.
- Add schema completeness/duplicate-source tests and negative validation fixtures.

## Out of scope

- Do not call `process.exit`; task `0131` owns validation error propagation at bootstrap.
- Do not preserve unknown `APP_ENV` fallback as desired behaviour; task `0132` will make it fail closed.
- Do not change secret values, service endpoints or security defaults just to simplify schema design.
- Do not add a new schema dependency when existing project tooling can express the contract cleanly without a demonstrated need.

## Decisions already made

- Each config property has exactly one authoritative declaration.
- Validation and coercion occur before application services consume configuration.
- `ConfigService` consumers receive typed domain configuration, not raw `process.env` strings.
- Defaults exist only when explicitly declared and safe for that property/environment.
- Runtime factories do not recast already validated values.

## Requirements

1. Inventory every environment variable/config field currently referenced by config files and production code.
2. Define the canonical schema with one declaration for name, type/coercion, required/default and constraints.
3. Generate/derive typed grouped configuration values from validated schema output instead of parallel handwritten interfaces where feasible.
4. Remove duplicate coercion/default logic from `config.ts` factories and helpers.
5. Replace unsafe non-null/assertion/casts at configuration consumption with typed getters/config objects where practical.
6. Add tests for valid full/minimal environment sets, missing required values, invalid numbers/booleans/JSON/enums and duplicate/unused declarations.
7. Ensure architecture/config graph remains acyclic.

## Acceptance criteria

- [ ] Every production configuration property is declared once in the canonical schema.
- [ ] Validation, coercion and type shape cannot silently diverge across three separate lists/files.
- [ ] Config factories consume validated typed values and contain no repeated generic coercion logic.
- [ ] Required/default/constraint semantics are test-covered.
- [ ] Config consumers compile against the canonical typed configuration model.
- [ ] Existing valid environment configurations remain compatible unless a later explicit task changes policy.

## Validation

Run config-schema positive/negative tests, config architecture tests, Nest build, full Nest tests/E2E with isolated test config and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a currently optional/defaulted production-sensitive property has no documented safe default and consolidating it would require choosing a new security/deployment policy.

## Dependencies

- `0117-make-nest-configuration-package-acyclic.md` must be `DONE`.

## Implementation notes

The important outcome is one source of truth, not a specific schema library. Reuse existing validation tooling unless a new dependency provides a concrete, measured benefit.

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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0117` (BE-003, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
