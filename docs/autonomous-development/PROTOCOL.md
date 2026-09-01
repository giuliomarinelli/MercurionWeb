# Autonomous Development Protocol

This document defines the execution semantics for configurable autonomous Development Sessions.

A **Development Session** is a bounded period in which a session coordinator executes an ordered workload of task files by invoking a fresh, stateless coding worker for each task. GitHub Copilot CLI is the only approved host: the committed `Development Session Coordinator` custom agent is the runner and `Development Task Worker` is the per-task worker. The former VS Code Autopilot/advanced-mode route is unsupported for this workflow.

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
- **Hard deadline**: optional absolute session guardrail; do not start or interrupt an unsafe merge/revert sequence merely to beat the clock.
- **Capability**: an external tool available to the coding agent, such as Chrome DevTools MCP.
- **Runtime**: the local processes/infrastructure required for runtime/browser validation.
- **Report**: the final session summary.

## Sources of truth

Session timing, workload selection, host/context behavior, budgets, runtime configuration and lifecycle policy are defined by the active YAML session configuration. Model and reasoning are intentionally unpinned there and inherit from the parent CLI session.

Series identity, Trello binding, task-range binding, repository/baseline context and optional baseline metadata are defined by each series document's YAML frontmatter.

GitHub Copilot CLI agent profiles are committed in `.github/agents/`, and MCP servers used by autonomous sessions are committed in `.github/mcp.json`. VS Code workspace configuration remains separate and applies only to ordinary interactive VS Code use.

The canonical local runtime topology is defined by `docs/autonomous-development/RUNTIME.md`.

The coordinator owns deterministic orchestration: task discovery/order, YAML parsing, time/deadlines, branch lifecycle, merge/revert sequencing, exact-SHA CI waiting, runtime process lifecycle and reporting. The fresh task worker owns preflight, implementation and task-specific validation inside the currently assigned feature branch.

## GitHub Copilot CLI coordinator/worker topology

The repository provides two workspace custom agents under `.github/agents/`:

- `Development Session Coordinator` remains alive for the complete configured session and is the only owner of task selection, shared-branch Git writes, deadlines, CI observation and final reporting.
- `Development Task Worker` is addressed programmatically as `development-task-worker` (the profile filename without `.agent.md`) and is invoked through exactly one synchronous CLI `task` tool call for exactly one task. Each invocation is fresh and stateless and therefore provides the required task context boundary.

The coordinator creates and pushes the feature branch before invoking the worker. The worker may preflight, implement, validate, commit and push only that feature branch. It never selects a later task, changes `develop`, merges, reverts, deletes a branch or finalizes the session.

Tasks are strictly serialized. The coordinator MUST NOT run implementation workers concurrently, use background worker mode, or invoke another worker before the synchronous result returns. It MUST independently verify the worker result and Git state before any integration write.

The active configuration is a repository contract read by the coordinator; CLI Autopilot does not replace deterministic orchestration. Wall-clock enforcement therefore remains an explicit coordinator duty. The coordinator MUST use an absolute timestamp plus the configured IANA timezone and MUST NOT rely on a long-running shell `sleep` to detect the deadline.

The custom-agent profiles use explicit required tool lists and do not pin a model or reasoning level. They inherit GPT-5.6 Sol and High reasoning from the manually launched parent CLI session without inheriting every unrelated user-scoped tool schema. Both profiles disable inferred invocation; the coordinator is manually invocable, while the worker is not user-invocable and can only be called explicitly through `task`.

GitHub Copilot CLI uses its native automatic context compaction and session checkpoint behavior. Autonomous sessions do not depend on VS Code Responses context-management settings.

## Startup capability and signing invariant

Before recipe implementation or task-branch creation, the coordinator:

1. captures a clean `git status --short`;
2. creates one uniquely named directory under the operating-system temporary directory;
3. runs actual `npm init -y` in that directory;
4. runs actual `npm install --ignore-scripts --no-save is-number@7.0.0`;
5. executes Node.js and asserts `require("is-number")(42) === true`;
6. returns to the repository and deletes exactly that temporary directory;
7. proves `git status --short` is still clean and byte-for-byte identical to the initial result;
8. verifies the effective repository-local value of `commit.gpgSign` is exactly `false`;
9. generates a fresh unpredictable nonce and makes exactly one synchronous `task` call with `agent_type: development-task-worker`, `mode: sync`, and `capability_probe: true` before any task branch exists;
10. requires the worker to return exactly `TASK_CAPABILITY_OK <nonce>` without invoking tools or accessing the repository, and treats an empty, malformed, denied, or mismatched result as a startup failure.

