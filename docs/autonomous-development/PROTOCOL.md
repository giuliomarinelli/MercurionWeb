# Autonomous Development Protocol

This document defines the execution semantics for configurable autonomous development sessions.

A **Development Session** is a bounded period in which an external runner executes an ordered workload of task files by invoking a fresh coding-agent session for each task.

## Core concepts

- **Development Session**: one bounded autonomous-development run.
- **Series**: non-executable planning/context document describing a coherent body of work and owning an inclusive range of globally numbered task recipes.
- **Workload**: the ordered set of task files available to one session.
- **Task**: one numbered Markdown implementation recipe executed by one fresh agent invocation.
- **Soft deadline**: after this time no new task may start; the task already in progress may finish.
- **Hard deadline**: absolute session cutoff. If reached, the current task must stop safely even if incomplete.
- **Report**: the final session summary produced after the workload is exhausted or the session stops.

## Source of truth

Session timing, workload selection, model, branch, budgets, and finish policy are defined by the active YAML session configuration.

Series identity, Trello binding, task-range binding, repository/baseline context, and optional baseline metadata are defined by each series document's YAML frontmatter.

The runner, not the language model, owns:

- task discovery and ordering;
- parsing and validating series YAML frontmatter;
- series/task-range resolution when a series is selected;
- wall-clock time;
- soft/hard deadline enforcement;
- deciding whether another task may start;
- process/session creation and termination;
- session-level reporting orchestration.

The coding agent owns only the implementation of the single task recipe it receives.

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

- the configured repository branch is checked out;
- the working tree is in an acceptable state according to runner policy;
- the session configuration is valid;
- a selected series exists and its YAML frontmatter/range are valid when applicable;
- at least one pending task exists in the resolved workload.

If there are no pending tasks, the session ends immediately and produces a report.

### 2. Select task

The runner selects the next pending task from the resolved workload.

Before launching it, the runner checks the soft deadline.

- If the soft deadline has not been reached, start the task.
- If the soft deadline has been reached, do not start another task; proceed to session finalization.

### 3. Execute task

Each task runs in a fresh coding-agent session.

The agent must:

1. read the complete task specification;
2. inspect relevant repository code and documentation;
3. formulate an implementation approach;
4. implement only the requested scope;
5. validate the result;
6. repair failures caused by its changes within configured limits;
7. update the task's execution notes;
8. mark exactly one terminal state when appropriate;
9. create one atomic commit for a completed task.

The runner MUST NOT start the next task until the current agent invocation has terminated.

### 4. Task completion

A task is `DONE` only when:

- all acceptance criteria are satisfied;
- all required validation succeeds;
- repository state is acceptable;
- the task has been committed according to repository instructions.

The agent then changes:

```md
- [ ] DONE
```

to:

```md
- [x] DONE
```

`BLOCKED` must remain unchecked.

### 5. Blocking

A task must be marked `BLOCKED` when safe completion requires information or authority unavailable to the agent, including for example:

- an unspecified architectural decision;
- an unspecified product or business decision;
- a security-sensitive choice not already documented;
- unavailable credentials or external resources;
- a materially larger scope than the task describes;
- choosing between materially different externally visible behaviours;
- validation failures that cannot be resolved within configured task limits.

When blocked, the agent must:

1. stop guessing;
2. leave the repository in a safe state;
3. avoid committing incomplete implementation unless explicitly allowed;
4. change `- [ ] BLOCKED` to `- [x] BLOCKED`;
5. leave `DONE` unchecked;
6. record the blocker, evidence, and concrete human decision required in `Execution notes`;
7. terminate the task.

A blocked task does not prevent the runner from continuing with later pending tasks unless a later task explicitly declares a dependency on it.

## Deadline semantics

### Soft deadline

The session `end` time is a soft deadline by default.

When the soft deadline is reached:

- no new task may start;
- a task already running may continue to completion;
- when that task ends, the session proceeds directly to finalization.

### Hard deadline

The optional hard deadline is an absolute cutoff.

If it is reached while a task is still executing, the runner must request/perform a safe stop according to its implementation, preserve diagnostics, and proceed to reporting. The task must not be marked `DONE` unless its acceptance and validation requirements were actually completed.

## Workload exhaustion

A session ends early when no pending task remains in its resolved workload.

The runner MUST NOT idle until the configured end time. It proceeds immediately to final validation and report generation.

## Session finalization

When a session finishes because of workload exhaustion, soft-deadline completion, hard stop, fatal runner error, or explicit cancellation, the runner should:

1. inspect repository status;
2. run configured session-level validation when enabled;
3. collect task states and commits produced during the session;
4. collect unresolved blockers and warnings;
5. record the selected series/range when applicable;
6. generate the session report when enabled;
7. exit.

## Session report

A report should contain at least:

- session identifier;
- configured and actual start/finish times;
- stop reason;
- selected series and task range when applicable;
- completed tasks;
- blocked tasks;
- pending/not-started tasks;
- commits created;
- final repository status;
- configured validation results;
- decisions requiring human attention;
- agent/runner errors;
- usage/credit information when available.

Reports should be stored under `docs/autonomous-development/reports/` unless overridden by the active configuration.
