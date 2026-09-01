# 0000 - Series example — DO NOT EXECUTE

**series_number:** `0000`  
**card_id:** `$oid(<trello-card-mongo-id>)`  
**task_range:** `[<FIRST_TASK> - <LAST_TASK>]`  
**repository:** `owner/repository`  
**branch:** `develop`  
**baseline_commit:** `<git-sha>`  

> This file is documentation and the canonical template for humans or models
> that create autonomous-development series documents. It is never executable.
> Copy it to a new file with a globally progressive four-digit series prefix
> starting at `0001`.

## Purpose of a series

A **series** is the planning/context domain for a coherent body of work. It may
contain analysis, evidence, a registry of desired outcomes, constraints, and a
program-level completion criterion.

A series is **not** an executable task recipe. Executable implementation recipes
live independently under `../task/`.

The two domains are intentionally decoupled:

- the series owns planning context and grouping;
- task files own executable implementation instructions;
- the series binds to its task files only through the inclusive numeric
  `task_range` declared in the header;
- task files do not need a backlink to the series;
- `card_id` binds the series document to the corresponding Trello card and is
  metadata, not an execution dependency.

## Header contract

Every executable series document must define the following metadata near the top:

- `series_number`: globally progressive four-digit series number;
- `card_id`: Trello card Mongo identifier using the repository convention
  `$oid(...)`, or an explicitly documented null/absent value when no card exists;
- `task_range`: inclusive range of globally progressive task numbers, formatted
  exactly as `[NNNN - NNNN]`;
- `repository`: repository the series describes;
- `branch`: branch/baseline context used when the series was authored;
- `baseline_commit`: frozen commit used for analysis when applicable.

`0000` is reserved for this template and must never represent a real series.

## Task-range rules

Example:

```text
[0001 - 0220]
```

means that task recipes `0001` through `0220`, inclusive, belong to this series.

Rules for v1:

1. Task numbers are global within the autonomous-development domain, not reset
   per series.
2. A series range is inclusive at both ends.
3. Series ranges should be contiguous.
4. Series ranges should not overlap in v1; a task has one owning series.
5. The range creates the binding. Filenames, Trello card IDs, prose, or local
   identifiers inside a series must not be used by the runner to infer task
   membership.
6. A series may contain its own human-friendly/local IDs such as `SYS-001` or
   `FE-001`. Those identifiers remain local to the planning document and do not
   replace the global four-digit task number.

## Executive summary

Describe the body of work and why it exists.

Keep this section at program/series level. Do not duplicate the detailed recipe
that belongs in each task file.

## Baseline and evidence

Record the facts, measurements, scans, build/test results, links, or other
baseline evidence that justify the series.

Use enough detail for a task-authoring model to understand the source material
without inventing facts.

## Registry / source backlog

List the outcomes identified by the analysis. A large series may use tables,
sections, local IDs, or categories.

Each source entry should describe the desired final state clearly enough that a
separate task-authoring step can turn it into one or more executable task files.

Do **not** silently add implementation decisions that were not established by the
analysis or by a human decision maker.

## Cross-cutting constraints

Record constraints that apply to the whole series but do not belong in the
repository-wide `AGENTS.md` contract.

Examples:

- preserve a specified public API;
- maintain compatibility with a frozen schema;
- keep a specific migration boundary;
- restrict changes to a known subsystem.

## Task-authoring guidance

When a human or model materializes task recipes from this series:

1. Use `../task/0000-task-example.md` as the canonical task template.
2. Allocate task numbers from this series' declared `task_range` in source-order
   unless the series explicitly defines another deterministic mapping.
3. Preserve factual evidence and Definition-of-Done semantics from the series.
4. Convert each outcome into an implementation recipe with explicit scope,
   acceptance criteria, validation, dependencies, and stop conditions.
5. Do not make a task depend on this series document at execution time unless a
   task explicitly links to it as optional context.
6. Never alter the series' `card_id` or task range while materializing tasks
   unless a human explicitly changes the planning binding.

## Completion criterion

Define when the entire series can be considered complete.

The criterion should normally be evaluated over all tasks in `task_range` plus
any program-level quality gates or invariants that cannot be represented by a
single task.
