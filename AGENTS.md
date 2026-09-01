# Repository Agent Instructions

## Purpose

These instructions define the repository-wide operating contract for autonomous development agents.

Detailed session semantics are defined in:

@docs/autonomous-development/PROTOCOL.md

## Operating contract

- Work only on the branch already checked out by the development-session runner.
- Autonomous development sessions must target `develop` unless the active session configuration explicitly states otherwise.
- Do not create, checkout, merge, rebase, reset, delete, or force-update branches.
- Never modify `master` or deploy to production.
- Do not expand the scope of an active task without explicit authorization in that task.
- Do not invent architectural, product, security, billing, or business decisions that are not specified by the task or existing repository documentation.
- When a required decision is missing, mark the task as blocked according to the autonomous-development protocol and stop that task.

## Planning and execution domains

Autonomous-development planning and execution are intentionally separate:

- `docs/autonomous-development/series/` contains non-executable series documents: analysis, planning context, source registries, Trello-card bindings, and task-range bindings.
- `docs/autonomous-development/task/` contains executable task recipes.
- Series membership is owned by the series document through its inclusive `task_range`; task files do not need to encode a backlink to their series.
- `card_id` is series metadata used to bind a series to its Trello card. It is not an execution dependency.
- `0000-series-example.md` and `0000-task-example.md` are templates only and MUST NEVER be executed.

## Task execution

- Execute exactly one numbered task file per agent invocation.
- Executable task files start at `0001` and use globally progressive four-digit numeric prefixes.
- Read the complete task before changing code.
- Inspect the relevant existing implementation before editing.
- Keep changes narrowly scoped to the task.
- Prefer existing repository patterns and dependencies over introducing new abstractions or packages.
- Do not infer executable requirements from a series document when the active task recipe is explicit. A series may be consulted as planning context only when useful or explicitly referenced.

## Validation

Before marking a task as done:

1. Run every validation command required by the task.
2. Run relevant tests for the changed area.
3. Run relevant type checking and linting when available.
4. Run the relevant project build when applicable.
5. Verify that the working tree contains only changes related to the active task.
6. Verify every acceptance criterion in the task.

A task may be marked `DONE` only when all applicable validation and acceptance criteria pass.

## Git

- A completed task must produce one atomic commit unless the task explicitly states otherwise.
- Follow the repository's existing commit-message convention.
- Do not amend, squash, rebase, force-push, or rewrite existing history.
- Do not commit incomplete work for a task marked `BLOCKED` unless the task explicitly permits a checkpoint commit.

## Safety and stopping

- Never deploy or publish as part of an autonomous development session unless a task explicitly authorizes a non-production deployment action.
- Never access production credentials or production data unless a task explicitly requires it and the session environment has intentionally exposed them.
- If validation cannot be restored within the task's retry/budget limits, mark the task `BLOCKED` and stop.
- If instructions conflict, prefer the narrowest task-specific instruction that does not violate repository-wide safety constraints.
