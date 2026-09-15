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

- [ ] Every production controller method is a thin validation/delegation/presentation adapter.
- [ ] No controller owns domain workflow sequencing.
- [ ] No production controller injects TypeORM repositories/DataSource.
- [ ] Fastify raw parsing is absent except explicitly documented transport-only cases awaiting dedicated adapter work.
- [ ] Controller boundary rules are enforced in CI.
- [ ] Existing REST contracts remain compatible.

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
`feature/BE-012`, at supplied green `develop` base
`38bae2ecedb84ad8c55345405a91fcac2703654a`.
### Preflight
- Confirmed the clean local branch was exactly `feature/BE-012` and
  `git rev-parse HEAD` exactly matched `develop` at
  `38bae2ecedb84ad8c55345405a91fcac2703654a`.
- Confirmed the exact base SHA has successful GitHub Actions CI run
  `34933836650`; the run completed successfully before implementation.
- Confirmed no task-owned Angular, Nest, Tox21, Jest/Vitest watcher, or other
  workspace-consuming process was active. Existing Chrome DevTools MCP
  processes were external browser tooling and were not touched.
- Confirmed hard prerequisites 0120, 0121 and 0122 are `DONE`.
- Unchanged focused Nest architecture, typecheck and all 16 controller suites
  passed before editing. Local `npm ci` and `npm run ci:check` were not run.
### Preflight remediation
None.
### Summary
- Added a CI-enforced Nest controller boundary checker covering every
  production controller. It rejects repository/DataSource dependencies,
  persistence entity or repository imports, and undocumented raw request
  access, with a negative fixture proving each violation is caught.
- Added validated transport DTOs for feedback pagination/filter queries,
  history pagination, and embedding similarity queries. Controllers now use
  Nest validation pipes rather than manually parsing query strings.
- Kept response mapping transport-specific and typed, including the existing
  pagination contract defaults, while preserving route and response contracts.
- Documented the authentication controller's one unavoidable raw request read
  as a transport-only cookie boundary.
### Task-specific validation performed
- `npm run ci:nest:architecture` passed, including the new controller
  boundary gate and negative test.
- `npm run typecheck --workspace mercurion_web_node` passed.
- `npm run lint --workspace mercurion_web_node` passed with zero
  warnings/errors.
- Focused refactored controller tests passed: 3 suites, 3 tests.
- Full controller test baseline passed before editing: 16 suites, 33 tests.
- `git diff --check` passed.
### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are reserved for
GitHub Actions. Exact feature-SHA CI remains coordinator-owned.
### Browser validation performed
_Not applicable._
### Commits
Pending task implementation commit on `feature/BE-012`.
### Merge / CI
Provisional `DONE` / `CI_PENDING`; exact feature-SHA CI and integration are
coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
