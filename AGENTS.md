# Repository Agent Instructions

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
- In GitHub Copilot CLI, the `Development Session Coordinator` is the runner and MUST invoke exactly one fresh, stateless `Development Task Worker` per task through one synchronous `task` tool call. The coordinator never uses background worker mode, delegates two implementation tasks concurrently, or asks one worker to execute more than one recipe.
- Executable task files start at `0001` and use globally progressive four-digit numeric prefixes.
- Read the complete task before changing code.
- Inspect the relevant existing implementation before editing.
- Keep changes narrowly scoped to the task plus any strictly necessary preflight remediation required to restore the canonical CI baseline.
- Prefer existing repository patterns and dependencies over introducing unrelated abstractions or packages.
- Do not infer executable requirements from a series document when the active task recipe is explicit. A series may be consulted as planning context only when useful or explicitly referenced.

## Persistent task outcomes

Every recipe has four mutually exclusive persistent outcomes:

- `DONE`: merged into `develop` and exact merge-SHA CI succeeded;
- `BLOCKED`: attempted but stopped before merge; preserve/freeze its feature branch;
- `REVERTED`: locally completed and merged, then safely reverted after post-merge CI non-success/unverifiable result; preserve/freeze its feature branch;
- `SKIPPED_DEPENDENCY`: never attempted because a hard prerequisite is terminal non-`DONE`; never create a feature branch.

All four unchecked means pending. At most one may be checked. `CI_PENDING` is transient and does not receive a checkbox.

All four persistent outcomes are terminal within the active session. The coordinator MUST NOT reopen or resume a terminal task because a later probe or Autopilot continuation changes its opinion. Only a new direct human instruction in a new or restarted session may authorize re-enablement; an Autopilot continuation is not human authorization.

Reaching a session-fatal blocker is successful completion of the coordinator objective even if pending workload remains. The coordinator finalizes the report, calls `task_complete`, and stops.

## Session startup capabilities

Before recipe work, the coordinator MUST perform the real isolated npm capability probe defined in `PROTOCOL.md`: actual `npm init -y`, actual pinned `npm install --ignore-scripts --no-save is-number@7.0.0`, the Node.js assertion, exact temporary-directory cleanup, and identical clean repository status before and after. A dry run is forbidden.

The coordinator MUST also verify the effective repository-local `commit.gpgSign=false`. Every autonomous commit-producing command uses `--no-gpg-sign`, including ordinary commits, no-fast-forward merges, and reverts. A denied install, network, filesystem, cleanup, GitHub, `task`, MCP, signing, or `task_complete` prerequisite is reported exactly and stops the session.

## Mandatory CI-parity preflight before every task

Before implementing the first task scope, the coordinator MUST establish a clean, fully green repository baseline. Before every later task scope, the runner/agent MUST establish that the newly created `feature/<Source>` branch starts from an exact-SHA CI-green `develop` baseline.

Task `0001` Phase 0 is the one bootstrap exception needed to construct missing deterministic gates or repair known repository-controlled baseline defects. Creating `feature/SYS-001` authorizes Phase 0 only; it does not authorize SYS-001 Phase 1 implementation until the entire bootstrap suite is green. If Phase 0 cannot establish green, stop the session and do not attempt any later task.

The preflight must cover every repository-controlled gate that can fail the canonical CI pipeline, including at minimum:

1. dependency/lockfile integrity using the same clean-install semantics as CI;
2. non-mutating lint checks for Angular and Nest;
3. TypeScript/type/template checks for Angular and Nest;
4. every Angular unit test;
5. every Nest Jest unit test and every Nest Jest E2E suite;
6. Angular and Nest builds;
7. GraphQL/generated-artifact drift checks once those checks exist;
8. every additional static or contract check registered in the canonical CI gate set by later tasks.

Task `0001` Phase 0 MUST also create a minimum bootstrap GitHub Actions workflow that runs the established complete bootstrap gate set on pushes to `develop`. This makes the merge of `0001` and tasks `0002`-`0007` subject to real post-merge CI.