A dry run, skipped install, cache-only substitute, broad temporary-directory cleanup, leftover probe directory, or simulated worker response is a startup failure. The worker capability handshake is session-level and does not count as the exactly-one implementation invocation for a recipe. Every autonomous commit-producing command also passes `--no-gpg-sign`: ordinary commits use `git commit --no-gpg-sign`, integrations use `git merge --no-ff --no-gpg-sign`, and rollback commits use `git revert --no-gpg-sign`.

If any install, network, filesystem, cleanup, GitHub, subagent (`task`), MCP, signing, or `task_complete` prerequisite is denied or asks for additional approval despite the launch permissions, the coordinator stops and reports the exact denial. It never substitutes a weaker check.

## Green-baseline session invariant

No recipe implementation starts until the repository has a clean, complete green baseline. At session startup the coordinator records the exact local/remote `develop` SHA and runs the complete available non-mutating gate set. A previously green workflow is useful evidence but does not replace the local session-start proof.

Task `0001` has one narrowly scoped bootstrap path for a repository whose required checks are missing or currently red: the coordinator may create and push `feature/SYS-001`, but the worker may perform **Phase 0 only** until every mandatory gate passes. Phase 0 is baseline establishment, not SYS-001 feature implementation. If it cannot make the full suite green safely, task `0001` is blocked and the entire session stops; no later recipe may inherit a known-red baseline.

After task `0001` integrates its bootstrap workflow, every `develop` tip used as a later task base must additionally have a successful workflow result tied to that exact SHA. The coordinator records the baseline evidence for every task in its Execution notes and final report.

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
4. Every task contains exactly one checkbox for each persistent terminal state: `DONE`, `BLOCKED`, `REVERTED`, and `SKIPPED_DEPENDENCY`.
5. At most one terminal-state checkbox may be checked. All four unchecked means `PENDING`.
6. `CI_PENDING` is transient coordinator state and is never represented by checking an additional box.
7. The runner must never synthesize a missing task recipe from the series during execution.

### Task outcome semantics

| State | Attempted | Merged | Present on `develop` | Feature branch |
|---|---:|---:|---:|---|
| `DONE` | yes | yes | yes, exact merge-SHA CI succeeded | deleted locally/remotely |
| `BLOCKED` | yes | no | no implementation; metadata only | preserved and frozen |
| `REVERTED` | yes | yes, then reverted | no implementation; rollback/status metadata only | preserved and frozen |
| `SKIPPED_DEPENDENCY` | no | no | metadata only | never created |

`BLOCKED` is reserved for a task attempt that cannot reach `READY_FOR_INTEGRATION`: preflight or task validation cannot be made green, a stop condition applies, or required authority/capability/decision is missing.

`REVERTED` means the task reached local success and was merged, but the exact merge-SHA workflow did not succeed or could not be verified, so the merge was safely rolled back. It distinguishes an integrated-then-withdrawn change from a pre-merge task failure. The report records whether the cause was a confirmed regression, infrastructure failure, cancellation/timeout, or an unverified result.

`SKIPPED_DEPENDENCY` means the task was never attempted because at least one resolved hard prerequisite is terminal as `BLOCKED`, `REVERTED`, or `SKIPPED_DEPENDENCY` rather than `DONE`. It creates no feature branch and invokes no worker. A merely `PENDING`/`CI_PENDING` prerequisite defers selection and does not cause a skip.

All four persistent states are terminal within the active session. The coordinator MUST NOT reopen, resume, retry, or change a `DONE`, `BLOCKED`, `REVERTED`, or `SKIPPED_DEPENDENCY` task because a later probe, tool result, or Autopilot continuation changes its opinion. Only a new direct human instruction in a new or restarted session may authorize re-enablement; an Autopilot continuation is not human authorization. Re-enabling a dependency does not silently clear transitive `SKIPPED_DEPENDENCY` states; those tasks must be reviewed/reset deliberately.

### Dependency semantics

The `Dependencies` section contains both executable prerequisites and, in older recipes, advisory coordination links. The coordinator resolves them as follows:

- `None` declares no hard prerequisite even if the same sentence contains an advisory cross-reference.
- A dependency is **hard** only when the prose says it `must`/`should` be `DONE`, `complete`, `integrated`, `available`, or otherwise required before the task can safely execute.
- Wording such as `may`, `coordinate with`, `when completed`, `should be considered`, or `not required` is advisory and does not block selection.
- A four-digit task number, full task filename, Source identifier, inclusive task range, or inclusive Source range resolves through the Series/task registry. The numeric prefix or Source is the identity; a descriptive slug is not authoritative.
- A range with qualifiers such as `as applicable` requires only the members that actually own code used by the task. The coordinator records the resolved set in Execution notes.
- A task never depends on itself. A forward reference that describes future registration/refinement is advisory unless the recipe explicitly makes the later task a prerequisite; an explicit forward prerequisite makes the current task unrunnable and must be reported as a recipe defect rather than guessed around.

