# 0114 - Remove or explicitly own every orphan Angular module

- [ ] DONE
- [x] BLOCKED
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
`feature/NG-028`, created from and initially verified at
`851592c3c878bb2bf670a531f17e306d262aa9f9`.
### Preflight
- Proved no task/session-owned Angular, Nest, Tox21, test watcher or other
  repository workspace runtime was active before the clean install.
- Verified the required toolchain: Node.js `v22.16.0`, npm `10.9.2`.
- Ran unchanged root `npm ci` (exit 0).
- Ran unchanged root `npm run ci:check` (exit 0; complete canonical aggregate
  passed).
- Verified the working tree still had no tracked changes after preflight.
### Preflight remediation
_None._
### Summary
Stopped at the recipe's mandatory ownership-decision gate without changing
implementation. Task `0113` is advisory for this attempt and is currently
`SKIPPED_DEPENDENCY`; that status was not used as the blocker.

The required SYS ownership state is not available. `SYS-019` and `SYS-020`
remain terminal `BLOCKED` records because no human/product decision selected
retain versus remove for Synth or Notebook. Current source confirms the
ambiguous retained state still exists: the Nest `SynthModule` remains
registered, the Angular Notebook component/page/service tree remains present,
and `app.routes.ts` has no Notebook or Synth route. Classifying or deleting
those files in this task would therefore invent or bypass the decisions that
this recipe explicitly requires it to honor.
### Task-specific validation performed
Decision-gate inspection only:

- Read the complete `SYS-018`, `SYS-019` and `SYS-020` terminal task records.
- Confirmed `SYS-018` produced a route ownership inventory but is itself
  `BLOCKED` on its declared runtime evidence; it does not supply Synth or
  Notebook retain/remove authority.
- Confirmed `SYS-019` requires an explicit Synth `retain` or `remove` decision
  and, if retained, an approved Angular entry point, UX scope and
  route/navigation placement.
- Confirmed `SYS-020` requires an explicit Notebook `retain` or `remove`
  decision and, if retained, an approved route path, navigation placement and
  access policy/guard audience.
- Inspected current Angular routes/navigation and the retained Notebook source
  tree, plus current Nest Synth module registration.

No orphan checker, deletion or reachability implementation was started because
the stop condition applies before those choices can be made safely.
### Full pre-merge CI-parity validation
Not run after task scope because the task blocked immediately after the green
unchanged preflight and made no implementation change. The complete unchanged
task-start `npm ci` plus `npm run ci:check` both passed.
### Browser validation performed
Not performed. Starting the runtime or inventing routes would not resolve the
missing product authority, and no implementation change was made to validate.
### Commits
Metadata-only BLOCKED commit on `feature/NG-028`:
`docs(task-0114): block pending orphan ownership decisions`.
### Merge / CI
No merge. Preserve and freeze `feature/NG-028` after the metadata commit is
pushed.
### Rollback
_Not applicable._
### Blocker / human decision required
Product authority must supply all of the following before orphan
classification/removal can safely continue:

1. Synth: choose `retain` or `remove`. If retained, approve its Angular entry
   point, UX scope and route/navigation placement; if removed, authorize
   complete runtime/schema removal.
2. Notebook: choose `retain` or `remove`. If retained, approve its canonical
   Angular route path, navigation exposure/placement and access policy/guard
   audience; if removed, authorize complete client/schema/server removal.

Without those decisions, this task cannot determine whether retained
Synth/Notebook code is product code requiring a legitimate reachability edge
or dead code requiring deletion. The recipe forbids choosing based on code
volume or making code artificially reachable.
