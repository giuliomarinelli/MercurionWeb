# Launch the overnight Development Session

This run is configured by:

```text
docs/autonomous-development/session.overnight-2026-09-01.yaml
```

Its soft deadline is **2026-09-02 10:00 CEST** (`2026-09-02T10:00:00+02:00`). At that instant the coordinator starts no new recipe, completes the active task's full safe lifecycle, writes/pushes the report, waits for exact report-commit CI when available, and stops. The configuration has no hard stop.

## Do not launch yet

Pull request `#25` is the bootstrap/configuration PR and remains draft until the user explicitly merges it. The coordinator must not merge, close, edit or otherwise operate that pull request. Launch only after its commits are present on `origin/develop`; otherwise the committed agent/configuration contract is not active on the integration branch.

Never reuse this one-time YAML at or after its deadline. Create a new dated configuration instead.

## Pre-launch checklist

1. Merge PR `#25` manually when ready. In the VS Code repository checkout, fetch `origin`, check out `develop`, and fast-forward it to `origin/develop`. The worktree must be clean.
2. Use a current VS Code and GitHub Copilot extension with Autopilot, Advanced Autopilot, custom agents and `agent/runSubagent` support.
3. Open the MercurionWeb repository root as the workspace. Keep VS Code, the machine, network and GitHub authentication available for the complete run; disable automatic sleep for the night.
4. Confirm GitHub authentication can read Actions and push ordinary branches/`develop`. Do not launch with production credentials or broader unrelated repository access in the agent environment.
5. Run the structural recipe check:

   ```text
   node docs/autonomous-development/tools/validate-recipes.mjs
   ```

   It must report 1 series, 220 tasks, 220 Sources, and zero errors/warnings.
6. Confirm no local or remote `feature/<Source>` branch already exists for the next runnable task. An existing branch is a prior attempt and must not be overwritten or reused autonomously.
7. Confirm `../MercurionTox21` and its virtual environment exist and remain read-only. Confirm the externally managed nginx development edge is available at `http://localhost:8888` before any task requiring browser validation. A missing runtime capability blocks that task; it does not authorize alternate ports or production access.
8. In Copilot Chat select the **Copilot** harness, the **Development Session Coordinator** custom agent, **GPT-5.6 Sol**, **High** reasoning and **Autopilot**. Workspace settings already require Responses context management and Advanced Autopilot.
9. Ensure the coordinator can use terminal/Git, GitHub Actions read access, file editing/search, `agent/runSubagent`, and Chrome DevTools MCP. Autopilot grants consequential tool autonomy, so run only in this dedicated, clean checkout with the repository guardrails committed by PR `#25`.
10. Paste the starting prompt below once. Do not start a second coordinator against the same checkout.

## Starting prompt

```text
Run the complete autonomous Development Session defined by `docs/autonomous-development/session.overnight-2026-09-01.yaml` as the `Development Session Coordinator`.

First read the active YAML, `AGENTS.md`, `docs/autonomous-development/PROTOCOL.md`, and `docs/autonomous-development/RUNTIME.md` in full. Validate every startup precondition before making repository writes. Refuse to launch if PR #25 is not already represented in `origin/develop`, the deadline has passed, the worktree/base/authentication/capabilities are unsafe, or a required decision remains unresolved.

Before any recipe implementation, prove the exact `develop` baseline clean and green. For task 0001, Phase 0 is bootstrap-only: establish every required deterministic gate and a completely green suite before beginning SYS-001 Phase 1. The approved SYS-001 source is a versioned framework-neutral shared package; Angular must not depend on Nest or class-validator, while necessary Nest decorated DTOs remain checked non-breaking boundary adapters.

Then process pending tasks from the configured Series in filename order. For exactly one task at a time, create and push `feature/<Source>` from the proven-green `develop` SHA, invoke one fresh stateless `Development Task Worker`, verify its evidence, no-ff merge only locally green work into `develop`, push, and wait for CI associated with the exact merge SHA.

On success, finalize DONE and delete the feature branch locally and remotely if present. On pre-merge block, preserve/push and freeze the divergent branch, record BLOCKED on `develop`, and wait for exact metadata-commit CI. On merge CI failure, freeze the feature branch at its last pushed SHA, revert the merge, verify the revert tree equals the pre-merge tree, push and require exact revert-SHA green CI, then record BLOCKED in a separate metadata commit and require its exact CI. Never merge develop into, amend, reset, rebase, advance or delete a blocked branch. After a recovered block, continue only with the next pending task whose hard dependencies are all DONE. If develop does not return to exact-SHA green after revert/status, classify it as a baseline/upstream incident and stop the whole session; do not pass the problem to another task.

Operate autonomously within these rules and do not ask me to approve routine in-scope tool calls. Never touch master, deploy, publish, use production data/credentials, force-push, rebase, rewrite history, or merge/close/edit PR #25.

At `2026-09-02T10:00:00+02:00`, start no new task. Finish the complete safe lifecycle of the currently active task, then generate and push the configured report on clean develop, wait for exact report-commit CI when a workflow exists, and stop. Report completed, blocked and pending tasks; task/merge/revert/status SHAs and CI runs; preserved frozen branches; baseline remediation; validation/browser evidence; final develop health; stop reason; and actual elapsed/usage information available from the host. Do not claim completion before finalization is terminal.
```

## Expected terminal states

- **Deadline/workload complete:** active task lifecycle is terminal, report commit is pushed, exact report CI is green when present, and `develop` is clean.
- **Task blocked but recovered:** task branch is frozen locally/remotely, `develop` metadata CI is green, and the coordinator continues only to an independent runnable task before the deadline.
- **Session-fatal baseline/upstream incident:** revert tree or exact-SHA CI cannot restore/prove green; no later task starts, the branch remains preserved, and the report identifies the last known-green and failing recovery SHAs/runs.
