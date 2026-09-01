# Autonomous Development Protocol

This document defines the execution semantics for configurable autonomous Development Sessions.

A **Development Session** is a bounded period in which an external runner executes an ordered workload of task files by invoking a fresh coding-agent session for each task.

## Core concepts

- **Development Session**: one bounded autonomous-development run.
- **Series**: non-executable planning/context document describing a coherent body of work and owning an inclusive range of globally numbered task recipes.
- **Workload**: the ordered set of task files available to one session.
- **Task**: one numbered Markdown implementation recipe executed by one fresh agent invocation.
- **Source**: the planning identifier written in a task, for example `SYS-001` or `FE-001`; it is also the suffix of the task feature branch.
- **Feature branch**: the isolated Git branch `feature/<Source>` used for exactly one task.
- **Integration branch**: `develop`.
- **Preflight**: the complete CI-parity verification run before task implementation begins.
- **Post-merge CI**: the GitHub Actions workflow associated with the explicit merge commit on `develop`.
- **Soft deadline**: after this time no new task may start; the task already in progress may finish its complete branch/CI lifecycle.
- **Hard deadline**: absolute session cutoff; do not start an unsafe merge/revert sequence merely to beat the clock.
- **Capability**: an external tool available to the coding agent, such as Chrome DevTools MCP.
- **Runtime**: the local processes/infrastructure required for runtime/browser validation.
- **Report**: the final session summary.

## Sources of truth

Session timing, workload selection, model/context/reasoning, budgets, runtime configuration and lifecycle policy are defined by the active YAML session configuration.

Series identity, Trello binding, task-range binding, repository/baseline context and optional baseline metadata are defined by each series document's YAML frontmatter.

VS Code workspace-level Copilot configuration is committed in `.vscode/settings.json`; MCP servers used by the VS Code agent are committed in `.vscode/mcp.json`.

The canonical local runtime topology is defined by `docs/autonomous-development/RUNTIME.md`.

The runner owns deterministic orchestration: task discovery/order, YAML parsing, time/deadlines, branch lifecycle, preflight execution, merge/revert sequencing, CI waiting, runtime process lifecycle and reporting. The coding agent owns implementation and task-specific validation inside the currently assigned feature branch.

## Planning domain: series

Series documents live in `docs/autonomous-development/series/` and use globally progressive four-digit prefixes:

```text
0000-series-example.md
0001-first-series.md
0002-second-series.md
...
```

`0000-series-example.md` is the canonical template and MUST NEVER be treated as a real series.

Every real series MUST start with valid YAML frontmatter using this shape:

```yaml
---
series_number: "0001"
card_id: "$oid(...)"
task_range:
  start: "0001"
  end: "0220"
repository: "owner/repository"
branch: "develop"
baseline:
  commit: "<git-sha>"
  label: null
  date: null
---
```

Four-digit identifiers MUST be quoted strings. `task_range` is inclusive and is the deterministic Series -> Task binding. Local identifiers such as `SYS-001` or `FE-001` remain planning identifiers and do not replace the global task number.

## Execution domain: tasks

Task files live in `docs/autonomous-development/task/`:

```text
0000-task-example.md
0001-first-task.md
0002-second-task.md
...
```

Rules:

1. `0000-task-example.md` is the canonical template and MUST NEVER be executed.
2. Executable tasks start at `0001` and task numbers are globally unique.
3. A task contains exactly one `Source:` identifier such as `SYS-001` or `FE-001`; the runner validates it before branch creation.
4. `- [x] DONE` means successfully integrated and CI-approved.
5. `- [x] BLOCKED` means the task must be skipped until explicitly re-enabled by a human.
6. Both unchecked means pending.
7. The runner must never synthesize a missing task recipe from the series during execution.

## Branch isolation: one task, one feature branch

Every task MUST be isolated from every other task.

Before task scope starts, the runner:

1. fetches remote state;
2. switches to `develop`;
3. updates `develop` using fast-forward-only semantics;
4. verifies `develop` is clean and matches the expected remote tip;
5. creates `feature/<Source>` from that exact commit;
6. pushes the new feature branch to `origin`.

A pre-existing local or remote `feature/<Source>` is not overwritten automatically. It indicates a previous/incomplete attempt and requires explicit resume policy or human handling.

No task develops directly on `develop`. Autonomous tasks never touch `master`.

## Phase 0 of task 0001 — mandatory CI-capable green baseline

Task `0001` is special: after `feature/SYS-001` is created, its **first executable work is Phase 0**, whose sole purpose is to construct and prove the repository baseline required for the later canonical CI to be green.

Phase 0 is part of task `0001`, but it runs **before the actual SYS-001 contract/monorepo implementation scope**. It is a hard prerequisite for all subsequent autonomous development.

A missing quality gate is itself a baseline defect. If lint/type/test/build verification does not yet exist deterministically, Phase 0 MUST establish the minimum correct non-mutating gate and then make it green. The agent may not interpret an absent command as permission to skip that quality dimension.

At minimum Phase 0 covers:

