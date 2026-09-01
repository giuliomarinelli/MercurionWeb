# Autonomous Development

This directory contains the repository-level contract for bounded autonomous development sessions.

The design intentionally separates deterministic orchestration from model reasoning and planning from execution:

- the **runner** decides when a session starts/stops, which task runs next, and when deadlines/budgets are reached;
- the **series domain** stores planning context, source registries, Trello-card bindings, and inclusive task-range bindings;
- the **task domain** stores executable implementation recipes;
- the **coding agent** receives exactly one task and decides how to implement it within the repository instructions.

## Layout

```text
docs/autonomous-development/
├── README.md
├── PROTOCOL.md
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

## Development Session

A Development Session is a configurable execution window over an ordered workload.

Typical examples:

- a daytime session while a human developer works on another project;
- an overnight session;
- a short bounded session for a small queue of tasks.

The session may finish before its configured end time when the workload is exhausted. It must then proceed immediately to final validation and report generation instead of waiting for the deadline.

The configured `end` is a soft deadline: once reached, no new task starts, but the current task may finish. The optional `hard_stop` is the absolute cutoff for pathological or unexpectedly long-running tasks.

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

## Workload resolution

A session can eventually resolve its workload from:

1. an explicit list of task files;
2. a selected series, parsing that series' YAML `task_range.start` and `task_range.end`;
3. the global pending task queue when neither is specified.

Task authoring from a series is deliberately separate from task execution: the runner must never synthesize missing task recipes on the fly from a series registry.

## Current scope

This initial version defines the contract and configuration format only.

It intentionally does **not** yet implement the runner, scheduling, process management, Copilot CLI invocation, deterministic Git guardrails/hooks, task materialization, or report generator. Those should be implemented only after the protocol/configuration semantics are reviewed and agreed.
