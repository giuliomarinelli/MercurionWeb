# 0142 - Remove or explicitly own every orphan Nest module

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Resolve every backend production file unreachable from legitimate Nest/runtime entrypoints and add a deterministic CI reachability gate so legacy DTOs/interfaces/modules cannot accumulate as zombie code.

Source: `BE-028` in Series `0001`.

## Context

The audit identified 16 backend files not reachable from the production graph, including legacy DTOs/interfaces. Earlier BE tasks make module boundaries acyclic, normalize provider ownership/naming and remove test-only production entries; this task runs over that stabilized graph and distinguishes legitimate dynamic/framework entrypoints from dead code.

## Relevant files and modules

- `MercurionWebNode/src/main.ts`
- `MercurionWebNode/src/app.module.ts`
- production modules/controllers/providers/resolvers
- DTO/interface/model trees
- Nest architecture checker introduced by `0115`
- test-only application graph from `0139`

## In scope

- Build a deterministic production reachability graph covering TS imports plus explicit Nest metadata/dynamic entrypoints that static imports alone cannot model correctly.
- Classify every audited orphan as legitimate runtime entrypoint, generated/non-production unit or dead code.
- Delete dead DTOs/interfaces/services/modules and obsolete tests/exports referencing only them.
- Add an explicit narrow allowlist/entrypoint configuration for generated/tooling/test-only code.
- Add a CI gate that fails on new unapproved backend orphans.

## Out of scope

- Do not make dead code reachable through a synthetic barrel/import solely to satisfy the checker.
- Do not exempt broad directories when precise entrypoints can be declared.
- Do not delete code whose runtime loading mechanism is real but invisible to the graph; model that mechanism explicitly.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Every production backend source unit is reachable from a real runtime entrypoint or removed.
- Nest metadata/dynamic registration is represented explicitly rather than treated as an excuse to disable reachability checking.
- Test-only code belongs to the separate test graph from `0139`.

## Requirements

1. Reproduce the audited orphan list against the post-`0141` source graph and record the before count.
2. Define authoritative runtime entrypoints: `main.ts`, `AppModule`, dynamic module/provider registrations and other proven framework-owned roots.
3. Remove each true orphan plus obsolete exports/specs/config references.
4. Preserve generated/tooling/test files only through precise documented rules.
5. Add a `nest:orphans:check`/equivalent command and a negative fixture proving a new unreachable production file fails.
6. Register the gate in canonical `ci:check` and compose it with the cycle/layer checks from `0115`.
7. Record final orphan count and all intentional non-production exceptions.

## Acceptance criteria

- [ ] Zero unapproved production backend files are unreachable.
- [ ] The audited legacy DTO/interface orphans are removed or have proven real owners.
- [ ] Dynamic Nest entrypoints are modeled without fake eager imports.
- [ ] Test/generated/tooling exceptions are narrow and documented.
- [ ] CI fails when a new production orphan is introduced.

## Validation

Run backend reachability/dead-code checker, negative fixture, architecture gate, strict typecheck, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an apparently orphaned unit is tied to an undocumented dynamic/plugin runtime that cannot be proven safe to remove; preserve it temporarily and record the required ownership decision.

## Dependencies

- `0115-break-nest-domain-module-dependency-cycle.md`, `0139-remove-test-only-routes-from-production-nest-graph.md`, `0140` and `0141` should be `DONE`.

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
