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
- **Pre-merge CI**: the GitHub Actions workflow associated with the exact pushed feature-branch SHA.
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

The coordinator owns deterministic orchestration: task discovery/order, YAML parsing, time/deadlines, branch lifecycle, feature-SHA and merge-SHA CI waiting, merge/revert sequencing, runtime process lifecycle and reporting. The fresh task worker owns local preflight, implementation and task-specific validation inside the currently assigned feature branch.

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

No recipe implementation starts until the repository has the permanent baseline
defined in `docs/autonomous-development/CI-BASELINE.md`. At session startup the
coordinator records the exact local/remote `develop` SHA, requires a successful
GitHub Actions run and `Required gate` result tied to that exact SHA, and reruns
the complete local non-mutating gate set. Neither proof substitutes for the
other.

There is no task-level bootstrap exception. If the workflow is absent, the
exact `develop` SHA is not green, or the local baseline is red, the coordinator
stops before creating a feature branch, invoking an implementation worker, or
changing a recipe outcome. Baseline construction/remediation is a separate
human-authorized activity, not work silently charged to the first pending task.

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

`BLOCKED` is reserved for a task attempt that cannot reach
`READY_FOR_INTEGRATION` because task-caused validation cannot be made green, a
recipe stop condition applies, or required task authority/capability/decision
is missing. A red unchanged baseline is a session-level incident, not
`BLOCKED`.

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

Hard prerequisites must be `DONE`. A hard prerequisite in any terminal non-`DONE` state makes a dependent task eligible for `SKIPPED_DEPENDENCY` only when that dependent reaches its normal filename-order selection point. The coordinator never materializes the full transitive closure in advance. Later independent tasks remain eligible when session policy permits. New or edited recipes SHOULD use exact current filenames and explicitly label non-blocking links as advisory.

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

## Permanent CI-capable baseline

Baseline construction is completed and reviewed outside the numbered workload.
The permanent `.github/workflows/ci.yml` runs the documented root workspace
gate on Windows and Linux for `develop`, `feature/**`, `chore/**`, and pull
requests targeting `develop`. It exposes one stable `Required gate`, never
deploys or publishes, and remains present across ordinary task merges and
reverts.

Local preflight and GitHub Actions both use root `npm ci` followed by
`npm run ci:check`. A task that changes package topology may adapt the workflow,
but MUST preserve continuous `develop` coverage, both platform jobs,
feature-SHA validation, and the stable aggregate gate. It must prove the
adapted workflow on its exact feature SHA before merge.

## Canonical CI parity

The baseline provides the canonical root CI interface. Every task-start and
pre-merge preflight MUST execute the same repository-controlled gate set as
GitHub Actions:

```text
npm ci
npm run ci:check
```

The canonical `ci:check` aggregate MUST cover every repository-controlled
source gate currently available. Task `0008` adds GraphQL/generated-artifact
drift to the existing aggregate. The complete evolving gate set includes:

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

Environment/setup failures originating from GitHub infrastructure are still
possible. Platform-specific repository failures may exist only on the clean
remote runner, which is why exact feature-SHA CI is mandatory before merge.

## Preflight before every task

Immediately after `feature/<Source>` is created and before actual task implementation:

1. prove every session/task-owned Angular, Nest, Tox21, test watcher, and other
   workspace-consuming process is stopped;
2. run the complete CI-parity preflight;
3. if green, record the result and begin the task;
4. if red before task changes exist, stop the session as a baseline invariant
   failure rather than assigning the debt to this task;
5. do not implement, create a task outcome, or use the feature branch to repair
   unrelated baseline debt.

Use the canonical root `npm ci` plus `npm run ci:check` interface from the
permanent baseline onward.

## Task implementation and local completion

Each task receives a fresh Copilot/Sol session. On its feature branch the agent:

1. reads the complete task;
2. inspects relevant code/docs;
3. implements only the specified scope;
4. performs task-specific tests and, only when declared, starts a task-scoped
   runtime after the initial preflight to collect browser validation;
5. stops every task-owned runtime/watcher before a clean install;
6. commits coherent task changes;
7. runs the complete canonical `npm ci` plus `npm run ci:check` gate set again immediately before integration;
8. updates Execution notes;
9. checks `DONE` only when implementation plus every local gate passes.

