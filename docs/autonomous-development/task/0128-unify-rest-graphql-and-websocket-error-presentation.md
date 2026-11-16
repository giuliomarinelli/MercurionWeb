# 0128 - Unify REST, GraphQL and WebSocket error presentation

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Create one transport-neutral error presentation model from typed application errors and use thin REST, GraphQL and WebSocket adapters so all transports preserve the same error classification, code and observability metadata.

Source: `BE-014` in Series `0001`.

## Context

Error handling is currently split between `HttpExceptionFilter`, the Mercurius/GraphQL `errorFormatter`, WebSocket/RPC exception paths and local catch/mapping code. Those paths duplicate decisions about internal/public messages, status/classification and logging. Task `0127` establishes typed application errors; this task makes that single classification authoritative while allowing each transport to serialize it appropriately.

## Relevant files and modules

- `MercurionWebNode/src/exception-handling/http-exception-filter.ts`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- Socket.IO gateway/guards/error handlers
- typed application-error model from `0127`
- response/error DTOs and logging/observability helpers
- REST/GraphQL/WebSocket E2E tests

## In scope

- Define one canonical error presentation record containing stable code/category, public message/details policy, correlation/request metadata and internal diagnostic cause separately.
- Adapt Nest validation/framework errors and typed application errors into the canonical record once.
- Implement thin REST serializer/filter, GraphQL formatter and WebSocket/RPC serializer using that record.
- Ensure production redaction rules are shared rather than independently reimplemented.
- Preserve one correlation identifier/trace metadata model across transports where transport capabilities permit.
- Remove duplicated message/status classification switches from GraphQL/socket paths.
- Add contract tests asserting equivalent application errors classify identically over REST, GraphQL and WebSocket.

## Out of scope

- Do not force identical wire envelopes when transport standards require different shapes; classification semantics must match, serialization may differ.
- Do not leak stack traces/internal causes to clients.
- Do not change business-error mappings defined by `0127` without a human-approved contract decision.
- Do not redesign the logging backend; `0129` owns LoggerPort.

## Decisions already made

- Typed application errors are the classification source of truth.
- A shared presenter produces a canonical semantic record; transport adapters serialize it.
- Redaction and public/internal message policy are centralized.
- Request/correlation metadata is preserved consistently enough to join client failures with logs.

## Requirements

1. Inventory current REST, GraphQL and WebSocket error shapes and classification/redaction logic.
2. Define the canonical semantic error record and presenter.
3. Refactor HTTP filter, GraphQL formatter and socket/RPC error path to consume the presenter.
4. Ensure validation errors retain structured field/details information without becoming arbitrary internal messages.
5. Ensure unhandled errors are logged with cause/correlation metadata and serialize as safe internal errors.
6. Add a shared table of representative errors and assert each transport produces equivalent code/category/public semantics.
7. Remove duplicated status/message mapping logic from transport implementations.

## Acceptance criteria

- [ ] One presenter owns application-error classification/redaction semantics.
- [ ] REST, GraphQL and WebSocket expose the same stable error code/category for the same failure.
- [ ] Transport adapters contain serialization logic only, not business classification switches.
- [ ] Internal causes/stacks are never exposed in production responses.
- [ ] Correlation/request metadata is consistently available for diagnostics.
- [ ] Cross-transport error contract tests pass.

## Validation

Run shared presenter tests plus REST/GraphQL/WebSocket integration/E2E error cases, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if current external clients depend on contradictory transport error semantics and no canonical compatibility decision exists; preserve evidence and request that decision rather than silently breaking one client.

## Dependencies

- `0127-replace-string-status-mapping-with-typed-application-errors.md` must be `DONE`.

## Execution notes

### Feature branch
`feature/BE-014`, based on `develop` at
`c2b377a2b113a6d461446594b4e4c915268dc283`.
### Preflight
- Confirmed `git rev-parse HEAD` and `git rev-parse develop` both returned
  `c2b377a2b113a6d461446594b4e4c915268dc283`; the feature branch was clean
  before implementation.
- Exact `develop` GitHub Actions run `34938178275` for that SHA completed
  successfully.
- Process inventory found no task-owned Angular, Nest, Tox21, or test watcher.
  Existing browser/MCP and unrelated host processes were not task-owned.
- Browser validation is not applicable per this recipe.
### Preflight remediation
None.
### Summary
Added a transport-neutral `presentApplicationError` boundary that classifies
typed, framework, validation, GraphQL and unhandled failures once. The
canonical record now carries stable code, category, safe public semantics,
structured validation details, correlation metadata and a diagnostic-only
cause. REST, GraphQL and Socket.IO now use thin serializers over that record;
production redaction is shared and internal causes are excluded from all wire
formats.
### Task-specific validation performed
- `npm run build --workspace @mercurion/rest-contracts` — passed.
- `npm run typecheck --workspace @mercurion/rest-contracts` — passed.
- `npm run typecheck --workspace mercurion_web_node` — passed.
- `npm run lint --workspace mercurion_web_node` — passed.
- Focused Nest cross-transport tests — 6 suites, 27 tests passed:
  `application-error.spec.ts`, `application-error-envelope.spec.ts`,
  `http-exception-filter.spec.ts`, `mercurion-graphql.module.spec.ts`,
  `socket-contract-runtime.spec.ts`, and `socket.io.gateway.spec.ts`.
- `git diff --check` — passed.
### Full pre-merge CI-parity validation
Not run locally; `npm ci` and `npm run ci:check` are reserved for GitHub
Actions by session policy. Exact feature-SHA CI run `34939775415` for
`ad8d2624603c79810d6b1a393fb28a714824319b` passed on Windows and Ubuntu,
including `Required gate`. The preceding run `34939294468` failed because the
Socket.IO contract type assertion fixture omitted the newly canonical
`category`; the narrow correction was committed as `ad8d2624` and passed the
focused contract checks before the repaired CI run.
### Browser validation performed
_Not applicable._
### Commits
`af9911a9` — `feat(errors): unify transport error presentation`.
`9e5fa2a2` — `docs(task): record BE-014 execution`.
`ad8d2624` — `fix(errors): update socket contract assertion`.
`a7934eac` — `docs(task): record feature CI repair`.
`52964c65` — `docs(task): record final feature validation`.
### Merge / CI
Final feature branch SHA is `52964c6506182793624c0c75cb7177d3f3786939`.
Exact-SHA CI run `34940370226` passed with `Required gate`; its metadata
validation and exact feature evidence were green.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
