# 0114 - Remove or explicitly own every orphan Angular module

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Resolve every production Angular file unreachable from an approved application entrypoint and add a CI reachability gate so dead/zombie modules cannot accumulate again.

Source: `NG-028` in Series `0001`.

## Context

The Series baseline identified 31 files not reachable from the production static graph, including legacy modal/redirect/spinner code, Notebook-related code and services. Earlier tasks classify server/client feature ownership, make Notebook/Synth decisions explicit, introduce lazy route/action registries and remove several legacy UI implementations. This final Angular architecture task distinguishes legitimate lazy/plugin/tooling entrypoints from true zombie production code and makes that distinction machine-verifiable.

## Relevant files and modules

- `MercurionWebNg/src/main.ts`
- typed route manifest / `app.routes.ts`
- lazy action registry from `0106`
- production Angular source under `MercurionWebNg/src/app/`
- Notebook implementation according to the decision completed by `SYS-020`
- legacy modal/redirect/spinner/services identified by the baseline audit
- Storybook/catalog/test-only entrypoints from `UI-028`

## In scope

- Build a deterministic production reachability graph starting from all legitimate application entrypoints, including static imports and supported lazy route/action imports.
- Classify every previously orphaned production file as reachable product code, explicit non-production/tooling entrypoint, generated artifact, or dead code to remove.
- Delete dead legacy components/services/models and all obsolete exports/specs/references that exist only for them.
- Ensure product features intentionally retained by prior decisions have explicit route/registry/feature entrypoints.
- Keep Storybook/tests/scripts/generated sources outside the production-orphan rule through narrow documented configuration rather than blanket directory ignores.
- Add a CI gate that fails on newly orphaned production files.

## Out of scope

- Do not make dead code reachable by importing it from a synthetic barrel solely to satisfy the checker.
- Do not retain a feature because code exists; follow the ownership decisions already made by SYS tasks.
- Do not classify an entire directory as exempt when individual entrypoints can be specified.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Every production Angular source file either participates in an explicit runtime entrypoint graph or is removed.
- Lazy routes/actions count as legitimate edges and must be understood by the reachability checker.
- Test/catalog/generated/tooling code has separate explicit entrypoints/exclusions and cannot justify unreachable production code.
- Notebook/Synth ownership follows the explicit decisions and implementations from `SYS-018` through `SYS-020`; this task does not reopen them.

## Requirements

1. Reproduce the baseline-style reachability analysis against the post-`0113` graph and list every unreachable production file.
2. Define the authoritative production entrypoint set: `main.ts`, router lazy entries, typed action registry entries and any other intentionally dynamic runtime registry.
3. For each orphan, prove a legitimate entrypoint or delete the file and its obsolete tests/exports/config.
4. Verify retained dynamic features are discoverable by the graph tool without fake eager imports.
5. Add an `ng:orphans:check`/equivalent deterministic command with machine-readable allowlist only for genuine non-production/generated cases.
6. Add a negative fixture/test proving a new unreachable production file fails the gate.
7. Register the reachability gate in root `ci:check`.

## Acceptance criteria

- [ ] Zero unapproved production Angular files are unreachable from legitimate runtime entrypoints.
- [ ] Legacy zombie modal/redirect/spinner/service code identified by the audit is removed unless a real owner/entrypoint is proven.
- [ ] Retained Notebook/Synth/client features follow their previously approved product decision and are actually reachable when retained.
- [ ] Lazy routes/action implementations are recognized without artificial eager imports.
- [ ] CI fails on a newly introduced orphan production module.
- [ ] No broad exemption hides future dead-code growth.

## Validation

Run the reachability/orphan checker, negative fixture/test, production Angular build and canonical CI-parity gates. Record the before/after orphan count in execution notes.

## Browser validation

Through `http://localhost:8888`, smoke-test every feature whose entrypoint or legacy replacement changed during orphan cleanup, especially redirects/status flows, overlays/actions and any retained Notebook feature. Verify no lazy-load 404/chunk errors or missing UI.

## Stop conditions

Mark `BLOCKED` if an orphan's product ownership is still genuinely unresolved after the earlier SYS decisions; do not keep or delete it based only on code volume.

## Dependencies

- `0113-enforce-an-acyclic-angular-import-graph.md` should be `DONE` so reachability runs over the final acyclic graph.
- `SYS-018` through `SYS-020` feature ownership decisions must be honored.
- `0106` lazy action registry and the typed route manifest must be represented as graph entrypoints.

## Execution notes

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
