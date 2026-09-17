# 0126 - Make every Nest controller a thin transport adapter

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Refactor production Nest controllers so each endpoint only extracts/validates transport input, invokes one application use case/query and returns a typed DTO/presenter result, with no domain orchestration or manual Fastify parsing in controllers.

Source: `BE-012` in Series `0001`.

## Context

The audit identifies large controllers that mix Fastify request/reply details, response shaping and domain sequencing. Auth/account controllers are already being migrated to focused use cases by `0121`/`0122`; this task applies the transport-adapter rule across the backend and establishes an architectural gate. Multipart document parsing is a dedicated DATA task, so this task should expose a boundary/violation but not invent the final streaming adapter ahead of `DATA-026`.

## Relevant files and modules

- controllers under `MercurionWebNode/src/`
- controllers under `MercurionWebNode/src/app_modules/**/controllers/`
- use cases/services introduced by prior BE tasks
- DTOs/pipes/guards/decorators/presenters
- controller specs and REST E2E tests

## In scope

- Inventory production controller methods and classify validation, transport parsing, domain orchestration and response presentation.
- Move multi-service/domain sequencing into application use cases.
- Move reusable response mapping into typed presenters/DTO mappers.
- Prefer Nest DTO validation/pipes/decorators over ad-hoc parsing in controller bodies.
- Keep unavoidable transport-specific concerns (cookies, headers, stream response) explicit and minimal.
- Add architecture/lint rules that prohibit foreign repositories and broad domain orchestration dependencies from controllers.
- Add focused controller tests that assert validation/delegation/presentation rather than re-testing use-case internals.

## Out of scope

- Do not implement the final multipart streaming adapter owned by `DATA-026`; document/retain the smallest temporary adapter boundary required until then.
- Do not alter route paths, HTTP methods, status contracts or authentication requirements.
- Do not move application logic into pipes/interceptors merely to satisfy controller line-count goals.
- Do not turn one generic mega-use-case into a controller surrogate.

## Decisions already made

- A controller method has one application entrypoint.
- Domain decisions live in use cases/policies, not transport adapters.
- Response DTOs/presenters are immutable and transport-specific shaping is separated from persistence entities.
- Fastify-specific request/reply access is allowed only when the transport actually requires it.

## Requirements

1. Generate a controller dependency/complexity inventory and prioritize every method with multi-service/domain orchestration.
2. Migrate those methods to single-use-case delegation.
3. Replace manual request-field parsing with validated DTOs/pipes/decorators where supported.
4. Move repeated response shaping to typed presenters/mappers.
5. Ensure controllers do not inject repositories/DataSource or foreign domain implementation services.
6. Add a static architecture check for controller dependency boundaries.
7. Preserve existing endpoint contracts with REST integration/E2E tests.

## Acceptance criteria

- [x] Every production controller method is a thin validation/delegation/presentation adapter.
- [x] No controller owns domain workflow sequencing.
- [x] No production controller injects TypeORM repositories/DataSource.
- [x] Fastify raw parsing is absent except explicitly documented transport-only cases awaiting dedicated adapter work.
- [x] Controller boundary rules are enforced in CI.
- [x] Existing REST contracts remain compatible.

## Validation

Run controller/use-case focused tests, REST E2E suite, architecture gate, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a controller contains a transport concern whose safe extraction requires the not-yet-executed multipart/storage architecture task; isolate and document it rather than changing upload semantics prematurely.

## Dependencies

- `0121-decompose-account-service-into-focused-use-cases.md` and `0122-split-authentication-flows-into-typed-command-handlers.md` should be `DONE`.
- `0120-keep-typeorm-repositories-private-to-owning-domains.md` must be `DONE`.

## Execution notes

### Feature branch
`feature/BE-012`; recovery resumed from preserved SHA
`b162dd8c115d55a9a6c30646a2768cbd6e226d75` and merged current green
`develop` in recovery merge `43c1ea76`.
### Preflight
The historical base SHA `38bae2ecedb84ad8c55345405a91fcac2703654a` had
successful Actions run `34933836650`. Recovery used current green `develop`
SHA `8db5c8589adeed7776d99f6f00f34d78ea248a8f`, certified by full CI run
`35210414540`. Dependencies 0120, 0121 and 0122 remain `DONE`.
### Preflight remediation
_None._
### Summary
The preserved thin-controller refactor and CI architecture gate were reconciled
with current `develop`. Current logger, identifier, presenter and multipart
adapter architecture was retained. The raw upload request boundary is explicitly
documented as transport-only and remains isolated by the dedicated adapter.
### Task-specific validation performed
- `npm run ci:nest:architecture`: passed, including the positive and negative
  controller-boundary checks.
- Nest typecheck, zero-warning lint and build: passed.
- Focused embedding, feedback and history controller tests: 3/3 passed.
- Full Nest unit suite: 171 suites and 594 tests passed.
- Nest E2E: 1 suite and 5 tests passed.
- REST compatibility: 59/59 client calls matched to 58 Nest routes; negative
  compatibility checks and validation-pipe tests passed.
- `git diff --check`: passed.
### Full pre-merge CI-parity validation
Pending exact recovery feature-SHA GitHub Actions validation. Local `npm ci`
and `npm run ci:check` were not run because they are reserved for Actions.
### Browser validation performed
_Not applicable._
### Commits
Historical implementation commits are preserved; recovery merge: `43c1ea76`.
### Merge / CI
Implementation and focused validation are complete. Operational state is
`DONE` / `CI_PENDING` until exact feature- and merge-SHA gates succeed. Feature
run `35212920526` on SHA `3972bf11b4d4986a4e1b52c8b8c92a2336ebc70a`
confirmed the historical Docker registry failure is resolved, then exposed a
repository topology snapshot drift for the extended `ci:nest:architecture`
script on both platforms. The topology expectation was updated narrowly;
positive and negative topology gates and the complete Nest architecture gate
passed locally before publishing the repair SHA.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
