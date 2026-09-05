# 0012 - Centralize application error code catalog

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace string-based and independently mapped application errors with one exhaustive, typed error-code catalog consumed by producers and Angular/Nest transport handlers.

Source: `SYS-012` in Series `0001`.

## Context

Error semantics are currently encoded through string messages such as `Forbidden::missing permissions`, `InvalidSession`, `MfaTemporarilyLocked`, and many `RpcException` messages. `HttpExceptionFilter`, GraphQL `errorFormatter`, guards/services, and Angular consumers interpret subsets independently. This makes renames and omissions runtime failures rather than compile-time contract failures.

## Relevant files and modules

- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/app_modules/auth/services/scope.service.ts`
- `MercurionWebNode/src/app_modules/auth/guards/global.guard.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- services/controllers throwing `RpcException` or domain errors
- `MercurionWebNg/src/app/interceptors/`
- Angular components/services comparing `message` strings
- canonical contract mechanism

## In scope

- Inventory stable application/domain error meanings currently encoded as strings.
- Define one typed catalog with stable machine codes and transport/status/public-message policy metadata where appropriate.
- Replace producer and consumer string comparisons with catalog-derived codes/helpers.
- Make mapping switches exhaustive at compile time.
- Add automated policy preventing new unmanaged application error literals.

## Out of scope

- Cross-transport envelope shape; task `0011` owns serialization.
- User-facing copy redesign beyond preserving current safe meaning.
- Logging-only diagnostic text that is not part of program control flow.

## Decisions already made

- Application logic must branch on stable codes, not human-readable messages.
- The catalog is shared/canonical and exhaustive for contract-visible errors.
- Public message text may evolve independently from the stable code.

## Requirements

1. Inventory error literals used for control flow or transport mapping.
2. Allocate stable semantic codes without leaking internal implementation details.
3. Associate current HTTP/application status and safe public-message policy with each code where needed.
4. Update throws/factories to carry codes explicitly.
5. Update REST, GraphQL, WebSocket and Angular consumers to match on codes.
6. Make mapping functions exhaustive using TypeScript type checking.
7. Add a static/test guard against new unmanaged string-based error branching.

## Acceptance criteria

- [x] One canonical catalog contains every contract-visible application error code.
- [x] Producers and consumers no longer depend on strings such as `Forbidden::missing permissions` for application control flow.
- [x] Adding a new catalog code causes relevant exhaustive mappings to require handling at compile/test time.
- [x] Existing status/public-message behaviour is preserved unless explicitly documented.
- [x] Builds and targeted error/auth tests pass.
- [x] Existing behaviour not targeted by this task remains compatible.

## Validation

Run Nest and Angular builds/tests plus the new error-catalog policy/exhaustiveness checks.

## Browser validation

Not required except for a safe representative Angular error flow if task `0011` is already complete; if performed, use only `http://localhost:8888`.

## Stop conditions

Block if two existing string errors that appear identical semantically are known to require distinct externally stable behaviours and that distinction is undocumented. Preserve them separately until a human decides consolidation.

## Dependencies

- None.
- Advisory: coordinate with `0011-unify-cross-transport-error-envelope.md`; do not create two permanent error vocabularies.

## Implementation notes

Prefer codes that describe domain meaning rather than transport, e.g. avoid baking `HTTP_403` into a code whose status mapping could vary by transport.

## Execution notes

### Summary

- Verified clean `feature/SYS-012` at supplied base
  `68f9c930504e2d8da76a0fa7a2ee04a1e6e8adfd`, with repository-local
  `commit.gpgSign=false`.
- Added the canonical 111-code application error catalog to
  `@mercurion/rest-contracts`. Each code owns its HTTP status, optional
  GraphQL status override, legacy/default message, public message, and
  production exposure policy.
- Added Nest factories/extractors and migrated all 163 direct
  `RpcException` producers to explicit stable codes. REST, GraphQL, and
  WebSocket boundaries now emit or branch on those codes while preserving
  existing status and safe-message behavior.
- Added one Angular extractor/client error path for REST, GraphQL, WebSocket,
  and local client errors, and replaced application control-flow comparisons
  against message strings.
- Preserved distinct existing meanings rather than inventing consolidation.
  In particular, the two `Unauthenticated` behaviors remain separate codes,
  and ambiguous legacy reverse lookup fails closed.
- Added exhaustive catalog/adapter tests and a TypeScript-AST policy gate,
  including negative probes, that rejects unmanaged direct `RpcException`
  construction and message/detail-based application error branching. The
  gate is registered in root `ci:static`.

### Validation performed

- Before task changes, proved no task/session-owned Angular, Nest, Tox21,
  Karma, Jest, ChromeHeadless, or watcher process was active.
- Unchanged task-start preflight:
  - root `npm ci` - passed, exit `0`;
  - root `npm run ci:check` - passed, exit `0`;
  - no task change existed after preflight.
- Task-specific validation:
  - shared-contract, Angular, and Nest typechecks - passed;
  - Angular and Nest builds - passed;
  - focused Angular application-error extraction suite - 4 tests passed;
  - `npm test --workspace mercurion_web_node -- --runInBand
    src/exception-handling/http-exception-filter.spec.ts
    src/exception-handling/application-error.spec.ts` - 2 suites and 7 tests
    passed;
  - targeted auth, WebSocket, and error suites - 30 suites and 40 tests
    passed;
  - `npm run ci:errors` - positive repository policy and negative fixtures
    passed;
  - source scan found no direct `new RpcException` outside the canonical
    adapter.
- Before final clean install, again proved no workspace-consuming process was
  active.
- Final root `npm ci` passed, including compilation of the shared runtime
  catalog from a clean dependency tree.
- Final root `npm run ci:check` passed with exit `0`: 172 Angular tests, 118
  Nest suites / 166 tests, 1 Nest E2E test, both production builds, GraphQL
  drift checks, REST contract checks, and application-error policy checks all
  passed. Lints had zero errors; existing warnings remained non-fatal. The
  Angular build also reports the shared internal package as CommonJS, without
  affecting correctness or the production build result.

### Browser validation performed

Not performed. Task `0011` is not complete, so this recipe does not require a
representative browser flow. No Angular, Nest, Tox21, or application browser
runtime was started; headless Chrome ran only as the existing Angular test
runner inside `ci:check`.

### Changed files

- `packages/rest-contracts/**`: canonical catalog, payload guards, exports,
  and runtime/declaration build configuration.
- `MercurionWebNode/src/exception-handling/**`,
  `MercurionWebNode/src/mercurion-graphql.module.ts`, producer services,
  controllers, and guards: coded factories plus REST/GraphQL/WebSocket
  transport mapping and producer migration.
- `MercurionWebNg/src/app/utils/**`, interceptors, pages, GraphQL services,
  session sync, and realtime socket service: canonical code extraction and
  code-based control flow.
- `scripts/check-application-error-policy.mjs`,
  `scripts/test-application-error-policy-negative.mjs`, root package scripts,
  shared-package build wiring, and Jest transform scope.
- This task recipe.

### Commits

- Task implementation and outcome - this task-result commit.

### Merge / CI

Local completion is provisional `CI_PENDING`. The coordinator must require the
exact pushed feature SHA's Windows and Linux quality jobs plus stable
`Required gate` before integration. No merge was performed by the worker.

### Blocker / human decision required

None.
