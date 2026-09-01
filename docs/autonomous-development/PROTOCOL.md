# Autonomous Development Protocol

This document defines the execution semantics for configurable autonomous development sessions.

A **Development Session** is a bounded period in which an external runner executes an ordered workload of task files by invoking a fresh coding-agent session for each task.

## Core concepts

- **Development Session**: one bounded autonomous-development run.
- **Workload**: the ordered set of task files available to the session.
- **Task**: one numbered Markdown specification executed by one fresh agent invocation.
- **Soft deadline**: after this time no new task may start; the task already in progress may finish.
- **Hard deadline**: absolute session cutoff. If reached, the current task must stop safely even if incomplete.
- **Report**: the final session summary produced after the workload is exhausted or the session stops.

## Source of truth

Session timing, workload selection, model, branch, budgets, and finish policy are defined by the active YAML session configuration.

The runner, not the language model, owns:

- task ordering;
- wall-clock time;
- soft/hard deadline enforcement;
- deciding whether another task may start;
- process/session creation and termination;
- session-level reporting orchestration.

The coding agent owns only the implementation of the single task it receives.

## Task discovery and ordering

Task files live in `docs/autonomous-development/tasks/` and use four-digit numeric prefixes:

```text
0000-task-example.md
0001-first-task.md
0002-second-task.md
...
```

Rules:

1. `0000-task-example.md` is a template and MUST NEVER be executed.
2. Executable task files start at `0001`.
3. Unless the active session configuration provides an explicit workload list, tasks are ordered lexicographically by filename.
4. A task whose header contains `- [x] DONE` is complete and must be skipped.
5. A task whose header contains `- [x] BLOCKED` is blocked and must be skipped unless explicitly re-enabled by a human.
6. A task is pending when both `DONE` and `BLOCKED` are unchecked.

## Session lifecycle

### 1. Start

Before starting work, the runner must verify:

- the configured repository branch is checked out;
- the working tree is in an acceptable state according to runner policy;
- the session configuration is valid;
- at least one pending task exists.

If there are no pending tasks, the session ends immediately and produces a report.

### 2. Select task

The runner selects the next pending task from the configured workload.

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

A blocked task does not prevent the runner from continuing with later pending tasks unless the task explicitly declares downstream tasks dependent on it.

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

A session ends early when no pending task remains in its workload.

The runner MUST NOT idle until the configured end time. It proceeds immediately to final validation and report generation.

## Session finalization

When a session finishes because of workload exhaustion, soft-deadline completion, hard stop, fatal runner error, or explicit cancellation, the runner should:

1. inspect repository status;
2. run configured session-level validation when enabled;
3. collect task states and commits produced during the session;
4. collect unresolved blockers and warnings;
5. generate the session report when enabled;
6. exit.

## Session report

A report should contain at least:

- session identifier;
- configured and actual start/finish times;
- stop reason;
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
