# Autonomous Development

This directory contains the repository-level contract for bounded autonomous development sessions.

The design intentionally separates deterministic orchestration from model reasoning:

- the **runner** decides when a session starts/stops, which task runs next, and when deadlines/budgets are reached;
- the **coding agent** receives exactly one task and decides how to implement it within the repository instructions.

## Layout

```text
docs/autonomous-development/
├── README.md
├── PROTOCOL.md
├── session.example.yaml
├── tasks/
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

## Task files

Task filenames use four-digit prefixes so lexical ordering remains stable:

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

The template at `tasks/0000-task-example.md` is the canonical reference for humans or models that create new task specifications.

## Current scope

This initial version defines the contract and configuration format only.

It intentionally does **not** yet implement the runner, scheduling, process management, Copilot CLI invocation, deterministic Git guardrails/hooks, or report generator. Those should be implemented only after the protocol/configuration semantics are reviewed and agreed.