Hard prerequisites must be `DONE`. A hard prerequisite in any terminal non-`DONE` state makes the dependent task `SKIPPED_DEPENDENCY`, but it does not prevent later independent tasks from being considered when session policy permits. New or edited recipes SHOULD use exact current filenames and explicitly label non-blocking links as advisory.

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

### Bootstrap post-merge CI created by task 0001

The per-task merge policy requires real GitHub Actions before task `0008`. Therefore Phase 0 of task `0001` MUST create a minimum `.github/workflows/ci.yml` that:

- runs on every push to `develop` and on ordinary pull requests targeting `develop`;
- performs the complete green bootstrap gate set established by Phase 0 under the current package topology;
- uses deterministic clean-install semantics and non-mutating checks;
- has one unambiguous terminal workflow result that the coordinator can associate with the exact pushed SHA;
- does not deploy, publish, auto-fix or use production credentials.

The merge of task `0001` is the first task merge evaluated by that workflow. Tasks `0002` through `0007` continue to use the same bootstrap workflow and the best available local equivalent. Task `0008` completes that bootstrap into the canonical root `npm ci` plus `npm run ci:check` contract and may restructure the workflow without creating a gap in `develop` push coverage.

## Canonical CI parity after task 0008

Task `0008` completes the canonical root CI interface and upgrades the bootstrap `.github/workflows/ci.yml` created by task `0001`.

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
4. merge `feature/<Source>` into `develop` using `--no-ff --no-gpg-sign` so one explicit merge commit identifies the task integration boundary;
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

A missing remote branch is already clean and is not an error. Other branch-deletion failures are retried within configured limits and then stop the session for manual cleanup without changing the already successful task to `BLOCKED`.

## Post-merge CI non-success and REVERTED

If CI for the merge commit fails:

1. stop the current integration progression immediately;
2. preserve `feature/<Source>` locally and remotely at its last pushed feature SHA;
3. on `develop`, create an ordinary `--no-gpg-sign` revert of the merge commit (mainline parent 1); never reset or rewrite shared history;
4. push the revert commit;
5. verify the revert commit's tree matches the pre-merge `develop` tree, then wait for CI on the exact revert SHA and require the integration branch to return to green;
6. ensure the task's `DONE` state is no longer present on `develop` after the revert;
7. set only `REVERTED` on the task in `develop` and record the failed/unverified merge SHA, CI run/result, cause category and diagnostic summary;
8. commit/push that task-status metadata without reintroducing implementation changes;
9. wait for CI on the exact metadata commit and require it to be green;
10. keep the `REVERTED` feature branch for diagnosis or a later human-approved retry, frozen at the preserved SHA; do not check it out to merge `develop`, commit/amend, reset/rebase, advance, or delete it during this session.

A failed merge is never left on `develop` merely because the next task might repair it.

If the merge workflow is cancelled, times out, becomes stale/action-required, or cannot be associated unambiguously with the exact merge SHA within the configured observation limit, treat the integration as unverified and fail closed through the same revert-and-`REVERTED` path. Since the pre-merge parent was proven green, a revert tree mismatch or a revert/status commit that cannot be observed green is a session-fatal **baseline/upstream incident**, not permission to blame or start the next task. Stop the entire session, record both the last known-green SHA and failing recovery SHA/run, and request human recovery.

Once revert plus `REVERTED` metadata are green, the task is terminal for this session. The coordinator performs dependency-skip propagation and may continue to a later independent task only when `policy.continue_after_terminal_non_done_task` is true and its resolved hard dependencies are all `DONE`.

## Blocking before merge

A task is also `BLOCKED` when safe completion requires missing authority/information or when preflight/task validation cannot be restored.

If blocked before integration:

- do not merge partial implementation;
- preserve/push the feature branch for diagnosis and freeze it at that last pushed SHA;
- return to clean `develop`;
- record only the task's `BLOCKED` metadata/diagnostics on `develop`;
- push the metadata commit and require CI on that exact SHA to be green when a workflow exists;
- continue to later independent tasks only when `develop` is green and the task dependency graph allows it.

## Dependency propagation and SKIPPED_DEPENDENCY

Before creating any feature branch, and again after a new `BLOCKED` or `REVERTED` status becomes exact-SHA green on `develop`, the coordinator resolves the transitive hard-dependency graph.

For each still-pending task whose hard prerequisite is terminal non-`DONE`:

