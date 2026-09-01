# Autonomous Development

This directory defines the repository contract for configurable autonomous Development Sessions.

The model is intentionally strict:

- one task recipe;
- one fresh stateless Copilot/Sol task worker;
- one `feature/<Source>` branch;
- full CI-parity preflight **before** implementation;
- full CI-parity validation again before integration;
- one explicit `--no-ff` merge commit into `develop`;
- wait for GitHub Actions on that exact merge SHA;
- success => delete the feature branch;
- failure => revert the merge, mark the task `BLOCKED`, preserve the feature branch.

`develop` is therefore never used as a dumping ground for hundreds of unrelated unverified changes.

See `PROTOCOL.md` for the complete lifecycle and `RUNTIME.md` for browser/runtime topology.

The VS Code runner is implemented as a coordinator/worker pair in `.github/agents/`. The coordinator owns the bounded session and invokes a new `Development Task Worker` subagent for each recipe.

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
```

The check validates Series ranges/registries, contiguous task identities, Source mappings, state markers, required recipe sections, and exact dependency filenames.

`RECIPE-AUDIT.md` records the reviewed inconsistencies, corrections and the intentional protected-branch lifecycle transition at task `0218`.

## Model profile

```yaml
host: vscode
model: GPT-5.6 Sol
reasoning: high
context:
  max_prompt_tokens: 272000
  native_responses_compaction: true
  compact_threshold: 244800
```

Each task gets a fresh context. VS Code workspace settings enable OpenAI Responses API context management through `github.copilot.chat.responsesApiContextManagement.enabled`. The extension computes the server-side compaction threshold at 90% of the active model prompt window, so a 272K window compacts at approximately 244.8K tokens. The 1M long-context tier is deliberately not part of the normal autonomous workflow.

Advanced Autopilot is enabled at workspace level. The user still selects the Copilot harness, `Development Session Coordinator`, GPT-5.6 Sol, High reasoning and Autopilot for the launch session; repository settings cannot silently grant that session's destructive tool permissions.

## Agent topology

- `Development Session Coordinator` persists across the bounded run, parses the active YAML, owns time/task selection/Git integration/CI/reporting, and never implements two tasks concurrently.
- `Development Task Worker` is a stateless `agent/runSubagent` invocation for one prepared `feature/<Source>` branch. It owns preflight, implementation, local validation, task notes and feature-branch commits only.
- The coordinator independently verifies each worker result before merging and remains active through exact-SHA CI, cleanup/revert, the deadline and final report.

## Series and task identity

Series own inclusive global task ranges through YAML frontmatter. `card_id` binds a Series to its Trello card but is not an execution dependency.

Every executable task has:

```md
- [ ] DONE
- [ ] BLOCKED
```

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
--no-ff merge to develop
    ↓
push develop
    ↓
wait CI for exact merge SHA
   ↙                     ↘
PASS                    FAIL
 ↓                       ↓
delete branch      revert merge on develop
next task          mark task BLOCKED
                   preserve feature branch
                   continue only if develop is green
                   and a later task is independent
```

No rebase, force-push, shared-history reset or CI bypass is part of the autonomous workflow.

## Browser/runtime validation

Chrome DevTools MCP is configured for VS Code in `.vscode/mcp.json`.

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

The custom-agent coordinator is the VS Code runner for this workflow. It is intentionally not a background service: VS Code and the Copilot harness must remain running and connected for local terminals, MCP/browser access and task subagents to continue.
