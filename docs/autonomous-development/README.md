# Autonomous Development

This directory defines the repository contract for configurable autonomous Development Sessions.

The model is intentionally strict:

- one task recipe;
- one fresh stateless Copilot/Sol task worker;
- one `feature/<Source>` branch;
- full CI-parity preflight **before** implementation;
- full CI-parity validation again before integration;
- one explicit `--no-ff --no-gpg-sign` merge commit into `develop`;
- wait for GitHub Actions on that exact merge SHA;
- success => delete the feature branch;
- post-merge CI non-success => revert the merge, mark `REVERTED`, preserve the feature branch;
- pre-merge failure/stop condition => mark `BLOCKED`, preserve the feature branch;
- terminal hard dependency => mark `SKIPPED_DEPENDENCY` without creating a branch.

`develop` is therefore never used as a dumping ground for hundreds of unrelated unverified changes.

See `PROTOCOL.md` for the complete lifecycle and `RUNTIME.md` for browser/runtime topology.

The GitHub Copilot CLI runner is implemented as a coordinator/worker pair in `.github/agents/`. The coordinator owns the bounded session and invokes a new `Development Task Worker` through one synchronous `task` call for each recipe. The former VS Code Autopilot/advanced-mode route is unsupported for autonomous overnight sessions.

## Structure

```text
docs/autonomous-development/
├── README.md
├── LAUNCH.md
├── PROTOCOL.md
├── RECIPE-AUDIT.md
├── RUNTIME.md
├── session.example.yaml
├── session.overnight-2026-09-01.yaml
├── series/
│   ├── 0000-series-example.md
│   ├── 0001-....md
│   └── ...
├── task/
│   ├── 0000-task-example.md
│   ├── 0001-....md
│   └── ...
└── reports/
    └── 0000-session-report-template.md
```

Recipe metadata and cross-references are checked with:

```text
node docs/autonomous-development/tools/validate-recipes.mjs
node docs/autonomous-development/tools/validate-cli-runner.mjs
```

The check validates Series ranges/registries, contiguous task identities, Source mappings, state markers, required recipe sections, and exact dependency filenames.

`RECIPE-AUDIT.md` records the reviewed inconsistencies, corrections and the intentional protected-branch lifecycle transition at task `0218`.

## Model profile

```yaml
host: github-copilot-cli
harness: github-copilot-cli
mode: autopilot
context:
  management:
    provider: github-copilot-cli
    strategy: native-compaction-and-checkpoints
```

Each task gets a fresh worker context. The coordinator uses GitHub Copilot CLI's native automatic context compaction and session checkpoint behavior; `/compact` remains available when an explicit compaction is needed.

The agent profiles do not pin a model or reasoning level. The coordinator and workers inherit GPT-5.6 Sol and High reasoning from the parent CLI session. Launch uses CLI Autopilot with all required permissions; no VS Code advanced-mode setting is required.

## Agent topology

- `Development Session Coordinator` persists across the bounded run, parses the active YAML, owns time/task selection/Git integration/CI/reporting, and never implements two tasks concurrently.
- `Development Task Worker` is one fresh stateless synchronous CLI `task` invocation for one prepared `feature/<Source>` branch. It owns preflight, implementation, local validation, task notes and feature-branch commits only.
- The coordinator independently verifies each worker result before merging and remains active through exact-SHA CI, cleanup/revert, the deadline and final report.

The coordinator is manually selectable but cannot be inferred automatically. The worker is neither user-invocable nor inferable and is reached only by the coordinator's explicit `task` call.

## Series and task identity

Series own inclusive global task ranges through YAML frontmatter. `card_id` binds a Series to its Trello card but is not an execution dependency.

Every executable task has:

```md
- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
```

The four terminal outcomes are mutually exclusive:

| Outcome | Meaning |
|---|---|
| `DONE` | Integrated into `develop`; exact merge-SHA CI succeeded. |
| `BLOCKED` | Attempted but could not reach merge; divergent branch is frozen. |
| `REVERTED` | Locally successful and merged, then rolled back after post-merge CI non-success/unverifiable result; branch is frozen. |
| `SKIPPED_DEPENDENCY` | Never attempted because a hard dependency is terminal non-`DONE`; no branch exists. |

