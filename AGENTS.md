# Repository Agent Instructions

## MercurionWebNode development runtime

Use these commands only when the active task has reached its declared
runtime/browser-validation phase. They do not override the task-scoped runtime
rules in `docs/autonomous-development/RUNTIME.md`.

**Working directory**: the `MercurionWeb` repository root.

1. **Start**
```bash
npm run start --workspace mercurion_web_node
```

2. **Start in *watch mode***
```bash
npm run start:dev --workspace mercurion_web_node
```

3. **Start in *watch mode* with *attachable debugger***
```bash
npm run start:debug --workspace mercurion_web_node
```

## Purpose

These instructions define the repository-wide operating contract for autonomous development agents.

Detailed session semantics and local runtime topology are defined in:

@docs/autonomous-development/PROTOCOL.md
@docs/autonomous-development/RUNTIME.md

## Operating contract

- GitHub Copilot CLI is the only approved host for autonomous Development Sessions. The former VS Code Autopilot/advanced-mode route is unsupported for this workflow; `.vscode` configuration remains available only for ordinary interactive VS Code use.
- The integration branch for autonomous development is `develop`.
- Every executable task MUST run on its own branch named exactly `feature/<Source>`, where `<Source>` is the task's planning identifier such as `SYS-001` or `FE-001`.
- Never develop directly on `develop`.
- Never modify `master` or deploy to production.
- Never use rebase, force-push, history rewriting, or destructive cleanup to make a task appear successful.
- Do not expand the scope of an active task without explicit authorization in that task.
- Do not invent architectural, product, security, billing, or business decisions that are not specified by the task or existing repository documentation.
- When a required decision is missing, mark the task as blocked according to the autonomous-development protocol.
- Do not modify sibling repositories. `../MercurionTox21` is a read-only runtime dependency for MercurionWeb autonomous sessions.

## Planning and execution domains

Autonomous-development planning and execution are intentionally separate:

- `docs/autonomous-development/series/` contains non-executable series documents: analysis, planning context, source registries, Trello-card bindings, and task-range bindings.
- `docs/autonomous-development/task/` contains executable task recipes.
- Series membership is owned by the series document through its inclusive YAML `task_range`; task files do not need to encode a backlink to their series.
- `card_id` is series metadata used to bind a series to its Trello card. It is not an execution dependency.
- `0000-series-example.md` and `0000-task-example.md` are templates only and MUST NEVER be executed.

## Task execution

- Execute exactly one numbered task file per coding-agent invocation.
- In GitHub Copilot CLI, the `Development Session Coordinator` is the runner and MUST invoke one fresh, stateless primary `Development Task Worker` per task through a synchronous `task` tool call using the repository-agent identifier `development-task-worker`. After an actionable exact feature-SHA CI failure it may invoke fresh synchronous repair workers for that same task within the configured repair budget. The coordinator never explicitly uses background worker mode, delegates two workers concurrently, or asks one worker to execute more than one recipe.
- Executable task files start at `0001` and use globally progressive four-digit numeric prefixes.
- Read the complete task before changing code.
- Inspect the relevant existing implementation before editing.
- Keep changes narrowly scoped to the active task.
- Do not use an ordinary task branch to repair unrelated baseline debt. The permanent baseline is established outside the numbered workload and must already be green before a task branch is created.
- Prefer existing repository patterns and dependencies over introducing unrelated abstractions or packages.
- Do not infer executable requirements from a series document when the active task recipe is explicit. A series may be consulted as planning context only when useful or explicitly referenced.

## Persistent task outcomes

Every recipe has four mutually exclusive persistent outcomes:

- `DONE`: merged into `develop` and exact merge-SHA CI succeeded;
- `BLOCKED`: attempted but stopped before merge; preserve/freeze its feature branch;
- `REVERTED`: locally completed and merged, then safely reverted after post-merge CI non-success/unverifiable result; preserve/freeze its feature branch;
- `SKIPPED_DEPENDENCY`: never attempted because a hard prerequisite is terminal non-`DONE`; never create a feature branch.

