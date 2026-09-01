# 0000 - Task example — DO NOT EXECUTE

- [ ] DONE
- [ ] BLOCKED

> This file is documentation and the canonical template for humans or models
> that create autonomous-development task recipes. It is never part of an
> executable workload. Copy it to a new file whose globally progressive,
> four-digit numeric prefix starts at `0001`.

## Task identity

The filename is the task's execution identity:

```text
NNNN-short-task-name.md
```

Rules:

- `NNNN` is a globally progressive four-digit task number.
- `0000` is reserved for this template and is never executable.
- Do not reuse a task number.
- Do not encode series membership in the task file. Series membership is owned
  by the series domain through its inclusive `task_range` binding.

## Objective

State one concrete implementation outcome in a few sentences.

The objective should describe **what must be true when the task is finished**,
not merely an activity such as "investigate" or "work on" something unless
investigation itself is the requested deliverable.

Good example:

> Add retry handling to the outbound email queue so transient provider failures
> are retried with bounded exponential backoff and permanent failures are sent
> to the existing dead-letter flow.

## Context

Explain only the context needed to execute this task reliably.

Include, when useful:

- why this change is needed;
- current behaviour;
- relevant architecture or existing implementation patterns;
- known constraints;
- links/paths to repository documentation that should be consulted;
- a source/local identifier from the planning document when useful for human
  traceability, without making the task depend on that document at runtime.

Do not duplicate general repository instructions already defined in `AGENTS.md`.

## Relevant files and modules

List likely starting points. This is guidance, not necessarily an exhaustive
list.

- `path/to/file.ts`
- `path/to/module/`

The agent should still inspect related code when necessary to understand the
existing implementation.

## In scope

Describe explicitly what the task may change.

- ...
- ...

## Out of scope

Describe tempting adjacent work that must not be included.

- Do not refactor unrelated modules.
- Do not change public API behaviour beyond what is specified here.
- ...

## Decisions already made

Record decisions the autonomous agent must treat as settled rather than reopen.

Examples:

- Use the existing queue infrastructure; do not add another broker.
- Preserve the current public response shape.
- Reuse the existing error hierarchy.

If an important architectural/product/security decision is intentionally **not**
made, do not ask the agent to guess it. Add it to `Stop conditions` instead.

## Requirements

Use precise, testable requirements.

1. ...
2. ...
3. ...

## Acceptance criteria

Every item must be objectively verifiable before `DONE` may be checked.

- [ ] ...
- [ ] ...
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

List commands and checks appropriate to the affected project. Use exact commands
when they are known.

Example:

```bash
npm test
npm run lint
npm run build
```

Add targeted/manual checks when required:

- [ ] ...

Do not include commands that are not valid for the affected package/project.

## Stop conditions

Mark the task `BLOCKED` instead of guessing if any of these conditions occurs:

- a required architectural decision is unspecified;
- a required product/business behaviour is ambiguous;
- credentials or external infrastructure required by the task are unavailable;
- safe completion requires expanding the scope materially beyond this document;
- validation reveals an unrelated baseline failure that makes completion
  impossible to establish safely;
- ... task-specific stop condition ...

When blocked, write exactly what decision or input is required in `Execution
notes` so a human can resume efficiently.

## Dependencies

List dependencies on other numbered tasks if applicable.

- None

or:

- `0001-example-dependency.md` must be `DONE` first.

Dependencies should be explicit so the runner can eventually enforce them
deterministically instead of asking the model to infer them.

## Implementation notes

Optional human/model-authored guidance about an expected approach. Avoid turning
this section into a second set of requirements.

- ...

## Execution notes

> Filled in by the coding agent during/after execution. Leave this section empty
> when creating a new task except for useful placeholders.

### Summary

_Not started._

### Validation performed

_Not started._

### Commit

_Not created._

### Blocker / human decision required

_None._