All unchecked means pending. `CI_PENDING` exists only as transient coordinator state.

Every persistent outcome is terminal for the active session. A later probe or Autopilot continuation cannot reopen or resume it. Only a new direct human instruction in a new or restarted session can authorize re-enablement.

A session-fatal blocker completes the coordinator objective even if pending workload remains: the coordinator finalizes the report, calls `task_complete`, and stops.

and a planning identifier such as:

```text
Source: `FE-001` in Series `0001`.
```

That Source becomes the branch name:

```text
feature/FE-001
```

`0000-series-example.md` and `0000-task-example.md` are templates only.

## Mandatory preflight

Quality is not checked only after development. No first task scope starts until the complete repository baseline is green, and every later task starts by proving its feature branch derives from exact-SHA green `develop`.

After task `0008` establishes the canonical interface, the local runner and GitHub Actions share:

```text
npm ci
npm run ci:check
```

The aggregate covers all repository-controlled CI failure gates: dependency integrity, Angular/Nest lint, type/template checks, all Angular tests, all Nest Jest unit and E2E tests, both builds, GraphQL/generated-artifact drift and later registered static/contract checks.

If preflight is red, the agent repairs repository-controlled defects on `feature/<Source>` before beginning the requested task. It reruns the complete suite after remediation. If green cannot be restored safely, the task is blocked without merging partial work. For `0001`, Phase 0 is bootstrap-only and no SYS-001 feature scope or later task begins until that baseline is completely green.

Before `0001`, the same rule applies using package-local bootstrap checks. The current baseline's missing Angular lint gate and Nest check/fix lint asymmetry are treated as bootstrap defects rather than skipped checks.

Before any recipe work, startup also performs a real capability probe in one uniquely named operating-system temporary directory: `npm init -y`, `npm install --ignore-scripts --no-save is-number@7.0.0`, and a Node.js assertion that `require("is-number")(42)` returns `true`. The coordinator deletes exactly that directory and proves the repository is clean and unchanged before and after; dry runs are forbidden.

Startup requires effective repository-local `commit.gpgSign=false`, and every autonomous commit-producing command uses `--no-gpg-sign`. Any denied install, network, filesystem, cleanup, GitHub, `task`, MCP, signing, or `task_complete` prerequisite stops the session with the exact denial.

## Integration lifecycle

```text
green develop
    ↓
feature/<Source>
    ↓
preflight green
    ↓
task implementation
    ↓
task-specific validation
    ↓
full CI-parity green
    ↓
commit + push feature branch
    ↓
--no-ff --no-gpg-sign merge to develop
    ↓
push develop
    ↓
wait CI for exact merge SHA
   ↙                     ↘
PASS                 NON-SUCCESS
 ↓                       ↓
delete branch      revert merge on develop
next task          mark task REVERTED
                   preserve feature branch
                   propagate SKIPPED_DEPENDENCY
                   continue only if develop is green
                   and a later task is independent
```

No rebase, force-push, shared-history reset or CI bypass is part of the autonomous workflow.

## Browser/runtime validation

Chrome DevTools MCP is configured for GitHub Copilot CLI in `.github/mcp.json`. The VS Code MCP file remains only for ordinary interactive VS Code use and is not read as the autonomous-session configuration.

The canonical local stack is:

```text
MercurionWebNode  -> npm run start:dev
MercurionWebNg    -> npm run start:dev
../MercurionTox21 -> .venv Python -> python -m main
```

The externally managed nginx development reverse proxy is the only browser edge:

```text
http://localhost:8888
```

The Angular dev-server port is an internal upstream and must not be used as the browser validation origin.

## Launch

`LAUNCH.md` contains the pre-launch checks, active-configuration rules and exact starting prompt. The workflow starts only after the bootstrap PR has been merged into `develop` and the local checkout has fast-forwarded to that commit.

The custom-agent coordinator is the GitHub Copilot CLI runner for this workflow. It is intentionally not a background service: the parent CLI session must remain running and connected for local terminals, MCP/browser access and synchronous task workers to continue.