All four unchecked means pending. At most one may be checked. `CI_PENDING`,
`WAITING_DEPENDENCY`, and `SESSION_CAPABILITY_PAUSE` are transient coordinator
states and do not receive checkboxes. A capability pause occurs before
implementation when required local runtime or non-production browser
authentication is unavailable; it defers only that task for the remainder of
the active session without changing the recipe or propagating dependency
skips. The coordinator records the paused task in a session-local exclusion set
and continues with the next independent `READY` task. It never retries the same
paused task in that session.

Autonomous eligibility is orthogonal to these outcomes. A non-empty
`workload.tasks` list is an exact session allowlist; an omitted recipe remains
`PENDING` for human-led or later-session work. Never mark a recipe `BLOCKED` or
`SKIPPED_DEPENDENCY` merely because it was excluded from autonomous execution.

All four persistent outcomes are terminal within the active session. The coordinator MUST NOT reopen or resume a terminal task because a later probe or Autopilot continuation changes its opinion. Only a new direct human instruction in a new or restarted session may authorize re-enablement; an Autopilot continuation is not human authorization.

Reaching a session-fatal blocker is successful completion of the coordinator objective even if pending workload remains. The coordinator finalizes the report, emits its concise final summary and report path, calls `task_complete` as the final Autopilot action, and stops.

## Session startup capabilities

Before recipe work, the coordinator MUST perform the real isolated npm capability probe defined in `PROTOCOL.md`: actual `npm init -y`, actual pinned `npm install --ignore-scripts --no-save is-number@7.0.0`, the Node.js assertion, exact temporary-directory cleanup, and identical clean repository status before and after. A dry run is forbidden.

Before creating a task branch, the coordinator MUST also make exactly one session-level, non-mutating synchronous `task` handshake using `agent_type: development-task-worker`, `capability_probe: true`, and a fresh nonce. The worker returns exactly `TASK_CAPABILITY_OK <nonce>` without invoking tools or touching the repository. Empty, denied, malformed, or mismatched delegation stops the session before Git state is changed.

The coordinator MUST also verify the effective repository-local `commit.gpgSign=false`. Every autonomous commit-producing command uses `--no-gpg-sign`, including ordinary commits, no-fast-forward merges, and reverts. A denied install, network, filesystem, cleanup, GitHub, `task`, MCP, signing, or `task_complete` prerequisite is reported exactly and stops the session.

## Remote CI baseline and local validation policy

Before any task branch exists, the coordinator MUST establish a clean, fully
green repository baseline according to
`docs/autonomous-development/CI-BASELINE.md`. Local `develop` must equal
`origin/develop`; the exact SHA must have a fresh successful GitHub Actions
`full` run with both platform jobs and the stable `Required gate`. A `metadata`
or `duplicate` result alone is insufficient to start a new session.

Autonomous sessions MUST NEVER run `npm ci` or `npm run ci:check` locally. The
clean install and complete aggregate are GitHub Actions responsibilities only.
This direct human policy overrides older launch documents, session YAML fields,
and task recipes that still mention either local command. Local validation is
limited to focused commands proportionate to the changed area and must reuse
the existing dependency tree. Never use `require.resolve`, package-manifest
resolution, or import probes to declare that tree unusable. For runtime work,
only the canonical start commands and their actual output decide usability.

There is no task `0001` bootstrap exception. Missing CI, a red exact-SHA run,
or a red local baseline is a session-level startup failure. Stop before branch
creation or task outcome mutation and request a separate human-authorized
baseline repair.

The preflight must cover every repository-controlled gate that can fail the canonical CI pipeline, including at minimum:

1. dependency/lockfile integrity using the same clean-install semantics as CI;
2. non-mutating lint checks for Angular and Nest;
3. TypeScript/type/template checks for Angular and Nest;
4. every Angular unit test;
5. every Nest Jest unit test and every Nest Jest E2E suite;
6. Angular and Nest builds;
7. GraphQL/generated-artifact drift checks once those checks exist;
8. every additional static or contract check registered in the canonical CI gate set by later tasks.