### Angular

From `MercurionWebNg`, under the package topology that exists before the workspace migration:

- clean dependency/lockfile installation;
- a supported Angular-compatible non-mutating lint check for TypeScript/templates;
- a separate explicit lint-fix command for remediation;
- TypeScript application typecheck (`tsc --noEmit` against the canonical application tsconfig or equivalent);
- Angular template/AOT type checking as exercised by the production build;
- **all** Angular/Karma tests in non-watch headless mode;
- production build, including configured bundle/budget gates;
- every other deterministic repository-controlled Angular source/static check already applicable.

The audited baseline does not yet expose an Angular lint target. Phase 0 **MUST create/finalize one before SYS-001 implementation begins** and make it green. It is not deferred to a later QA task merely because that later task also describes Angular linting.

### Nest

From `MercurionWebNode`, under the package topology that exists before the workspace migration:

- clean dependency/lockfile installation;
- non-mutating ESLint check over the intended source/test scope;
- a separate explicit lint-fix command for remediation;
- TypeScript typecheck (`tsc --noEmit` against the canonical Nest tsconfig or equivalent);
- **all** Jest unit/spec tests;
- **all** Jest E2E tests using `test/jest-e2e.json`;
- Nest build;
- every other deterministic repository-controlled Nest source/static check already applicable.

The existing Nest `lint` script uses `--fix`; verification MUST NOT rely on that mutating behaviour. Phase 0 establishes separate check/fix semantics before SYS-001 development.

Likewise, a suite printing passing Jest tests but returning a failing process exit status is not green. Phase 0 must fix the repository-controlled testing/bootstrap boundary that causes the failing exit rather than ignoring or masking it.

### Phase 0 remediation precedence

When a Phase 0 gate fails:

1. diagnose the repository-controlled root cause;
2. repair it on `feature/SYS-001`;
3. do not weaken, skip or exclude the gate merely to obtain green output;
4. keep remediation identifiable in commits and Execution notes;
5. rerun the **complete Phase 0 suite**, not only the command that failed;
6. repeat until the whole baseline is green.

If a known baseline defect is also scheduled as a later numbered task, **CI viability takes precedence over numeric task ordering**. Fix the minimum correct root cause in Phase 0 if leaving it unresolved would make the future CI immediately fail. The later task then verifies, refines or becomes effectively satisfied; it is not a reason to carry a deliberately red baseline forward.

No actual SYS-001 contract/workspace implementation begins until Phase 0 is fully green. If the baseline cannot be made green safely without an unresolved product/security/architecture decision, task `0001` becomes `BLOCKED`, and no subsequent autonomous development task may start from that known-red baseline.

After the SYS-001 workspace/contract changes are implemented, the entire Phase 0 quality suite is run again under the new root/workspace topology. Task `0001` may only integrate if the repository remains green.

## Canonical CI parity after task 0008

Task `0008` establishes the canonical root CI interface and `.github/workflows/ci.yml`.

After `0008` is integrated, every task-start and pre-merge preflight MUST execute the same repository-controlled gate set as GitHub Actions:

```text
npm ci
npm run ci:check
```

The canonical `ci:check` aggregate MUST cover every repository-controlled source gate that can make CI fail, including:

- Angular lint check;
- Nest lint check;
- Angular type/template checks;
- Nest typecheck;
- all Angular tests;
- all Nest Jest unit tests;
- all Nest Jest E2E tests;
- Angular production build;
- Nest build;
- GraphQL/generated-artifact drift checks;
- any later static/contract/security-quality gate explicitly registered into the CI aggregate.

A future task that adds a required CI gate MUST also add that gate to the canonical local aggregate. GitHub Actions must not contain hidden source-quality checks that the runner cannot reproduce locally.

Environment/setup failures originating from GitHub infrastructure are still possible, but repository-controlled failures must be reproducible by the local preflight.

## Preflight before every task

Immediately after `feature/<Source>` is created and before actual task implementation:

1. run the complete CI-parity preflight;
2. if green, record the result and begin the task;
3. if red due to repository-controlled lint/type/test/build/static failures, repair the baseline on the feature branch before touching task scope;
4. keep preflight remediation in clearly identified commits/Execution notes when practical;
5. rerun the entire preflight, not only the previously failing command;
6. begin task implementation only after every gate is green.

For task `0001`, the specialized Phase 0 rules above define this first preflight/bootstrap and explicitly allow establishment of missing mandatory quality tooling. For tasks before `0008` is integrated, use the best available equivalent gate set established by preceding tasks. From `0008` onward, use the canonical root `npm ci` + `npm run ci:check` interface.

Preflight remediation may fix routine quality drift and missing deterministic quality tooling. It must not silently make unrelated product/security/architecture decisions. If restoring green requires materially unrelated behavioural work, the task becomes `BLOCKED`.

## Task implementation and local completion

Each task receives a fresh Copilot/Sol session. On its feature branch the agent:

