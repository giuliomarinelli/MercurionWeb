# 0217 - Establish cross-transport observability and performance gates

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Propagate one safe correlation context across HTTP, GraphQL, Socket.IO and NATS, expose low-cardinality request/query/cache/latency/error metrics and make agreed critical-path performance budgets deterministic non-regressing CI gates.

Source: `QA-031` in Series `0001`.

## Context

Earlier tasks unify application error envelopes, introduce a neutral structured LoggerPort, type NATS contracts and build same-version system tests. The repository still lacks one end-to-end observability contract and repeatable performance baselines: identifiers can be lost at transport boundaries, query/cache behavior is not measured consistently and regressions are discovered only through incidents or ad hoc profiling. This task adds vendor-neutral instrumentation and stable benchmark evidence without contacting production telemetry systems.

## Relevant files and modules

- shared error/correlation contract from `0011`
- Angular HTTP/Apollo/Socket.IO transport adapters
- Nest Fastify HTTP, GraphQL and Socket.IO boundaries
- typed NATS registry and scientific adapters
- neutral LoggerPort from `0129`
- TypeORM query/unit-of-work and Redis cache/session adapters
- system-test/runtime harness from `0197`
- benchmark, metrics and CI artifact configuration

## In scope

- Define one validated correlation-context contract and lifecycle.
- Generate or safely accept correlation IDs at ingress and propagate them through every supported transport/effect boundary.
- Include correlation metadata consistently in structured logs and application error responses where public policy permits.
- Instrument request/RPC latency, outcome/error class, database query behavior and cache hit/miss behavior with bounded low-cardinality dimensions.
- Define representative critical-path benchmarks using isolated deterministic data/services.
- Record a post-Series baseline and version-controlled performance budgets/tolerance policy.
- Fail CI on statistically meaningful agreed regressions and retain diagnostic reports.
- Test redaction, context isolation and concurrent-request propagation.

## Out of scope

- Do not select or couple domains to a production telemetry vendor.
- Do not send CI/test telemetry to production collectors.
- Do not use user IDs, emails, tokens, query text/payloads or unbounded route/subject values as metric labels.
- Do not expose stack traces, infrastructure topology or secret correlation metadata in public responses.
- Do not create flaky internet-dependent microbenchmarks or silently raise budgets after a regression.

## Decisions already made

- Correlation context is transport-neutral, typed and request/session-operation scoped.
- Untrusted inbound IDs are length/character validated; invalid values are replaced rather than logged verbatim.
- Structured logs and telemetry adapters consume neutral contracts; application domains do not import a vendor SDK.
- Metrics use normalized route/operation/subject identifiers and bounded outcome classes.
- Performance budgets are measured on controlled fixtures, include documented tolerance and can change only with reviewed evidence.
- Observability must redact secrets/sensitive payloads before export.

## Requirements

1. Define the canonical correlation-context type, validation/generation rules and public header/envelope behavior, reusing `0011` rather than creating a second ID field.
2. Establish context at HTTP/GraphQL/Socket.IO ingress and propagate it through asynchronous handlers, outbound HTTP, NATS requests, outbox consumers and relevant response/error presenters.
3. Prove concurrent requests/events never inherit or overwrite another operation's context and background work creates/links an explicit new context where appropriate.
4. Route all observability through neutral structured logger/metrics interfaces and add redaction tests for tokens, credentials, OTPs, OAuth data and sensitive payload fields.
5. Instrument normalized latency/count/error metrics for transports plus query count/duration, Redis/cache hit/miss and bounded external-adapter outcomes without high-cardinality labels.
6. Define isolated critical workloads covering authentication/session, collection/molecule read/write and one scientific RPC/system path; seed fixed data and warmup/sample methodology.
7. Record baseline distributions and explicit budgets/tolerances in version-controlled policy, with owner/rationale and a controlled process for approving a change.
8. Add a benchmark runner that distinguishes functional failure from performance regression, controls concurrency/timeouts and produces machine-readable plus concise reports.
9. Register observability contract tests and suitably stable performance gates in canonical CI; keep noisier long-running diagnostics separate only when their required status/cadence is documented.

## Acceptance criteria

- [ ] One correlation ID/context is preserved across HTTP, GraphQL, Socket.IO, NATS and resulting structured logs/errors.
- [ ] Concurrent operations have isolated context and sensitive values are redacted.
- [ ] Request/RPC, query, cache, latency and error metrics use bounded documented dimensions.
- [ ] Critical-path benchmarks use fixed isolated fixtures and a version-controlled budget/tolerance policy.
- [ ] A representative correlation break, high-cardinality label and performance regression each fail their gate.
- [ ] CI retains actionable observability/benchmark evidence without contacting production systems.

## Validation

Run cross-transport correlation/concurrency/redaction tests, metric-contract cardinality fixtures and each benchmark repeatedly on the controlled harness; exercise deliberate correlation and performance regressions, inspect reports, then run full system tests and repository-wide CI parity.

## Browser validation

Through `http://localhost:8888`, execute one critical Angular flow spanning HTTP/GraphQL or Socket.IO. Inspect safe request/response correlation metadata and verify the corresponding isolated backend/NATS test telemetry shares the same context without exposing sensitive data or producing relevant console/network errors.

## Stop conditions

Mark `BLOCKED` if a transport cannot carry correlation metadata without an unresolved public-protocol change, or if no approved performance workload/budget owner and tolerance can be established. Do not invent a production SLO or encode an arbitrary threshold.

## Dependencies

- `0011-unify-cross-transport-error-envelope.md`, `0129-decouple-application-logging-from-meilisearch.md` and `0146-define-typed-versioned-nats-contract-registry.md` must be `DONE`.
- `0197-add-same-version-frontend-backend-system-tests.md` and `0202-complete-canonical-github-actions-ci-pipeline.md` must be `DONE`.
- Query/cache/session refactors from relevant DATA tasks should be stable before baselining.

## Implementation notes

Prefer a small context/telemetry port at boundaries over pervasive instrumentation SDK calls. Benchmark regression policy should compare robust summaries with explicit tolerance, not single-run wall-clock noise.

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
