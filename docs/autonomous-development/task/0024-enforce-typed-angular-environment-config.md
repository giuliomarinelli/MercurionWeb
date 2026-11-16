# 0024 - Enforce a typed Angular environment schema

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Give every Angular build environment one explicit typed schema and make contradictory environment flags impossible to commit unnoticed.

Source: `FE-002` in Series `0001`.

## Context

The current environment variants are structurally duplicated plain objects. The audit identified contradictory values: staging currently declares both `production: true` and `testing: true`, while testing declares `production: true` and `testing: false`. Nothing in the type system or test suite defines which combinations are legal.

Task `0023` restores the environment replacement boundary. This task makes the values selected through that boundary semantically valid.

## Relevant files and modules

- `MercurionWebNg/src/environments/environment.ts`
- `MercurionWebNg/src/environments/environment.development.ts`
- `MercurionWebNg/src/environments/environment.testing.ts`
- `MercurionWebNg/src/environments/environment.staging.ts`
- `MercurionWebNg/angular.json`
- new environment schema/type/factory files where appropriate
- focused environment configuration tests

## In scope

- Define a canonical TypeScript type/schema for Angular environment configuration.
- Encode the legal environment identity explicitly instead of inferring it from overlapping booleans.
- Make each environment variant statically satisfy the same schema.
- Correct contradictory `production` / `testing` semantics without changing unrelated product behaviour.
- Add tests that load/validate all four configurations and assert their identity/capabilities.

## Out of scope

- General feature-flag architecture; `0025` handles central capability/version configuration.
- Route/public-path policy migration.
- Backend Nest environment schema.
- Changing Cloudflare keys, endpoints or release version values unless required to make the schema truthful.

## Decisions already made

- Environment identity must be representable without contradictory booleans.
- Development, test, staging and production are distinct supported Angular configurations.
- Every variant must compile against one canonical schema.
- Invalid combinations must fail during development/CI, not through runtime symptoms.

## Requirements

1. Introduce a canonical environment identity, preferably a discriminant such as `name: 'development' | 'testing' | 'staging' | 'production'` or an equivalently unambiguous representation.
2. Define a reusable `EnvironmentConfig` type/schema that covers the current configuration shape.
3. Make every environment object use `satisfies EnvironmentConfig`, a typed factory, or another compile-time mechanism that prevents missing/mistyped properties.
4. Remove or derive redundant flags where possible. If compatibility temporarily requires `production`, `testing` or similar booleans, derive them from the canonical identity rather than hand-authoring contradictory values.
5. Add tests that explicitly validate development, testing, staging and production identities and any derived booleans/capabilities.
6. Ensure Angular file replacements from `angular.json` continue to map each configuration to the correct environment file.
7. Keep configuration values immutable/read-only at runtime where practical.

## Acceptance criteria

- [ ] All Angular environment variants satisfy one canonical typed schema.
- [ ] No supported environment can represent contradictory `production` / `testing` identity.
- [ ] Staging is semantically staging and testing is semantically testing under the canonical representation.
- [ ] Tests cover all supported variants and fail on an intentionally contradictory/invalid fixture.
- [ ] All Angular configurations compile successfully.
- [ ] Existing unrelated feature behaviour remains unchanged.

## Validation

From `MercurionWebNg` run:

```text
npm run build
npm run build -- --configuration development
npm run build -- --configuration testing
npm run build -- --configuration staging
npm test -- --watch=false
```

Also run the focused environment-schema tests directly if a targeted command exists.

## Browser validation

Not required. The contract is compile-time/build-time and is objectively established by type checking plus configuration tests.

## Stop conditions

Mark `BLOCKED` if correcting an environment identity would necessarily change a product capability whose intended value is not documented. Do not infer, for example, whether a staging-only business feature should be enabled merely from the existing contradictory flags; separate identity correctness from product capability policy.

## Dependencies

- `0023-enforce-angular-environment-import-boundaries.md`

## Implementation notes

Prefer one positive environment discriminant over multiple independent booleans. Derived helpers such as `isProduction`, `isTesting` or `isNonProduction` may exist, but they should be functions/computed values of the canonical identity rather than duplicated source-of-truth fields.

## Execution notes

### Summary

Added a canonical Angular `EnvironmentConfig` schema with explicit
`development`, `testing`, `staging` and `production` identities. Environment
variants now use a shared typed factory that derives the legacy `production`
and `testing` booleans from the identity, preventing contradictory flag
combinations while preserving existing non-identity configuration values.

Added focused environment tests for all four variants, invalid contradictory
flags and runtime immutability. Added a static CI check that verifies
`angular.json` maps each build configuration to the intended environment file.

### Validation performed

- Preflight `npm ci && npm run ci:check` - passed before implementation.
- `npm run typecheck --workspace mercurion_web_ng` - passed.
- `npm run lint --workspace mercurion_web_ng` - passed with existing warnings.
- `npm run test:ci --workspace mercurion_web_ng -- --include src/environments/environment.config.spec.ts` - passed.
- `npm run ci:angular:environment-configs` - passed.
- From `MercurionWebNg`, `npm run build` - passed.
- From `MercurionWebNg`, `npx ng build --configuration development` - passed.
- From `MercurionWebNg`, `npx ng build --configuration testing` - passed.
- From `MercurionWebNg`, `npx ng build --configuration staging` - passed.
- From `MercurionWebNg`, `npx ng test --watch=false` - passed.
- Final `npm ci && npm run ci:check` - passed.

### Browser validation performed

_Not applicable._

### Changed files

- `MercurionWebNg/src/environments/environment.config.ts`
- `MercurionWebNg/src/environments/environment.config.spec.ts`
- `MercurionWebNg/src/environments/environment.ts`
- `MercurionWebNg/src/environments/environment.development.ts`
- `MercurionWebNg/src/environments/environment.testing.ts`
- `MercurionWebNg/src/environments/environment.staging.ts`
- `MercurionWebNg/src/app/pages/feedback/feedback.page.component.ts`
- `scripts/check-angular-environment-configs.mjs`
- `package.json`

### Blocker / human decision required

_None._