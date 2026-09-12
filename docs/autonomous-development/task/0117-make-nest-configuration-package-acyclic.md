# 0117 - Make the Nest configuration package acyclic

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Restructure Nest configuration so environment vocabulary/schema, derived TypeScript types and runtime configuration factories depend in one direction and no config/helper file imports back into a higher-level config factory.

Source: `BE-003` in Series `0001`.

## Context

The current cycle is concrete: `config.ts` imports `config.types.ts` and `env-helpers.ts`; `config.types.ts` imports `Environment` back from `config.ts`; `env-helpers.ts` also imports `Environment` from `config.ts`. This task removes that package-level cycle without yet performing the full single-schema consolidation owned by `0130` (`BE-016`).

## Relevant files and modules

- `MercurionWebNode/src/config/config.ts`
- `MercurionWebNode/src/config/config.types.ts`
- `MercurionWebNode/src/config/env.vars.ts`
- `MercurionWebNode/src/config/env-validation.ts`
- `MercurionWebNode/src/utils/env-helpers.ts`
- config-related specs and bootstrap consumers

## In scope

- Move `Environment` and other primitive configuration vocabulary to a dependency-neutral schema/types module.
- Define a one-directional dependency order such as schema/vocabulary → derived types → runtime factories → bootstrap consumers.
- Remove imports from lower-level config helpers/types back to `config.ts`.
- Update import paths across the Nest project.
- Extend the architecture graph gate to cover the config package.
- Preserve existing configuration keys/values pending `BE-016` consolidation.

## Out of scope

- Do not silently change environment defaults or fail-open/fail-closed semantics; `BE-018` owns unknown `APP_ENV` behaviour.
- Do not replace all duplicated env declarations yet; `BE-016` owns the single authoritative config schema.
- Do not move process termination behaviour yet; `BE-017` owns bootstrap-safe validation.
- Do not change secrets or deployment manifests.

## Decisions already made

- Configuration dependencies flow from declarative schema/vocabulary toward runtime factories, never back from schema/types into factories.
- Type-only modules must not import modules with runtime registration side effects.
- Config files remain free of domain-service imports.

## Requirements

1. Capture the current config import cycle with the architecture checker.
2. Extract `Environment`, config keys and other shared primitives to a low-level side-effect-free module as appropriate.
3. Update `config.types.ts`, env helpers and factories to consume only lower-level modules.
4. Keep runtime `registerAs` factories at the top of the config dependency direction.
5. Ensure importing config types/schema executes no `registerAs`, env-file or bootstrap behaviour.
6. Add unit/static tests proving the config graph is acyclic.

## Acceptance criteria

- [ ] `config.ts`, `config.types.ts`, env schema/validation and env helpers form an acyclic import graph.
- [ ] Type/schema modules do not import `config.ts` or another runtime factory module.
- [ ] Existing valid configuration resolves to equivalent typed values.
- [ ] The architecture gate fails on a temporary reverse config dependency.

## Validation

Run config/env focused tests, Nest architecture gate, `npm run build`, full Nest tests/E2E and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if preserving a current config value requires choosing new environment semantics that belong to `BE-016`/`BE-018`; keep this task structural rather than guessing policy.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md` must be `DONE` first so the architecture checker exists.

## Execution notes

### Feature branch
`feature/BE-003`
### Preflight
Clean `feature/BE-003` at `2e0972e5adf857cff5a47b6f3422d9e4e8440d8e`, matching the
supplied current `develop` base. The preceding BE-002 merge CI run
`34685477631` passed. No task-owned Nest, Angular, Tox21, test-watcher, or
workspace-consuming process was active; only the pre-existing Chrome DevTools
MCP lease was present. The initial architecture capture reported the concrete
cycle `config.ts -> config.types.ts -> config.ts`.
### Preflight remediation
None.
### Summary
Added dependency-neutral `config.schema.ts` for `Environment` and `ConfigKey`,
made configuration interfaces depend only on that vocabulary, and moved all
Nest consumers to the schema import. Configuration interfaces now use
type-only imports, so importing schema/types cannot register factories or load
environment files. Extended the Nest architecture checker to analyze the
production configuration package (including the `src/utils/env-helpers.ts`
boundary), and added a cyclic configuration fixture to its negative gate.
Runtime configuration keys, defaults, and environment semantics were
preserved.
### Task-specific validation performed
* `node scripts/check-nest-module-graph.mjs --root=MercurionWebNode --json`
  captured the pre-change `config.ts`/`config.types.ts` cycle.
* `npm run ci:nest:architecture` passed: 21 modules and 8 configuration files
  checked; production and configuration graphs are acyclic; the negative
  module/configuration-cycle fixture passed.
* Focused environment/config tests passed:
  `npm test --workspace mercurion_web_node -- --runInBand
  --runTestsByPath src/config/env-validation.spec.ts
  src/config/validation-pipe.spec.ts` (2 suites, 3 tests).
* `npm run typecheck --workspace mercurion_web_node` passed.
* `npm run lint --workspace mercurion_web_node` passed with 60 pre-existing
  warnings and no errors.
* `npm run build --workspace mercurion_web_node` passed.
* `npm test --workspace mercurion_web_node -- --runInBand` passed (131 suites,
  246 tests).
* `npm run test:e2e --workspace mercurion_web_node -- --runInBand` passed
  (1 suite, 1 test).
* No browser validation was applicable. Per protocol, `npm ci`,
  `npm run ci:check`, and clean-install/aggregate CI-parity validation were
  not run locally; those belong to GitHub Actions.
### Full pre-merge CI-parity validation
Deferred to GitHub Actions on the pushed feature SHA; forbidden locally by
protocol.
### Browser validation performed
_Not applicable._
### Commits
`06e188c6f71da15258a5bfdd1a5d0269f569fa0a`
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
