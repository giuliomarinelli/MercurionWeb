# 0142 - Remove or explicitly own every orphan Nest module

- [x] DONE
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
`feature/BE-028`, resumed with the preserved task-scoped working tree at base
`7df6b76252f0ec3043df5cf020df28130e147a96`.
### Preflight
Confirmed the inherited session profile is GPT-5.6 Luna, Medium reasoning and
the default 300k context tier. The feature branch was `feature/BE-028`, its
HEAD matched the supplied green `develop` base, and no task-owned Angular,
Nest, Tox21 or test-watcher process was active. No browser/runtime validation
was required.

Using the preserved implementation, the baseline graph reproduced 18
unreachable production files (346 production files, 328 reachable). The
completed graph reports 328 production files and 328 reachable files, with
five precise documented non-production exceptions.
### Preflight remediation
None. The prior worker's task-scoped deletions and reachability-gate changes
were inspected and preserved; no reset or discard was performed.
### Summary
Removed the unreachable legacy Nest DTOs, interfaces, in-memory repository and
obsolete specs. Added `scripts/check-nest-orphans.mjs` with explicit production
entrypoints, dynamic TypeORM/tooling roots and narrow test/tooling exceptions;
added a synthetic negative fixture; registered both the positive and negative
checks in the architecture policy and dedicated `nest:orphans:check` command.
The production graph now has zero unapproved orphans.
### Task-specific validation performed
- `node scripts/check-nest-orphans.mjs --root=MercurionWebNode --json`:
  passed; 328/328 reachable, zero orphans.
- `node scripts/test-nest-orphans-negative.mjs`: passed; synthetic orphan
  rejected.
- `npm run nest:orphans:check`: passed.
- `node scripts/check-architecture-policy.mjs`: passed, including module graph,
  layer, orphan and negative checks.
- `npm run lint --workspace mercurion_web_node`: passed.
- `npm run typecheck --workspace mercurion_web_node`: passed.
- `npm test --workspace mercurion_web_node -- --runInBand`: passed, 149 suites
  and 464 tests.
- `npm run test:e2e:ci --workspace mercurion_web_node`: passed, 1 suite and 3
  tests.
- `npm run build --workspace mercurion_web_node`: passed.
### Full pre-merge CI-parity validation
The local policy forbids `npm ci` and `npm run ci:check`; clean-install and
aggregate CI parity remain delegated to GitHub Actions for the exact pushed
feature SHA.
### Browser validation performed
Not applicable by recipe.
### Commits
`0d260a5a` — `feat(BE-028): remove orphan Nest modules` (created with
`--no-gpg-sign`).
### Merge / CI
Task-specific commit exists on `feature/BE-028`; the final feature SHA will be
pushed to `origin`. Exact-SHA feature CI is required before integration; this
worker does not modify `develop`.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