The permanent GitHub Actions workflow predates every numbered task. It runs on
feature branches and `develop` on Windows and Linux and must survive ordinary
task merges and reverts.

GitHub Actions MUST use root `npm ci` followed by `npm run ci:check`. Task
`0008` extends this existing aggregate with GraphQL/generated-artifact drift
gates; it does not create the root workspace or first canonical CI interface.

Every session-owned Angular, Nest, Tox21, test watcher, or other process that
can load files from the workspace MUST be stopped before task handoff. The runner
must not start watch-mode/runtime processes speculatively at session startup or
before a worker completes its unchanged task-start preflight. For a task that
declares browser/runtime evidence, the worker starts the canonical runtime after
that task-start preflight and before implementation to prove capability, stops
it after the capability evidence, and restarts it after implementation for the
declared browser validation. It must stop every task-owned runtime again before
handoff; full clean-install validation remains owned by GitHub Actions.

A missing or red root baseline gate is a session failure that requires a
separate human-authorized repair; no numbered task or task branch may bootstrap
or repair it.

If preflight fails before the task has changed code, stop the session as a
baseline invariant failure. Do not assign the pre-existing defect to the task,
mark the recipe `BLOCKED`, or use its branch for global remediation.

## Git lifecycle for one task

Git writes are REQUIRED for task isolation and CI verification.

For each task:

1. Start from an up-to-date, clean `develop`.
2. Create `feature/<Source>` locally from that exact `develop` commit; do not push while its HEAD still equals the already-green base SHA.
3. Confirm exact base-SHA Actions evidence and run focused local checks only.
4. Implement and validate the task on the feature branch.
5. Commit the task changes on the feature branch. Prefer small, comprehensible commits; do not squash or rewrite history merely for cosmetic reasons.
6. Run focused task validation immediately before integration; exact
   feature-SHA Actions supplies the complete clean-install/aggregate evidence.
7. Mark the task `DONE` in the feature branch only when implementation and all local gates pass. The runner MUST treat this state as `CI_PENDING` until both feature and post-merge CI succeed.
8. Create the remote feature ref only after a task-specific commit exists, push the final feature SHA, and wait for its exact GitHub Actions `Required gate`.
9. If exact feature-SHA CI fails with an actionable repository-controlled diagnostic, keep the task `DONE`/`CI_PENDING`, invoke a fresh synchronous CI-repair worker on the same unfrozen feature branch, commit/push the narrow correction, and require a new exact feature-SHA CI run. Repeat within the configured repair budget. Only a non-actionable/unverifiable result or exhausted repeated repair budget may transition to `BLOCKED`.
10. Only after exact feature-SHA CI succeeds, switch to `develop`, verify it has not moved unexpectedly, and merge the feature branch using an explicit `--no-ff --no-gpg-sign` merge commit.
11. Push `develop` and wait for the GitHub Actions workflow associated with that exact merge commit.

If post-merge CI succeeds:

- the task's `DONE` state becomes final;
- delete `feature/<Source>` locally and remotely;
- only then may the runner select the next task.

If post-merge CI fails:

- stop the current integration progression immediately;
- revert the merge commit on `develop` with an ordinary `--no-gpg-sign` revert commit; never reset or rewrite shared history;
- push the revert and verify the integration branch returns to a green state;
- update the task on `develop` to `REVERTED`, recording the failed/unverified workflow, merge/revert SHAs, cause category and reason;
- push the metadata-only status commit and wait for CI on that exact commit;
- preserve the local and remote `feature/<Source>` branch for diagnosis or later human-approved retry;
- once its final feature SHA is pushed, freeze that divergent branch: do not merge `develop` into it, commit/amend it, reset/rebase it, advance it, or delete it during the session.

If a task becomes blocked before merge after its configured feature-CI repair
budget is exhausted, or because CI cannot be verified, do not merge partial implementation. Preserve and
freeze its feature branch, propagate only the task's `BLOCKED`
status/diagnostics to `develop`, and wait for CI on that exact metadata commit.