At this point `DONE` is operationally **CI_PENDING** until both the exact
feature-SHA and exact merge-SHA GitHub Actions runs succeed. The runner MUST NOT
select another task during this interval.

## Integration into develop

After local completion:

1. push the completed feature branch;
2. identify and wait for the GitHub Actions run associated with the exact
   pushed feature SHA; require the complete workflow and `Required gate` to
   succeed;
3. if feature-SHA CI is non-success or unverifiable, apply the pre-merge
   `BLOCKED` lifecycle and do not merge;
4. switch to `develop`;
5. verify `develop` has not changed unexpectedly since the branch was created;
   if it has, reconcile safely without rebase/history rewriting and rerun all
   affected local and remote gates, or block if unsafe;
6. merge `feature/<Source>` into `develop` using `--no-ff --no-gpg-sign` so one
   explicit merge commit identifies the task integration boundary;
7. push `develop`;
8. identify the GitHub Actions run for the exact merge SHA;
9. wait until the workflow reaches a terminal result.

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

If the merge workflow is cancelled, times out, becomes stale/action-required,
or cannot be associated unambiguously with the exact merge SHA within the
configured observation limit, treat the integration as unverified and fail
closed through the same revert-and-`REVERTED` path. Because the permanent
workflow predates every task and the pre-merge parent was proven green, the
revert retains CI coverage. A revert tree mismatch or a revert/status commit
that cannot be observed green is a session-fatal **baseline/upstream
incident**, not permission to blame or start the next task.

Once revert plus `REVERTED` metadata are green, the task is terminal for this session. The coordinator resumes lazy filename-order dependency evaluation and may continue to a later independent task only when `policy.continue_after_terminal_non_done_task` is true and its resolved hard dependencies are all `DONE`.

## Blocking before merge

A task is also `BLOCKED` when safe completion requires missing
authority/information, task validation cannot be restored, or the exact
feature-SHA CI is non-success/unverifiable.

If blocked before integration:

- do not merge partial implementation;
- if the worker had provisionally checked `DONE`, replace it with `BLOCKED` on
  the feature branch, append the remote CI diagnostic, commit/push that
  diagnostic, and then freeze the resulting final branch SHA;
- preserve/push the feature branch for diagnosis and freeze it at that last pushed SHA;
- return to clean `develop`;
- record only the task's `BLOCKED` metadata/diagnostics on `develop`;
- push the metadata commit and require CI on that exact SHA to be green when a workflow exists;
- continue to later independent tasks only when `develop` is green and the task dependency graph allows it.

## Lazy dependency evaluation and SKIPPED_DEPENDENCY

Before creating a feature branch, the coordinator considers pending tasks in
filename order. It may resolve dependency relationships for selection and
diagnostics, but MUST NOT change every member of a transitive closure merely
because one prerequisite became `BLOCKED` or `REVERTED`.

When the one pending task currently at its normal selection point has a hard
prerequisite that is terminal non-`DONE`:

1. do not create or push `feature/<Source>`;
2. do not invoke a task worker or run task implementation/preflight;
3. check only `SKIPPED_DEPENDENCY` on `develop`;
4. record every direct terminal prerequisite and the transitive dependency chain in Execution notes/reporting;
5. leave all later recipes unchanged, even when they are transitively dependent;
6. commit that one task's metadata, push it, and require exact-SHA green CI when a workflow exists before restarting selection.

A skip-metadata CI failure is a session-fatal integration-health incident; it is not attributed to the unattempted skipped task. Independent pending tasks remain eligible after the skip commit is green. Tasks left unattempted solely because the deadline/workload ended remain `PENDING`, not `SKIPPED_DEPENDENCY`. Deadline finalization never performs a speculative skip sweep.

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

The runner/agent may use read-only `gh` commands/API calls to locate and wait
for workflow results by exact feature, merge, revert, and metadata SHAs.

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
- preflight results and references to any separately reviewed baseline remediation;
- task commits and merge SHA for successful integrations;
- feature-SHA and merge-SHA CI run/results for each attempted integration;
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
