# Autonomous Development

This directory defines the repository contract for configurable autonomous Development Sessions.

The model is intentionally strict:

- one task recipe;
- one fresh stateless Copilot/Sol task worker;
- one local `feature/<Source>` branch, published only after its first task-specific commit;
- full CI-parity preflight **before** implementation;
- full CI-parity validation again before integration;
- wait for GitHub Actions on the exact feature SHA before integration;
- one explicit `--no-ff --no-gpg-sign` merge commit into `develop`;
- wait for GitHub Actions on that exact merge SHA;
- success => delete the feature branch;
- post-merge CI non-success => revert the merge, mark `REVERTED`, preserve the feature branch;
- pre-merge failure/stop condition => mark `BLOCKED`, preserve the feature branch;
- one dependency snapshot before selection: pending prerequisites are transient
  `WAITING_DEPENDENCY`, while every descendant of a terminal hard blocker is
  marked `SKIPPED_DEPENDENCY` in one aggregate metadata-only commit without
  creating branches or workers.

`develop` is therefore never used as a dumping ground for hundreds of unrelated unverified changes.

See `CI-BASELINE.md` for the permanent cross-platform gate,
`PROTOCOL.md` for the complete lifecycle and `RUNTIME.md` for browser/runtime
topology.

The GitHub Copilot CLI runner is implemented as a coordinator/worker pair in `.github/agents/`. The coordinator owns the bounded session and invokes the repository agent `development-task-worker` through one synchronous `task` call for each recipe. Before any task branch exists, it performs one separate nonce-correlated, non-mutating handshake with that same agent. The former VS Code Autopilot/advanced-mode route is unsupported for autonomous overnight sessions.

## Structure

```text
docs/autonomous-development/
├── README.md
├── CI-BASELINE.md
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

The agent profiles do not pin a model or reasoning level. The coordinator and workers inherit GPT-5.6 Sol and High reasoning from the parent CLI session. Their explicit tool lists provide the required terminal/edit/search/delegation/browser capabilities without inheriting every unrelated user-scoped tool schema. Launch uses CLI Autopilot with all required permissions; no VS Code advanced-mode setting is required.

## Agent topology

- `Development Session Coordinator` persists across the bounded run, parses the active YAML, owns time/task selection/Git integration/CI/reporting, and never implements two tasks concurrently.
- `Development Task Worker` (`development-task-worker` programmatically) is one fresh stateless synchronous CLI `task` invocation for one prepared `feature/<Source>` branch. It owns preflight, implementation, local validation, task notes and feature-branch commits only. Its only non-implementation mode is the startup `capability_probe`, which echoes a nonce without tool use or repository access.
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

All unchecked means pending. `CI_PENDING` and `WAITING_DEPENDENCY` exist only as transient coordinator states.

Every persistent outcome is terminal for the active session. A later probe or Autopilot continuation cannot reopen or resume it. Only a new direct human instruction in a new or restarted session can authorize re-enablement.

A session-fatal blocker completes the coordinator objective even if pending workload remains: the coordinator finalizes the report, emits the concise final summary and report path, calls `task_complete` as the final Autopilot action, and stops.

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

Quality is not checked only after development. No first task branch or scope
starts until the permanent repository baseline is green locally and on the
exact `develop` SHA in GitHub Actions on Windows and Linux. This baseline is
established outside the 220 numbered recipes.

The permanent baseline establishes the root workspace, single lockfile, and
canonical root interface before any recipe starts. The local runner and GitHub
Actions share:

```text
npm ci
npm run ci:check
```

The aggregate initially covers dependency integrity, Angular/Nest lint,
type/template checks, all Angular tests, all Nest Jest unit and E2E tests, and
both builds. Task `0008` adds GraphQL/generated-artifact drift; later tasks
register further static/contract checks in the same aggregate.

Every `npm ci` runs with session/task-owned Angular, Nest, Tox21 and test
watchers stopped. Runtime is task-scoped: it starts only after the unchanged
task-start preflight when browser evidence is actually required, and stops
before the final clean-install gate.

If the unchanged baseline is red, the session stops before task work and reports
a baseline/upstream incident. It must not repair global debt inside
`feature/<Source>` or mark the selected recipe `BLOCKED`. Baseline repair is a
separate human-authorized change. There is no `0001` Phase 0 exception.

Before any recipe work, startup also performs a real capability probe in one uniquely named operating-system temporary directory: `npm init -y`, `npm install --ignore-scripts --no-save is-number@7.0.0`, and a Node.js assertion that `require("is-number")(42)` returns `true`. The coordinator deletes exactly that directory and proves the repository is clean and unchanged before and after; dry runs are forbidden.

Startup requires effective repository-local `commit.gpgSign=false`, and every autonomous commit-producing command uses `--no-gpg-sign`. It also proves synchronous custom-agent delegation with an exact `TASK_CAPABILITY_OK <nonce>` handshake before any task branch is created. Any denied install, network, filesystem, cleanup, GitHub, `task`, MCP, signing, or `task_complete` prerequisite stops the session with the exact denial.

## Adaptive CI modes

Every pushed SHA still receives the stable `Required gate`. The workflow
selects `duplicate` only when the identical SHA already has an older
successful CI run, `metadata` only for allowlisted autonomous task/report
Markdown changes built on an exact green base, and `full` for every code,
test, dependency, workflow, agent, protocol, configuration, unknown, or
ambiguous change. The full path remains the Windows/Linux matrix. The metadata
path runs the autonomous validators and diff hygiene on Ubuntu; the duplicate
path reuses already-established exact-tree evidence.

The classifier fails closed and is self-tested by
`npm run ci:validate:autonomous`. Trigger-level path skipping is not used, so
`Required gate` never disappears.

## Integration lifecycle

```text
green develop
    ↓
local feature/<Source> (not pushed yet)
    ↓
preflight green
    ↓
task implementation
    ↓
task-specific validation
    ↓
full CI-parity green
    ↓
first task commit + push feature branch
    ↓
wait adaptive CI for exact feature SHA
   ↙                     ↘
PASS                 NON-SUCCESS
 ↓                       ↓
--no-ff --no-gpg-sign merge to develop
                    mark task BLOCKED
                    freeze feature branch
                    never merge it
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
                   rebuild dependency snapshot
                   batch terminal skips once
                   continue with earliest READY task
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

`LAUNCH.md` records the historical one-time run and the CLI mechanics. Before a
new run, create a new dated session YAML and starting prompt only after the
permanent CI baseline has merged green into `develop` and the local checkout has
fast-forwarded to `origin/develop`.

The custom-agent coordinator is the GitHub Copilot CLI runner for this workflow. It is intentionally not a background service: the parent CLI session must remain running and connected for local terminals, MCP/browser access and synchronous task workers to continue.