After task `0008` completes the canonical CI interface, the task-start preflight MUST use the same root commands used by GitHub Actions, normally `npm ci` followed by `npm run ci:check`.

Before that canonical interface exists, use the bootstrap checks defined in `PROTOCOL.md`. If a required gate does not yet exist on the initial baseline, the missing gate itself is a preflight defect. The first affected feature branch may establish the minimum deterministic gate as preflight remediation before implementing the task scope.

If preflight fails because of repository-controlled lint/type/test/build/static defects:

- repair those defects on the task feature branch before implementing the task itself;
- keep preflight remediation clearly separated from the task implementation in commits and execution notes when practical;
- rerun the complete preflight after remediation;
- do not begin the task scope until the whole preflight is green.

If the baseline cannot be made green within the configured limits, mark the task `BLOCKED`, preserve the feature branch for diagnosis, and do not merge it into `develop`.

## Git lifecycle for one task

Git writes are REQUIRED for task isolation and CI verification.

For each task:

1. Start from an up-to-date, clean `develop`.
2. Create `feature/<Source>` from that exact `develop` commit.
3. Push the feature branch to `origin` so failed work can be preserved remotely.
4. Run the mandatory CI-parity preflight before task implementation.
5. Implement and validate the task on the feature branch.
6. Commit the task changes on the feature branch. Prefer small, comprehensible commits; do not squash or rewrite history merely for cosmetic reasons.
7. Run the complete CI-parity gate set again immediately before integration.
8. Mark the task `DONE` in the feature branch only when implementation and all local gates pass. The runner MUST treat this state as `CI_PENDING` until post-merge CI succeeds.
9. Switch to `develop`, verify it has not moved unexpectedly, and merge the feature branch using an explicit `--no-ff --no-gpg-sign` merge commit.
10. Push `develop` and wait for the GitHub Actions workflow associated with that merge commit.

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

If a task becomes blocked before merge, do not merge partial implementation. Preserve its feature branch, propagate only the task's `BLOCKED` status/diagnostics to `develop`, and wait for CI on that exact metadata commit.

After a new `BLOCKED` or `REVERTED` status is green, propagate `SKIPPED_DEPENDENCY` transitively to pending tasks that depend on any terminal non-`DONE` prerequisite. Skipped tasks receive no branch and no worker. Batch one propagation pass into a metadata-only `develop` commit and wait for its exact CI before continuing to an independent task.

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

The agent may use `gh` or GitHub read APIs to identify and wait for the workflow run belonging to the exact merge SHA. Remote mutation should otherwise occur through the explicit Git lifecycle above unless a task specifically authorizes another GitHub action.

## Browser and frontend validation

The repository exposes the `chrome-devtools` MCP server to GitHub Copilot CLI through `.github/mcp.json`. The separate VS Code MCP configuration is retained only for ordinary interactive VS Code use and is not the autonomous-session control plane.

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

## Validation before integration

Before a task may be merged:

1. Run every task-specific validation command.
2. Perform declared browser validation when applicable.
3. Run the complete canonical CI-parity gate set, not merely tests for the changed area.
4. Verify every acceptance criterion in the task.
5. Verify the feature branch contains no unrelated changes except documented preflight remediation.

A task may enter the merge/CI phase only when all local checks pass.

## Safety and stopping

- Never deploy or publish as part of an autonomous Development Session unless a future task and runner policy explicitly authorize a non-production deployment action.
- Never access production credentials or production data.
- If validation cannot be restored within the task's retry/budget limits, mark the task `BLOCKED` and stop that task.
- If post-merge CI fails or is unverifiable, the merge MUST be reverted and the task marked `REVERTED` before any later task begins.
- A later independent task may begin after `BLOCKED`/`REVERTED` plus dependency-skip propagation only when session policy permits it and every resulting `develop` commit has returned to exact-SHA green CI.
- At the configured soft deadline, do not start another task. Finish the active task's complete safe lifecycle, write/push the session report, wait for its CI when present, and then stop.
- If instructions conflict, prefer the narrowest task-specific instruction that does not violate repository-wide safety, branch-isolation, or CI-integrity constraints.