The permanent CI always publishes the stable `Required gate`, using exactly
one fail-closed path: `duplicate` only after an older successful run for the
identical SHA; `metadata` only for allowlisted autonomous task/report
Markdown changes from an exact green base; otherwise `full` Windows/Linux
validation. Workflow, source, test, dependency, agent, protocol,
configuration, unknown, and ambiguous changes always use `full`.
Autonomous task/report metadata is forbidden from acting as input evidence for
application inventories or generated application artifacts.

Before selection, run `npm run autonomous:plan` and consume its versioned JSON
as the sole authoritative dependency snapshot. Never reconstruct the graph by
memory or LLM inference; a planner failure, malformed output, cycle, missing
hard dependency, or stale terminal skip is a configuration incident.
A recipe with pending/active hard prerequisites is transient
`WAITING_DEPENDENCY`; a recipe whose hard-prerequisite chain contains a
terminal non-`DONE` outcome belongs to the terminal skip closure. Materialize
all newly affected descendants as `SKIPPED_DEPENDENCY` in one aggregate
metadata-only `develop` commit, with direct and transitive diagnostics for
each. Skipped recipes receive no branch, worker, implementation preflight, or
individual commit/push. Wait for the aggregate commit's exact adaptive
`Required gate`, then select the earliest filename-ordered recipe whose hard
dependencies are all `DONE`.

The runner may continue only when active session policy permits it, `develop` is clean/exact-SHA green, and the next task's hard dependencies are all `DONE`. Because every task integrates from a proven-green `develop`, a revert that does not restore the pre-merge tree and exact-SHA green CI is a session-fatal baseline/upstream incident. Stop the entire session, report it separately from the task outcome, and do not use a later task to repair or conceal it.

## Git safety constraints

Allowed task/session-lifecycle writes include ordinary branch creation, add/commit, push, no-ff merge into `develop`, merge revert after failed CI, branch deletion after successful CI, metadata-only commits needed to record `BLOCKED`, `REVERTED`, or `SKIPPED_DEPENDENCY`, and the final session-report commit.

Forbidden operations include:

- any write to `master`;
- force-push;
- rebase of autonomous task history;
- `reset --hard` or equivalent history rewriting on shared branches;
- deleting a `BLOCKED` or `REVERTED` feature branch before human review;
- bypassing or disabling CI to obtain a green result;
- amending/replacing a pushed merge commit after CI has evaluated it.

The agent may use `gh` or GitHub read APIs to identify and wait for workflow
runs belonging to the exact feature and merge SHAs. Remote mutation should
otherwise occur through the explicit Git lifecycle above unless a task
specifically authorizes another GitHub action.

## Browser and frontend validation

The repository exposes the `chrome-devtools` MCP server to GitHub Copilot CLI
through `.github/mcp.json`. The separate VS Code MCP configuration is retained
only for ordinary interactive VS Code use and is not the autonomous-session
control plane. Autonomous Chrome uses the MCP server's dedicated persistent
default profile, never `--isolated`, Incognito, Guest, or the developer's
personal Chrome profile. Browser profile lifetime is session-independent;
application runtime lifetime remains task-scoped.

For frontend or browser-observable work:

- follow the canonical local runtime in `docs/autonomous-development/RUNTIME.md`;
- use the nginx development edge at `http://localhost:8888`; never validate the application by browsing the Angular development-server port directly;
- before the task worker has started Tox21, Nest and Angular and recorded live
  long-running execution-session handles for all three, it MUST NOT make any
  HTTP request, health check, browser navigation, or diagnostic edge-liveness
  probe; process inventory is local-only and a pre-start 502 is discarded as a
  protocol-ordering error, never surfaced for human interpretation;
