# 0114 - Remove or explicitly own every orphan Angular module

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Resolve every production Angular file unreachable from an approved application entrypoint and add a CI reachability gate so dead/zombie modules cannot accumulate again.

Source: `NG-028` in Series `0001`.

## Context

The Series baseline identified production files not reachable from the production static graph, including legacy modal/redirect/spinner code and services. Earlier tasks classify server/client feature ownership, introduce lazy route/action registries and remove several legacy UI implementations. This final Angular architecture task distinguishes legitimate lazy/plugin/tooling entrypoints from true zombie production code and makes that distinction machine-verifiable. Management-deferred feature trees are outside this workflow and outside this recipe's reachability inventory.

## Relevant files and modules

- `MercurionWebNg/src/main.ts`
- typed route manifest / `app.routes.ts`
- lazy action registry from `0106`
- production Angular source under `MercurionWebNg/src/app/`
- legacy modal/redirect/spinner/services identified by the baseline audit
- Storybook/catalog/test-only entrypoints from `UI-028`

## In scope

- Build a deterministic production reachability graph starting from all legitimate application entrypoints, including static imports and supported lazy route/action imports.
- Classify every previously orphaned production file as reachable product code, explicit non-production/tooling entrypoint, generated artifact, or dead code to remove.
- Delete dead legacy components/services/models and all obsolete exports/specs/references that exist only for them.
- Ensure product features retained in the active program have explicit route/registry/feature entrypoints.
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
- Synth ownership follows the explicit decisions and implementations from `SYS-018` through `SYS-019`; this task does not reopen them.

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
- [ ] Retained active-program Synth/client features follow their previously approved product decision and are actually reachable when retained.
- [ ] Lazy routes/action implementations are recognized without artificial eager imports.
- [ ] CI fails on a newly introduced orphan production module.
- [ ] No broad exemption hides future dead-code growth.

## Validation

Run the reachability/orphan checker, negative fixture/test, production Angular build and canonical CI-parity gates. Record the before/after orphan count in execution notes.

## Browser validation

Through `http://localhost:8888`, smoke-test every active-program feature whose entrypoint or legacy replacement changed during orphan cleanup, especially redirects/status flows and overlays/actions. Verify no lazy-load 404/chunk errors or missing UI.

## Stop conditions

Mark `BLOCKED` if an orphan's product ownership is still genuinely unresolved after the earlier SYS decisions; do not keep or delete it based only on code volume.

## Dependencies

- `0113-enforce-an-acyclic-angular-import-graph.md` should be `DONE` so reachability runs over the final acyclic graph.
- `SYS-018` through `SYS-019` feature ownership decisions must be honored.
- `0106` lazy action registry and the typed route manifest must be represented as graph entrypoints.

## Execution notes

### Feature branch
The earlier `feature/NG-028` attempt remains preserved. Direct management
instruction on 2026-09-14 re-scoped and reopened this recipe for the active
program; recovery must reconcile that preserved branch with current `develop`.
### Preflight
Must be repeated by the future task worker under the current validation policy.
### Preflight remediation
_None._
### Summary
Reopened after management removed the deferred feature program from the active
recipe directory. This task now owns only reachability and orphan cleanup for
the active Angular program and can complete independently.
### Task-specific validation performed
_Pending after management re-scope._
### Full pre-merge CI-parity validation
_Pending after management re-scope._
### Browser validation performed
_Pending after management re-scope._
### Commits
Historical preserved branch evidence remains in Git history.
### Merge / CI
_Pending after management re-scope._
### Rollback
_Not applicable._
### Blocker / human decision required
_None currently recorded for the re-scoped active-program orphan audit._
