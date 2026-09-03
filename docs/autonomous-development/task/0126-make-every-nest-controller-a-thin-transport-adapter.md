# 0126 - Make every Nest controller a thin transport adapter

- [ ] DONE
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
