# 0130 - Define every Nest configuration property once

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-016`, created from and ancestrally based on
`b9463d6ba81ef2074bc87814515b31c8aede4a5d`.
### Preflight
Passed before implementation:

- working tree clean and `HEAD`, local `develop`, and `origin/develop` all at
  `b9463d6ba81ef2074bc87814515b31c8aede4a5d`;
- `git merge-base --is-ancestor
  b9463d6ba81ef2074bc87814515b31c8aede4a5d HEAD` exited `0`;
- process inventory found no Angular, Nest, Tox21, Jest watcher, or other
  workspace-consuming process (only the coordinator and the inventory shell
  matched the broad command-line filter);
- GitHub Actions run
  `https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34696198318`
  was green for the exact base SHA: Ubuntu and Windows quality jobs plus
  `Required gate` succeeded;
- dependency `0117` was confirmed `DONE`;
- unchanged focused checks passed: existing environment validation test
  (`1` suite / `1` test), Nest architecture checks, and Nest TypeScript
  typecheck.
### Preflight remediation
_None._
### Summary
Replaced the parallel environment class, coercion table, factory casts, and
handwritten configuration interfaces with one declarative environment schema.
Each supported Nest runtime source now declares required/default semantics,
coercion, constraints, and inferred output type once. Configuration groups are
built from the validated typed environment, and their public TypeScript types
are derived from those builders.

Removed factory-level `Number`, `JSON.parse`, casts, and non-null assertions.
Moved application consumers of local-development flags and `APP_ENV` from raw
`process.env` reads to typed `ConfigService` groups, while retaining the
documented pre-bootstrap `APP_ENV` compatibility fallback for task `0132`.
No service endpoint, secret, security default, or deployment value was changed.
### Task-specific validation performed
Passed:

- schema and migrated-consumer focused Jest run: `7` suites / `39` tests;
- final schema-focused Jest run:
  `src/config/env-validation.spec.ts` and
  `src/config/config-schema.spec.ts` (`2` suites / `15` tests);
- full Nest Jest run in band: `140` suites / `362` tests;
- isolated Nest E2E run in band: `1` suite / `1` test;
- `npm run typecheck --workspace mercurion_web_node`;
- `npm run lint --workspace mercurion_web_node` (`0` errors; `48` existing
  warnings);
- `npm run build --workspace mercurion_web_node`;
- `npm run ci:nest:architecture`, including positive and negative module graph
  and provider ownership checks;
- existing git-ignored `env/.env.development` validated successfully through
  the canonical schema without printing values;
- `git diff --check`.

Coverage added for full/minimal valid environments, missing required values,
invalid integers/booleans/JSON/enums/UUIDs, duplicate sources, unused schema
declarations, configuration-group completeness, example-file coverage, and
raw `process.env` consumer prevention.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run per autonomous
policy. Complete clean-install Windows/Linux validation and the stable
`Required gate` are coordinator-owned on the exact pushed feature SHA.
### Browser validation performed
_Not applicable._
### Commits
- `d75478797f5ae5ada4a45f05d6a5fed6db8e769f` -
  `refactor(config): define canonical Nest schema`
- `a53925fc884909c9be7d751c3a4fa9753830b4a1` -
  `test(config): preserve validated e2e environment`
- Task outcome and execution record: this commit.
### Merge / CI
Feature branch is ready for exact-SHA pre-merge GitHub Actions validation;
merge remains coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
