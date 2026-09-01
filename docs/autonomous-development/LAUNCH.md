# Launch the overnight Development Session

This run is configured by:

```text
docs/autonomous-development/session.overnight-2026-09-01.yaml
```

Its soft deadline is **2026-09-02 10:00 CEST** (`2026-09-02T10:00:00+02:00`). At that instant the coordinator starts no new recipe, completes the active task's full safe lifecycle, writes/pushes the report, waits for exact report-commit CI when available, and stops. The configuration has no hard stop.

## Launch gate

Pull request `#25` is the historical bootstrap/configuration PR and is already merged. It remains immutable session provenance: the coordinator must not edit or otherwise operate it. Launch only after the complete GitHub Copilot CLI control-plane migration—including the coordinator/worker profiles, `.github/mcp.json`, this guide, and `validate-cli-runner.mjs`—is present on `origin/develop`; otherwise the committed runner contract is not active on the integration branch.

Never reuse this one-time YAML at or after its deadline. Create a new dated configuration instead.

## Pre-launch checklist

1. Merge the current GitHub Copilot CLI runner migration into `develop`. In the repository checkout, fetch `origin`, check out `develop`, and fast-forward it to `origin/develop`. The worktree must be clean and `develop` must equal `origin/develop`.
2. Use a current GitHub Copilot CLI with custom agents, the `task` tool, `task_complete`, MCP, and Autopilot support. Restart the CLI after the migration reaches the checked-out `develop`, because repository custom agents are loaded when a CLI session starts. The former VS Code Autopilot/advanced-mode route is unsupported for this overnight workflow.
3. Start GitHub Copilot CLI from the MercurionWeb repository root. Keep the parent CLI session, machine, network and GitHub authentication available for the complete run; disable automatic sleep for the night.
4. Confirm GitHub authentication can read Actions and push ordinary branches/`develop`. Do not launch with production credentials or broader unrelated repository access in the agent environment.
5. Run the structural recipe check:

   ```text
   node docs/autonomous-development/tools/validate-recipes.mjs
   node docs/autonomous-development/tools/validate-cli-runner.mjs
   ```

   Recipe validation must report 1 series, 220 tasks, 220 Sources, and zero errors/warnings. CLI runner validation must pass.
6. Confirm no local or remote `feature/<Source>` branch already exists for the next runnable task. An existing branch is a prior attempt and must not be overwritten or reused autonomously.
7. Confirm `../MercurionTox21` and its virtual environment exist and remain read-only. Confirm the externally managed nginx development edge is available at `http://localhost:8888` before any task requiring browser validation. A missing runtime capability blocks that task; it does not authorize alternate ports or production access.
8. From the MercurionWeb root, launch the coordinator with the deterministic repository-agent identifier and permissions required for unattended npm/Git/network work. The sibling repository is added explicitly instead of disabling all path verification:

   ```text
   copilot --agent development-session-coordinator --allow-all-tools --allow-all-urls --add-dir ../MercurionTox21 --reasoning-effort high --autopilot
   ```

9. In the fresh parent session, use `/model` to verify **GPT-5.6 Sol** and **High** reasoning, `/permissions show` to verify the launch grants, `/mcp list` to verify `chrome-devtools` is connected, and `/keep-alive on` to prevent machine sleep. The agent profiles inherit the parent model/reasoning and use explicit tool lists rather than inheriting every unrelated user-scoped tool.
10. Paste the starting prompt below once. Before any task branch is created, the coordinator must perform the real npm probe and one synchronous nonce-correlated `development-task-worker` handshake. Do not start a second coordinator against the same checkout.

## Starting prompt

