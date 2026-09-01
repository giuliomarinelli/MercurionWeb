# Autonomous Development Protocol

This document defines the execution semantics for configurable autonomous Development Sessions.

A **Development Session** is a bounded period in which an external runner executes an ordered workload of task files by invoking a fresh coding-agent session for each task.

## Core concepts

- **Development Session**: one bounded autonomous-development run.
- **Series**: non-executable planning/context document describing a coherent body of work and owning an inclusive range of globally numbered task recipes.
- **Workload**: the ordered set of task files available to one session.
- **Task**: one numbered Markdown implementation recipe executed by one fresh agent invocation.
- **Soft deadline**: after this time no new task may start; the task already in progress may finish.
- **Hard deadline**: absolute session cutoff. If reached, the current task must stop safely even if incomplete.
- **Capability**: an external tool available to the coding agent, such as Chrome DevTools MCP for browser validation.
- **Runtime**: the local application processes and externally managed infrastructure required to perform runtime/browser validation.
- **Report**: the final session summary produced after the workload is exhausted or the session stops.

## Sources of truth

Session timing, workload selection, model, context tier, reasoning effort, branch, budgets, enabled capabilities, runtime configuration, permissions, and finish policy are defined by the active YAML session configuration.

Series identity, Trello binding, task-range binding, repository/baseline context, and optional baseline metadata are defined by each series document's YAML frontmatter.

The canonical local runtime topology is defined by `docs/autonomous-development/RUNTIME.md`.

The runner, not the language model, owns:

- task discovery and ordering;
- parsing and validating series YAML frontmatter;
- series/task-range resolution when a series is selected;
- wall-clock time;
- soft/hard deadline enforcement;
- deciding whether another task may start;
- process/session creation and termination;
- managed local-runtime process lifecycle;
- enabling required project-level MCP configuration for unattended prompt-mode runs;
- disabling autonomous GitHub remote-write capabilities;
- recording pre-task and post-task working-tree observations without mutating Git state;
- session-level reporting orchestration.

The coding agent owns only the implementation and validation of the single task recipe it receives using the capabilities made available by the runner/CLI.

## Planning domain: series

Series documents live in `docs/autonomous-development/series/` and use globally progressive four-digit numeric prefixes:

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

Four-digit identifiers MUST be represented as quoted strings so leading zeroes survive YAML parsing.

The `task_range` is inclusive at both ends and is the only deterministic binding between the series domain and the task domain. The frontmatter is the machine-readable source of truth; the runner must not depend on equivalent prose metadata.

Series rules for v1:

1. Series documents are planning/context artifacts, not executable recipes.
2. `card_id` binds the series to the corresponding Trello card; it does not determine task execution.
3. `card_id` may be YAML `null` when no Trello binding exists.
4. Task numbers are global and do not restart for each series.
5. Series task ranges should be contiguous and non-overlapping.
6. `task_range.start` and `task_range.end` must both be valid four-digit identifiers and `start <= end`.
7. A series may contain local planning identifiers such as `SYS-001`, `FE-001`, or similar; those identifiers do not replace global task numbers.
8. Task files do not need to contain a backlink to the owning series. Ownership is declared from the series side through `task_range`.
9. Filenames, `card_id`, prose, or local series identifiers must not be used by the runner to infer series membership when the numeric range is available.

## Execution domain: tasks

Task files live in `docs/autonomous-development/task/` and use globally progressive four-digit numeric prefixes:

```text
0000-task-example.md
0001-first-task.md
0002-second-task.md
...
```

Rules:

1. `0000-task-example.md` is the canonical template and MUST NEVER be executed.
2. Executable task files start at `0001`.
3. Task numbers are unique across the autonomous-development domain.
4. Unless the active session configuration provides an explicit workload list or selects a series, tasks are ordered lexicographically by filename.
5. A task whose header contains `- [x] DONE` is complete and must be skipped.
6. A task whose header contains `- [x] BLOCKED` is blocked and must be skipped unless explicitly re-enabled by a human.
7. A task is pending when both `DONE` and `BLOCKED` are unchecked.

## Git and GitHub write policy

Autonomous coding sessions use Git as an observational interface only.

The coding agent may inspect repository state with read-only commands such as `git status`, `git diff`, `git log`, `git show`, `git grep`, `git rev-parse`, `git ls-files`, `git ls-tree`, and `git cat-file`.

