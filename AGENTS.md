# Repository Agent Instructions

## Purpose

These instructions define the repository-wide operating contract for autonomous development agents.

Detailed session semantics and local runtime topology are defined in:

@docs/autonomous-development/PROTOCOL.md
@docs/autonomous-development/RUNTIME.md

## Operating contract

- Work only in the repository/worktree already prepared by the Development Session runner.
- Autonomous development sessions target the already checked-out `develop` branch unless a human explicitly prepares another branch before the run.
- Do not change Git branches or Git history.
- Never modify `master` or deploy to production.
- Do not expand the scope of an active task without explicit authorization in that task.
- Do not invent architectural, product, security, billing, or business decisions that are not specified by the task or existing repository documentation.
- When a required decision is missing, mark the task as blocked according to the autonomous-development protocol and stop that task.
- Do not modify sibling repositories. `../MercurionTox21` is a read-only runtime dependency for MercurionWeb autonomous sessions.

## Planning and execution domains

Autonomous-development planning and execution are intentionally separate:

- `docs/autonomous-development/series/` contains non-executable series documents: analysis, planning context, source registries, Trello-card bindings, and task-range bindings.
- `docs/autonomous-development/task/` contains executable task recipes.
- Series membership is owned by the series document through its inclusive YAML `task_range`; task files do not need to encode a backlink to their series.
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
- The working tree may already contain valid changes produced by earlier tasks in the same Development Session. Do not revert or overwrite those changes merely because they are uncommitted.

## Git is read-only

The autonomous coding agent MUST NOT perform any Git operation that changes repository state, refs, the index, the working tree through Git, or a remote repository.

Allowed Git usage is observational only. Examples of allowed commands include:

- `git status`
- `git diff`
- `git log`
- `git show`
- `git grep`
- `git rev-parse`
- `git ls-files`
- `git ls-tree`
- `git cat-file`

Forbidden Git operations include, but are not limited to:

- `git add`
- `git commit`
- `git stash`
- `git checkout`
- `git switch`
- `git restore`
- `git reset`
- `git clean`
- `git branch`
- `git tag`
- `git merge`
- `git rebase`
- `git cherry-pick`
- `git revert`
- `git fetch`
- `git pull`
- `git push`

Do not invoke `gh` or another GitHub client to mutate repository, issue, pull-request, release, workflow, or branch state during an autonomous Development Session.

Task completion does NOT create a commit. The human developer reviews the accumulated working-tree changes and performs Git writes after the Development Session.

## Browser and frontend validation

The repository exposes the `chrome-devtools` MCP server to Copilot CLI through `.github/mcp.json`.

For frontend or browser-observable work:

- follow the canonical local runtime in `docs/autonomous-development/RUNTIME.md`;
- use the nginx development edge at `http://localhost:8888`; never validate the application by browsing the Angular development-server port directly;
- use Chrome DevTools MCP when the active task declares browser validation or when runtime browser behaviour is necessary to establish an acceptance criterion;
- use the browser to inspect the rendered UI and, when relevant, console errors, network requests, runtime state, accessibility/DOM state, responsive behaviour, and screenshots;
- do not treat a successful TypeScript compilation or Angular build as sufficient evidence for a browser-facing acceptance criterion;
- prefer the dedicated MCP-controlled Chrome instance; do not attach to a human developer's personal Chrome profile;
- never browse production or enter production credentials/data during autonomous validation;
- if required browser validation cannot be performed because Chrome DevTools MCP, the canonical local runtime, required test data, or another declared dependency is unavailable, mark the task `BLOCKED` rather than claiming browser validation passed.

Browser validation is not mandatory for backend-only tasks or frontend changes whose acceptance criteria are fully established by static/unit tests unless the task explicitly requires it.

## Validation

Before marking a task as done:

1. Run every validation command required by the task.
2. Run relevant tests for the changed area.
3. Run relevant type checking and linting when available.
4. Run the relevant project build when applicable.
5. Perform declared browser validation when applicable.
6. Verify every acceptance criterion in the task.
7. Verify that no unrelated pre-existing working-tree changes were reverted or modified accidentally.

A task may be marked `DONE` only when all applicable validation and acceptance criteria pass.

## Safety and stopping

- Never deploy or publish as part of an autonomous Development Session unless a future task and runner policy explicitly authorize a non-production deployment action.
- Never access production credentials or production data.
- If validation cannot be restored within the task's retry/budget limits, mark the task `BLOCKED` and stop.
- If a blocked task leaves changes that cannot be safely reverted by ordinary file editing without touching valid earlier-session work, report the dirty task delta and stop the Development Session rather than using Git to restore/reset it.
- If instructions conflict, prefer the narrowest task-specific instruction that does not violate repository-wide safety constraints.