```text
Run the complete autonomous Development Session defined by `docs/autonomous-development/session.overnight-2026-09-01.yaml` as the `Development Session Coordinator`.

First read the active YAML, `AGENTS.md`, `docs/autonomous-development/PROTOCOL.md`, and `docs/autonomous-development/RUNTIME.md` in full. Validate every startup precondition before making repository writes. Refuse to launch if the complete current Copilot CLI runner control plane is not represented in `origin/develop`, `node docs/autonomous-development/tools/validate-cli-runner.mjs` does not pass, the deadline has passed, the worktree/base/authentication/capabilities are unsafe, or a required decision remains unresolved. PR #25 is already-merged historical provenance and must not be mutated.

Before any task branch or recipe work, run the required real isolated npm capability probe in one uniquely named operating-system temporary directory: actual `npm init -y`, actual `npm install --ignore-scripts --no-save is-number@7.0.0`, and a Node.js assertion that `require("is-number")(42)` returns true. Delete exactly that temporary directory, return to the repository, and prove `git status --short` is clean and identical before and after. Do not substitute a dry run. Verify effective repository-local `commit.gpgSign=false`, and pass `--no-gpg-sign` to every autonomous commit-producing command.

Before creating any task branch, make exactly one non-mutating synchronous `task` call with `agent_type: development-task-worker`, `mode: sync`, `capability_probe: true`, and a fresh nonce. Require the exact correlated response `TASK_CAPABILITY_OK <nonce>`. The probe worker must use no tools, perform no repository/Git/task work, and create no outcome. An empty, malformed, denied, or mismatched result is a startup failure.

If any install, network, filesystem, cleanup, GitHub, synchronous `task`, MCP, signing, or `task_complete` prerequisite is denied or requires additional approval despite the launch permissions, stop and report the exact denial.

Before any recipe implementation, prove the exact `develop` baseline clean and green. For task 0001, Phase 0 is bootstrap-only: establish every required deterministic gate and a completely green suite before beginning SYS-001 Phase 1. The approved SYS-001 source is a versioned framework-neutral shared package; Angular must not depend on Nest or class-validator, while necessary Nest decorated DTOs remain checked non-breaking boundary adapters.

Then process pending tasks from the configured Series in filename order. For exactly one task at a time, create and push `feature/<Source>` from the proven-green `develop` SHA, call the CLI `task` tool once with `agent_type: development-task-worker` and `mode: sync`, verify its evidence, no-ff/no-GPG-sign merge only locally green work into `develop`, push, and wait for CI associated with the exact merge SHA. Never use background mode or run two workers concurrently.

On success, finalize DONE and delete the feature branch locally and remotely if present. On pre-merge block, preserve/push and freeze the divergent branch, record only BLOCKED on `develop`, and wait for exact metadata-commit CI. On merge CI non-success/unverifiable result, freeze the feature branch at its last pushed SHA, revert the merge, verify the revert tree equals the pre-merge tree, push and require exact revert-SHA green CI, then record only REVERTED in a separate metadata commit and require its exact CI. Never merge develop into, amend, reset, rebase, advance or delete a BLOCKED/REVERTED branch.

After BLOCKED or REVERTED becomes green, resolve the transitive hard-dependency graph. Mark each pending dependent task SKIPPED_DEPENDENCY in one batched metadata-only commit without creating a feature branch or invoking a worker; record direct and transitive causes and require exact skip-commit CI. Continue only with the next pending task whose hard dependencies are all DONE. Tasks merely left unattempted because the deadline arrives remain pending. If develop does not return to exact-SHA green after revert/status/skip metadata, classify it as a baseline/upstream incident and stop the whole session; do not pass the problem to another task.

DONE, BLOCKED, REVERTED and SKIPPED_DEPENDENCY are terminal within this active session. Never reopen or resume a terminal task because a later probe or Autopilot continuation changes your opinion. Only a new direct human instruction in a new or restarted session may authorize re-enablement; an Autopilot continuation is not human authorization.

Operate autonomously within these rules and do not ask me to approve routine in-scope tool calls. Never touch master, deploy, publish, use production data/credentials, force-push, rebase, rewrite history, or mutate historical PR #25.

At `2026-09-02T10:00:00+02:00`, start no new task. Finish the complete safe lifecycle of the currently active task, including dependency-skip propagation caused by its terminal outcome, then generate and push the configured report on clean develop and wait for exact report-commit CI when a workflow exists. Emit the concise final summary and report path, then call `task_complete` as the final Autopilot action and produce no further prose or tool calls. Report separate DONE, BLOCKED, REVERTED, SKIPPED_DEPENDENCY and pending counts/evidence; task/merge/revert/status SHAs and CI runs; preserved frozen branches; direct/transitive skip causes; baseline remediation; validation/browser evidence; final develop health; stop reason; and actual elapsed/usage information available from the host. Reaching a session-fatal blocker is successful completion of the coordinator objective even when pending workload remains: finalize the report, summarize, call `task_complete`, and stop. Do not claim completion before finalization is terminal.
```

## Expected terminal states

- **Deadline/workload complete:** active task lifecycle is terminal, report commit is pushed, exact report CI is green when present, and `develop` is clean.
- **Task BLOCKED but recovered:** the pre-merge attempt branch is frozen locally/remotely, metadata CI is green, dependent tasks are marked `SKIPPED_DEPENDENCY`, and the coordinator continues only to an independent runnable task before the deadline.
- **Task REVERTED but recovered:** the locally successful integration was rolled back, its branch is frozen, revert/status CI is green, dependency skips are propagated, and independent work may continue.
- **Task SKIPPED_DEPENDENCY:** no task branch/worker exists; metadata names its direct and transitive terminal non-`DONE` prerequisites.
- **Session-fatal baseline/upstream incident:** revert tree or exact-SHA CI cannot restore/prove green; no later task starts, the branch remains preserved, and the report identifies the last known-green and failing recovery SHAs/runs.