- distinguish nginx listener liveness from proxied-service readiness: any HTTP response from `localhost:8888`, including the default nginx `502 Bad Gateway` while a task-scoped upstream is stopped, proves the edge is reachable; only a transport-level failure such as `ECONNREFUSED` on port `8888` indicates that nginx itself is unavailable;
- use Chrome DevTools MCP when the active task declares browser validation or when runtime browser behaviour is necessary to establish an acceptance criterion;
- start the canonical runtime only after exact base-SHA Actions evidence and
  focused task-start checks have succeeded, and only when the active task
  actually requires runtime/browser evidence;
- start Nest, Angular, and Tox21 with the direct canonical commands in separate
  long-running execution sessions; keep them alive and allow up to five minutes
  for their first builds, polling process output and requiring two consecutive
  successful readiness rounds. Do not use a repository PowerShell runtime
  supervisor;
- classify a missing `nest` or other npm workspace executable as a failed
  install/baseline invariant, never as nginx unavailability or
  `SESSION_CAPABILITY_PAUSE`; an nginx 502 proves the edge is live and only
  means its upstream is not ready yet;
- stop every task-owned runtime process before task handoff and before the
  coordinator proceeds;
- use the browser to inspect the rendered UI and, when relevant, console errors, network requests, runtime state, accessibility/DOM state, responsive behaviour, and screenshots;
- do not treat a successful TypeScript compilation or Angular build as sufficient evidence for a browser-facing acceptance criterion;
- prefer the dedicated MCP-controlled Chrome instance; do not attach to a human developer's personal Chrome profile;
- the task worker is the sole browser owner; the coordinator and another worker must not control the profile concurrently;
- reuse the dedicated profile for browser isolation, but never rely on its stored authentication; every worker requiring protected state performs a fresh ordinary login with the shared account configured in the git-ignored development environment;
- after the unchanged task-start baseline and before implementation, a task requiring browser/runtime evidence must prove runtime readiness and any required authenticated state; failure returns `SESSION_CAPABILITY_PAUSE` with no task mutation rather than `BLOCKED` or dependency skips, and the coordinator continues with the next independent `READY` task not already paused in this session;
- a task that explicitly tests logout may leave the dedicated profile anonymous; the next worker logs in again, so this state alone never emits `BROWSER_PROFILE_RECOVERY_REQUIRED` or stops later task selection;
- never browse production or enter production credentials/data during autonomous validation;
- if browser/runtime capability is unavailable before implementation, return `SESSION_CAPABILITY_PAUSE`; if task-caused changes or an acceptance-specific post-implementation problem prevent required validation, mark the task `BLOCKED` rather than claiming browser validation passed.

Browser validation is not mandatory for backend-only tasks or frontend changes whose acceptance criteria are fully established by static/unit tests unless the task explicitly requires it.

## Validation before integration

Before a task may be merged:

1. Run every task-specific validation command.
2. Perform declared browser validation when applicable.
3. Use the exact feature-SHA GitHub Actions gate as the repository-wide
   validation; local checks remain focused.
4. Verify every acceptance criterion in the task.
5. Verify the feature branch contains no unrelated changes except documented preflight remediation.
6. Push the exact final feature SHA and require the permanent Windows/Linux
   GitHub Actions `Required gate` to succeed before merge.

A task may enter the merge/CI phase only when all local checks pass.

## Safety and stopping

- Never deploy or publish as part of an autonomous Development Session unless a future task and runner policy explicitly authorize a non-production deployment action.
- Never access production credentials or production data.
- If validation cannot be restored within the task's retry/budget limits, mark the task `BLOCKED` and stop that task.
- If post-merge CI fails or is unverifiable, the merge MUST be reverted and the task marked `REVERTED` before any later task begins.
- A later independent task may begin after `BLOCKED`/`REVERTED` plus dependency-skip propagation only when session policy permits it and every resulting `develop` commit has returned to exact-SHA green CI.
- At the configured soft deadline, do not start another task. Finish the active task's complete safe lifecycle, write/push the session report, wait for its CI when present, and then stop.
- If instructions conflict, prefer the narrowest task-specific instruction that does not violate repository-wide safety, branch-isolation, or CI-integrity constraints.