The coding agent MUST NOT stage, commit, stash, restore, checkout, switch, reset, clean, create/delete refs, merge, rebase, cherry-pick, revert, fetch, pull, push, or otherwise mutate Git state or GitHub remote state.

Repository hooks under `.github/hooks/` enforce the read-only Git policy before shell tool execution. The runner should also disable Copilot's built-in GitHub MCP server for autonomous coding sessions so remote mutations are not available as an alternate path.

A task reaching `DONE` therefore means its implementation and validation succeeded in the working tree. It does NOT mean a Git commit was created. Git review, staging, commits, merges, and pushes remain human-managed after the Development Session.

Because several tasks may accumulate as uncommitted changes in one session, the runner should capture a read-only pre-task and post-task working-tree observation so the report can attribute changed files/deltas to each task without creating commits.

## Browser capability and local runtime

GitHub Copilot CLI loads the repository-level Chrome DevTools MCP server from `.github/mcp.json` when project-level MCP configuration is trusted/enabled.

The default repository configuration uses a dedicated headless, isolated Chrome instance. Autonomous sessions must not attach to a human developer's personal browser profile.

Browser/runtime validation uses the canonical topology from `docs/autonomous-development/RUNTIME.md`.

The browser origin is always the nginx development edge:

```text
http://localhost:8888
```

The Angular development-server port is an internal upstream and MUST NOT be used as the browser validation origin. The local stack intentionally relies on nginx to expose Angular and Nest through one same-origin edge.

When runtime/browser validation is needed, the runner manages these application processes:

```text
MercurionWebNode  -> npm run start:dev
MercurionWebNg    -> npm run start:dev
../MercurionTox21 -> .venv interpreter -> python -m main
```

`../MercurionTox21` is a sibling repository and is read-only from MercurionWeb autonomous sessions. The runner invokes its virtual-environment interpreter directly rather than relying on shell-specific virtual-environment activation.

The Docker `nginx_sl_dev` reverse proxy is externally managed and expected to be already running. The runner verifies it but does not start, stop, recreate, or reconfigure it during ordinary development tasks.

Browser validation is task-driven:

1. A frontend/browser-facing task declares required runtime checks in its `Browser validation` section.
2. When browser validation is declared, the runner ensures the canonical runtime is ready before allowing browser validation.
3. The coding agent uses the `chrome-devtools` MCP tools when those tools are needed to establish the stated acceptance criteria.
4. Successful compile/build/lint output is not a substitute for browser evidence explicitly required by a task.
5. If the task declares browser validation and the MCP capability, canonical local runtime, required test data, or another declared prerequisite is unavailable, the task must be marked `BLOCKED`.
6. Backend-only tasks and frontend tasks fully verified by non-browser tests do not need to invoke Chrome unless the task explicitly requires it.
7. Autonomous browser validation must not use production credentials or production data.

For unattended Copilot prompt-mode sessions, project-level MCP configuration is enabled by the runner only after explicit repository trust/review, using the GitHub-supported `GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP=true` environment variable.

## Workload resolution

The runner may resolve a workload in three ways:

1. **Explicit task list**: execute exactly the configured task filenames in the configured order.
2. **Series-selected workload**: parse the selected series' YAML `task_range.start` and `task_range.end`, discover task files whose four-digit prefixes fall inside that inclusive range, and execute pending tasks in filename order unless an explicit order is configured.
3. **Repository task queue**: when neither an explicit list nor a series is selected, discover all pending executable tasks in the task directory in filename order.

When both a series and an explicit task list are configured, every explicit task MUST fall inside the selected series' task range; otherwise configuration validation must fail before starting the session.

The runner must never infer a missing task recipe from a row in a series document during execution. Materializing task recipes from a series is a separate authoring workflow.

## Session lifecycle

### 1. Start

Before starting work, the runner must verify:

- the configured repository branch is already checked out;
- no Git write is required to prepare the session;
- the working-tree baseline is acceptable according to runner policy and is recorded without cleaning/resetting it;
- the session configuration is valid;
- a selected series exists and its YAML frontmatter/range are valid when applicable;
- configured required capabilities are available;
- the canonical runtime can be started/verified when required;
- at least one pending task exists in the resolved workload.