1. reads the complete task;
2. inspects relevant code/docs;
3. implements only the specified scope;
4. performs task-specific tests and declared browser validation;
5. commits coherent task changes;
6. runs the complete canonical CI-parity gate set again immediately before integration;
7. updates Execution notes;
8. checks `DONE` only when implementation plus every local gate passes.

At this point `DONE` is operationally **CI_PENDING** until the merge commit's GitHub Actions run succeeds. The runner MUST NOT select another task during this interval.

## Integration into develop

After local completion:

1. push the completed feature branch;
2. switch to `develop`;
3. verify `develop` has not changed unexpectedly since the branch was created; if it has, reconcile safely without rebase/history rewriting and rerun all affected gates before integration, or block if unsafe;
4. merge `feature/<Source>` into `develop` using `--no-ff` so one explicit merge commit identifies the task integration boundary;
5. push `develop`;
6. identify the GitHub Actions run for the exact merge SHA;
7. wait until the workflow reaches a terminal result.

Do not begin the next task until the merge CI is terminal and the success/failure policy below has completed.

## Post-merge CI success

If the exact merge commit's CI succeeds:

- the task's `DONE` state becomes final;
- record merge SHA and CI run in Execution notes/reporting when available;
- delete `feature/<Source>` from `origin`;
- delete the local feature branch;
- verify `develop` remains the active clean integration branch;
- only then continue to the next task.

## Post-merge CI failure

If CI for the merge commit fails:

1. stop task progression immediately;
2. preserve `feature/<Source>` locally and remotely;
3. on `develop`, create an ordinary revert of the merge commit (mainline parent 1); never reset or rewrite shared history;
4. push the revert commit;
5. wait for the integration branch to return to a green CI state;
6. ensure the task's `DONE` state is no longer present on `develop` after the revert;
7. set `BLOCKED` on the task in `develop` and record the failed merge SHA, CI run/result and diagnostic summary;
8. commit/push that task-status metadata without reintroducing implementation changes;
9. keep the failed feature branch for diagnosis or a later human-approved retry.

A failed merge is never left on `develop` merely because the next task might repair it.

## Blocking before merge

A task is also `BLOCKED` when safe completion requires missing authority/information or when preflight/task validation cannot be restored.

If blocked before integration:

- do not merge partial implementation;
- preserve/push the feature branch for diagnosis;
- return to clean `develop`;
- record only the task's `BLOCKED` metadata/diagnostics on `develop`;
- continue to later independent tasks only when `develop` is green and the task dependency graph allows it.

## Git safety rules

Allowed lifecycle writes: branch creation/deletion, ordinary add/commit, push, explicit no-ff merge into `develop`, ordinary merge revert after failed CI, and metadata-only task-state commits.

Forbidden:

- writes to `master`;
- force-push;
- autonomous rebase/history rewriting;
- hard reset of shared branches;
- bypassing/disabling CI;
- deleting a failed feature branch before review;
- amending/replacing a merge commit after its CI evaluation.

The runner/agent may use read-only `gh` commands/API calls to locate and wait for workflow results by merge SHA.

## Browser capability and local runtime

GitHub Copilot Agent in VS Code loads Chrome DevTools MCP from `.vscode/mcp.json`. Browser/runtime validation uses only the canonical same-origin development edge:

```text
http://localhost:8888
```

The Angular development-server port is an internal nginx upstream and MUST NOT be used as the browser origin.

When required, the runner manages:

```text
MercurionWebNode  -> npm run start:dev
MercurionWebNg    -> npm run start:dev
../MercurionTox21 -> .venv interpreter -> python -m main
```

`../MercurionTox21` remains read-only. The externally managed Docker nginx development proxy remains untouched.

If a task requires browser validation and the canonical runtime/Chrome MCP/test data are unavailable, the task is `BLOCKED`.

## Workload resolution

The runner may resolve an explicit task list, a selected series range, or the global pending queue. Tasks are normally ordered lexicographically by their four-digit prefix. Explicit dependencies override simple numeric readiness: a task whose dependency is not `DONE` must not run.

## Deadline semantics

`end` is a soft deadline. No new task starts at or after it. A task already in progress may finish its current implementation/integration/CI lifecycle when safe.

`hard_stop` is an absolute session guardrail, but it MUST NOT interrupt Git while a shared-branch merge/revert/push is half-completed. If the hard stop approaches during a critical integration operation, finish restoring a consistent `develop` state, then terminate and report the overrun.

## Workload exhaustion

If no pending runnable task remains, the session ends immediately; it does not idle until the configured end time.

## Session finalization and report

At finalization the runner records at least:

- session identifier and actual times;
- stop reason;
- selected series/range;
- tasks completed/blocked/pending;
- feature branch per attempted task;
- preflight results and any baseline remediation;
- task commits and merge SHA for successful integrations;
- CI run/result for each merged task;
- merge-revert SHA for failed integrations;
- preserved failed feature branches;
- final `develop` status and CI health;
- browser/runtime validation summary;
- decisions requiring human attention;
- usage/credit information when available.

Reports live under `docs/autonomous-development/reports/` unless overridden by configuration.