1. do not create or push `feature/<Source>`;
2. do not invoke a task worker or run task implementation/preflight;
3. check only `SKIPPED_DEPENDENCY` on `develop`;
4. record every direct terminal prerequisite and the transitive dependency chain in Execution notes/reporting;
5. batch all newly determined skips from the same propagation pass into one metadata-only commit;
6. push that commit and require exact-SHA green CI when a workflow exists before selecting another task.

A skip-metadata CI failure is a session-fatal integration-health incident; it is not attributed to the unattempted skipped tasks. Independent pending tasks remain eligible after the skip commit is green. Tasks left unattempted solely because the deadline/workload ended remain `PENDING`, not `SKIPPED_DEPENDENCY`.

## Git safety rules

Allowed lifecycle writes: branch creation/deletion, ordinary add/commit, push, explicit no-ff merge into `develop`, ordinary merge revert after failed CI, metadata-only task-state commits, and the final metadata-only session-report commit.

Forbidden:

- writes to `master`;
- force-push;
- autonomous rebase/history rewriting;
- hard reset of shared branches;
- bypassing/disabling CI;
- deleting a `BLOCKED` or `REVERTED` feature branch before review;
- amending/replacing a merge commit after its CI evaluation.

The runner/agent may use read-only `gh` commands/API calls to locate and wait for workflow results by merge SHA.

## Browser capability and local runtime

GitHub Copilot CLI loads Chrome DevTools MCP from `.github/mcp.json`. Browser/runtime validation uses only the canonical same-origin development edge:

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

The runner may resolve an explicit task list, a selected series range, or the global pending queue. Tasks are normally ordered lexicographically by their four-digit prefix. Resolved hard dependencies override simple numeric readiness: a pending/active prerequisite defers the dependent task, while a terminal non-`DONE` prerequisite propagates `SKIPPED_DEPENDENCY`. Advisory references never create dependency cycles.

## Deadline semantics

`start`, `end` and an optional `hard_stop` SHOULD be absolute RFC 3339 timestamps. The configured IANA timezone is authoritative for display/reporting and for resolving any explicitly supported local-time value. The coordinator validates that `end` is after the actual start and records the actual start timestamp in session state/reporting; it does not mutate the active YAML during execution.

`end` is a soft deadline. No new task starts at or after it. A task already in progress finishes its complete implementation/integration/CI/status/branch lifecycle when safe and then the session finalizes. Reaching `end` does not abandon a feature branch or leave `develop` in `CI_PENDING`/failed/unverified state.

When configured, `hard_stop` is an absolute session guardrail, but it MUST NOT interrupt Git while a shared-branch merge/revert/push is half-completed. If the hard stop approaches during a critical integration operation, finish restoring a consistent `develop` state, then terminate and report the overrun. A null/omitted `hard_stop` means the user chose the soft-deadline semantics only.

## Workload exhaustion

If no pending runnable task remains, the session ends immediately; it does not idle until the configured end time.

## Session finalization and report

At finalization the runner records at least:

- session identifier and actual times;
- stop reason;
- selected series/range;
- tasks `DONE`, `BLOCKED`, `REVERTED`, `SKIPPED_DEPENDENCY`, and still pending;
- feature branch per attempted task;
- preflight results and any baseline remediation;
- task commits and merge SHA for successful integrations;
- CI run/result for each merged task;
- merge-revert SHA for `REVERTED` integrations;
- preserved/frozen `BLOCKED` and `REVERTED` feature branches;
- direct/transitive dependency chains for `SKIPPED_DEPENDENCY` tasks;
- final `develop` status and CI health;
- browser/runtime validation summary;
- decisions requiring human attention;
- usage/credit information when available.

Reports live under `docs/autonomous-development/reports/` unless overridden by configuration. `0000-session-report-template.md` is the canonical non-executable report skeleton.

The coordinator writes the report from a clean `develop` after the active task lifecycle is terminal. It commits and pushes the report as session metadata and, when a workflow exists, waits for CI on that exact report commit before declaring final repository health. A report-CI failure is a session-finalization blocker; it does not retroactively change successfully completed task states.

After final repository health is recorded, the coordinator emits the concise final summary and report path, then calls `task_complete` as the final Autopilot action. It performs no further prose or tool calls after `task_complete`.

Reaching a session-fatal blocker is successful completion of the coordinator objective even when pending workload remains. After restoring the safest possible repository state, the coordinator finalizes the report, emits the concise final summary and report path, calls `task_complete` as the final Autopilot action, and stops; it produces no further prose/tool calls, never reopens a terminal task, and never starts pending work to avoid reporting the blocker.