If there are no pending tasks, the session ends immediately and produces a report.

### 2. Select task

The runner selects the next pending task from the resolved workload.

Before launching it, the runner checks the soft deadline.

- If the soft deadline has not been reached, record the task's starting working-tree observation and start the task.
- If the soft deadline has been reached, do not start another task; proceed to session finalization.

### 3. Execute task

Each task runs in a fresh coding-agent session.

The agent must:

1. read the complete task specification;
2. inspect relevant repository code and documentation;
3. formulate an implementation approach;
4. implement only the requested scope;
5. run static/unit/integration validation required by the task;
6. perform declared browser validation when applicable;
7. repair failures caused by its changes within configured limits;
8. update the task's execution notes;
9. mark exactly one terminal state when appropriate;
10. terminate without staging or committing changes.

The runner MUST NOT start the next task until the current agent invocation has terminated and the post-task working-tree observation has been recorded.

### 4. Task completion

A task is `DONE` only when:

- all acceptance criteria are satisfied;
- all required validation, including browser validation when declared, succeeds;
- repository state is safe for later tasks in the same session;
- `DONE` is checked and `BLOCKED` remains unchecked;
- the agent has not performed any Git/GitHub write.

Task completion intentionally leaves implementation changes uncommitted for human review.

### 5. Blocking

A task must be marked `BLOCKED` when safe completion requires information or authority unavailable to the agent, including for example:

- an unspecified architectural decision;
- an unspecified product or business decision;
- a security-sensitive choice not already documented;
- unavailable credentials or external resources;
- unavailable browser/runtime validation explicitly required by the task;
- a materially larger scope than the task describes;
- choosing between materially different externally visible behaviours;
- validation failures that cannot be resolved within configured task limits.

When blocked, the agent must:

1. stop guessing;
2. leave the repository in the safest achievable state;
3. leave `DONE` unchecked;
4. check `BLOCKED`;
5. record the blocker, evidence, changed files, and concrete human decision required in `Execution notes`;
6. revert only changes unambiguously owned by the current task using ordinary file editing when safe;
7. never use Git reset/restore/checkout/stash or another Git write to clean the task;
8. terminate the task.

A blocked task may allow the runner to continue with later independent tasks only if it leaves no unsafe/unattributed working-tree delta. If its partial changes cannot be safely removed without risking valid earlier-session changes, the runner stops the Development Session and reports the dirty delta for human review.

## Deadline semantics

### Soft deadline

The session `end` time is a soft deadline by default.

When the soft deadline is reached:

- no new task may start;
- a task already running may continue to completion;
- when that task ends, the session proceeds directly to finalization.

### Hard deadline

The optional hard deadline is an absolute cutoff.

If it is reached while a task is still executing, the runner must request/perform a safe process stop, preserve diagnostics and the current working-tree state without using Git writes, and proceed to reporting. The task must not be marked `DONE` unless its acceptance and validation requirements were actually completed.

## Workload exhaustion

A session ends early when no pending task remains in its resolved workload.

The runner MUST NOT idle until the configured end time. It proceeds immediately to final validation and report generation.

## Session finalization

When a session finishes because of workload exhaustion, soft-deadline completion, hard stop, fatal runner error, unsafe blocked-task delta, or explicit cancellation, the runner should:

1. inspect repository status using read-only Git commands;
2. run configured session-level validation when enabled;
3. collect task states and per-task working-tree observations;
4. collect unresolved blockers and warnings;
5. record the selected series/range when applicable;
6. record browser/MCP/runtime validation failures relevant to completed or blocked tasks;
7. generate the session report when enabled;
8. stop only the application processes started/owned by the session runner;
9. leave the externally managed Docker nginx proxy untouched;
10. exit without staging, committing, merging, or pushing.

## Session report

A report should contain at least:

- session identifier;
- configured and actual start/finish times;
- stop reason;
- selected series and task range when applicable;
- completed tasks;
- blocked tasks;
- pending/not-started tasks;
- per-task changed-file/diff summary when available;
- final working-tree status;
- configured validation results;
- browser/runtime validation summary when applicable;
- decisions requiring human attention;
- agent/runner errors;
- usage/credit information when available.

Reports should be stored under `docs/autonomous-development/reports/` unless overridden by the active configuration.