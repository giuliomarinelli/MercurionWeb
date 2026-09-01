# 0000 - Task example — DO NOT EXECUTE

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

> Canonical template for autonomous-development task recipes. Copy it to a new
> globally progressive four-digit filename. `0000` is never executable.

## Task identity

```text
NNNN-short-task-name.md
```

Every executable task MUST also declare exactly one planning Source identifier:

```text
Source: `FE-001` in Series `0001`.
```

The runner derives the task branch from that Source:

```text
feature/FE-001
```

Do not reuse task numbers or Source identifiers.

## Objective

State one concrete implementation outcome. Describe what must be true when the task is finished, not a vague activity.

## Context

Explain only the context needed to execute the task reliably: current behaviour, relevant architecture, known constraints and useful source paths.

Do not duplicate repository-wide branch/CI/runtime rules already defined in `AGENTS.md`, `PROTOCOL.md` and `RUNTIME.md`.

## Relevant files and modules

- `path/to/file.ts`
- `path/to/module/`

The agent should still inspect related implementation as needed.

## In scope

- ...
- ...

## Out of scope

- Do not refactor unrelated modules.
- Do not change public behaviour beyond this task.
- Do not modify `../MercurionTox21`; it is a read-only runtime dependency.
- ...

## Decisions already made

Record decisions the autonomous agent must treat as settled.

If an important product/architecture/security decision is intentionally missing, put it in `Stop conditions`; never ask the agent to guess.

## Requirements

1. ...
2. ...
3. ...

## Acceptance criteria

- [ ] ...
- [ ] ...
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

List task-specific commands/checks. These do **not** replace the repository-wide CI-parity gates.

Every task automatically has two additional mandatory full-suite checkpoints defined by `PROTOCOL.md`:

1. **preflight before task implementation**;
2. **full CI-parity check immediately before merge**.

After task `0008`, both checkpoints use:

```text
npm ci
npm run ci:check
```

If preflight is red, the agent must restore the repository-controlled baseline on `feature/<Source>` before implementing this task. If that cannot be done safely, mark `BLOCKED` and do not merge partial work.

Task-specific validation example:

```text
npm test -- --watch=false
npm run build
```

Do not invent commands that are invalid for the affected project.

## Browser validation

For non-browser work:

```text
Not applicable.
```

For frontend/browser-facing work, state the runtime evidence required using Chrome DevTools MCP through the canonical nginx edge:

```text
http://localhost:8888
```

Never use the Angular development-server port as the browser origin.

Example evidence:

1. open the affected route through `http://localhost:8888`;
2. exercise the changed interaction;
3. verify expected DOM/accessibility state;
4. inspect the affected network request/response;
5. verify no relevant uncaught console errors;
6. test required responsive states.

## Stop conditions

Mark `BLOCKED` rather than guessing when:

- a required architecture/product/security decision is unspecified;
- required credentials/infrastructure/test data are unavailable;
- required browser validation cannot run;
- safe completion requires material out-of-scope behaviour;
- the mandatory preflight cannot be restored to green;
- task-specific or full pre-merge CI-parity validation cannot be made green within configured limits;
- ... task-specific stop condition ...

A blocked task is never merged merely to let a later task repair it.

If blocked before merge, preserve `feature/<Source>` locally/remotely and propagate only the task's blocked status/diagnostics to `develop`.

If the task was merged but exact merge-SHA GitHub Actions does not succeed or cannot be verified, the runner reverts the merge commit on `develop`, marks the task `REVERTED`, and preserves/freezes the feature branch.

If a hard dependency is terminal as `BLOCKED`, `REVERTED`, or `SKIPPED_DEPENDENCY`, the coordinator marks this task `SKIPPED_DEPENDENCY` without creating a feature branch or invoking a worker.

## Dependencies

- None

or:

- Hard: `0001-example-dependency.md` must be `DONE` first.
- Advisory: coordinate the public vocabulary with `0002-related-task.md`; this does not block execution.

Use the exact current task filename for a new hard dependency. State explicitly whether a cross-reference is hard or advisory; do not create an apparent forward dependency for work that a later task merely registers or refines.

## Implementation notes

Optional guidance about the expected approach. Avoid creating a second contradictory requirement list.

## Execution notes

> Filled by the coding agent/runner. Leave placeholders in newly authored tasks.

### Feature branch

_Not started._

### Preflight

_Not started._

### Preflight remediation

_None._

### Summary

_Not started._

### Task-specific validation performed

_Not started._

### Full pre-merge CI-parity validation

_Not started._

### Browser validation performed

_Not applicable / not started._

### Commits

_Not recorded._

### Merge / CI

_Not started._

### Rollback

_Not applicable._

### Blocker / human decision required

_None._

> `DONE` is finalized only after the exact `develop` merge commit passes GitHub
> Actions. Post-merge CI non-success requires merge revert + `REVERTED`; the
> feature branch remains frozen for diagnosis/retry. `BLOCKED` is pre-merge,
> while `SKIPPED_DEPENDENCY` means no attempt/branch occurred.
