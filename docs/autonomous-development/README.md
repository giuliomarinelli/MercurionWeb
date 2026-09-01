# Autonomous Development

This directory contains the repository-level contract for bounded autonomous Development Sessions.

The design intentionally separates deterministic orchestration from model reasoning and planning from execution:

- the **runner** decides when a session starts/stops, which task runs next, when deadlines/budgets are reached, and which local runtime processes are managed;
- the **series domain** stores planning context, source registries, Trello-card bindings, and inclusive task-range bindings;
- the **task domain** stores executable implementation recipes;
- the **coding agent** receives exactly one task and decides how to implement it within the repository instructions;
- Git/GitHub writes remain **human-managed** after the Development Session.

## Layout

```text
docs/autonomous-development/
├── README.md
├── PROTOCOL.md
├── RUNTIME.md
├── session.example.yaml
├── series/
│   ├── 0000-series-example.md
│   ├── 0001-....md
│   └── ...
├── task/
│   ├── 0000-task-example.md
│   ├── 0001-....md
│   ├── 0002-....md
│   └── ...
└── reports/
    └── ...
```

GitHub Copilot CLI project-level tool configuration lives in `.github/mcp.json`. Repository-level safety hooks live in `.github/hooks/`.

## Development Session

A Development Session is a configurable execution window over an ordered workload.

Typical examples include a daytime session while a human developer works on another project, an overnight session, or a short bounded session for a small queue of tasks.

The session may finish before its configured end time when the workload is exhausted. It must then proceed immediately to final validation and report generation instead of waiting for the deadline.

The configured `end` is a soft deadline: once reached, no new task starts, but the current task may finish. The optional `hard_stop` is the absolute cutoff for pathological or unexpectedly long-running tasks.

The default Sol execution profile is:

```yaml
model: GPT-5.6 Sol
context: default   # 272K tier for Sol
reasoning: high
```

The 1M `long_context` tier is an escalation option, not the default. A fresh agent session is created for every task, so unrelated task history is intentionally not carried forward.

## Series documents

A series is a non-executable planning document for a coherent body of work.

Series filenames use four-digit globally progressive prefixes:

```text
0000-series-example.md   # template only; never executable
0001-first-series.md
0002-second-series.md
...
```

Every real series starts with valid YAML frontmatter. The canonical shape is:

```yaml
---
series_number: "0001"
card_id: "$oid(6a962b70d3e82215b546be6e)"
task_range:
  start: "0001"
  end: "0220"
repository: "giuliomarinelli/MercurionWeb"
branch: "develop"
baseline:
  commit: "8048279c1f7cf65b7d46149e19ad039c4e47c5f3"
  label: "NG | cve fixes"
  date: "2026-08-28"
---
```

The frontmatter is the machine-readable source of truth. Four-digit identifiers remain quoted strings so YAML parsers preserve leading zeroes.

The inclusive `task_range` is the deterministic binding from the series domain to the task domain. Task files remain independently executable and do not need a backlink to their owning series.

`card_id` binds the series to the corresponding Trello card. It is external planning metadata only and must not be used by the runner to infer task membership.

The canonical authoring reference is `series/0000-series-example.md`.

## Task files

Task filenames use globally progressive four-digit prefixes so lexical ordering remains stable across series:

```text
0000-task-example.md   # template only; never executable
0001-first-task.md
0002-second-task.md
...
```

Each task exposes two machine-readable terminal-state checkboxes near the top:

```md
- [ ] DONE
- [ ] BLOCKED
```

The template at `task/0000-task-example.md` is the canonical reference for humans or models that create new task recipes.

Task numbers do not restart for each series. A future series continues after the final task number allocated by the previous series, which keeps series-to-task range bindings simple and independent from Trello/card metadata.

## Canonical local runtime

`RUNTIME.md` defines the local topology for browser/runtime validation.

Three application processes are required when browser-facing validation needs the complete Mercurion stack:

```text
MercurionWebNode  -> npm run start:dev
MercurionWebNg    -> npm run start:dev
../MercurionTox21 -> its .venv Python -> python -m main
```

`MercurionTox21` is a sibling repository and is read-only from MercurionWeb autonomous sessions. Its virtual environment is invoked through its interpreter directly; shell-specific activation is intentionally avoided.

The Docker development reverse proxy is externally managed and expected to remain active. Browser validation enters exclusively through:

```text
http://localhost:8888
```

The Angular dev-server port is an internal nginx upstream and must not be used as the validation origin.

## Browser-capable frontend validation

The repository configures Chrome DevTools MCP for GitHub Copilot CLI in `.github/mcp.json`.

The shared configuration launches a dedicated headless, isolated Chrome instance rather than attaching autonomous development to a developer's personal browser profile. Browser tooling is available for frontend tasks that need rendered interaction/layout checks, console/runtime error inspection, network request inspection, DOM/accessibility-state inspection, responsive viewport checks, screenshots, or performance diagnostics.

Browser validation is task-driven rather than globally mandatory. The canonical task template contains a `Browser validation` section. When a task declares browser validation as required, failure to make the canonical local runtime or Chrome MCP capability available must result in `BLOCKED`, not a false `DONE`.

For unattended Copilot prompt-mode runs, the session/runner configuration enables project-level MCP loading through `GITHUB_COPILOT_PROMPT_MODE_WORKSPACE_MCP=true`. This should only be done after the repository and `.github/mcp.json` have been intentionally reviewed and trusted.

## Git is intentionally read-only for the agent

Autonomous tasks may edit repository files, but they may not mutate Git or GitHub state.

The agent can inspect `status`, `diff`, history, and tracked files, but it must not stage, commit, stash, checkout/switch, restore/reset, create refs, merge/rebase, fetch/pull/push, or mutate GitHub remotely.

`.github/hooks/git-readonly.json` and its policy script provide a deterministic `preToolUse` guardrail for shell Git commands. The session configuration also disables Copilot's built-in GitHub MCP server for autonomous coding runs.

The result is deliberate: a Development Session leaves a reviewed-but-uncommitted working tree plus a report. The human developer decides how to stage, commit, merge, or discard the accumulated changes afterwards.

## Workload resolution

A session can eventually resolve its workload from an explicit list of task files, a selected series by parsing its YAML `task_range.start` and `task_range.end`, or the global pending task queue when neither is specified.

Task authoring from a series is deliberately separate from task execution: the runner must never synthesize missing task recipes on the fly from a series registry.

## Current scope

This version defines the planning/execution contract, configuration format, series/task templates, Chrome MCP capability, canonical local runtime, and deterministic Git read-only hook.

It intentionally does **not** yet implement the Development Session runner, scheduler, process manager, Copilot CLI invocation wrapper, automatic materialization of the 220 Series 0001 task recipes, or report generator. Those follow after the contract/configuration is reviewed and agreed.