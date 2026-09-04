# 0058 - Isolate action context payloads per open session

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every action-overlay opening create an isolated action session with immutable input and one-shot result so scope/payload/pending state from a previous action cannot leak into a later opening.

Source: `FE-036` in Series `0001`.

## Context

Action-specific context services are root singletons and currently hold mutable payload such as collection IDs, import flags, redirect flags and other action input between callers. `ActionOverlayContextService` separately owns the current scope. Closing an overlay does not inherently prove every specialized context was cleared, so reopening the same or another action can observe stale payload/state.

Task `0045` establishes the overlay lifecycle state machine. This task gives each lifecycle instance a concrete immutable input/result boundary.

## Relevant files and modules

- `MercurionWebNg/src/app/services/context/action-context/action-overlay-context.service.ts`
- all services under `MercurionWebNg/src/app/services/context/action-context/`
- `MercurionWebNg/src/app/Models/action/action-overlay.models.ts`
- `MercurionWebNg/src/app/components/action-components/action-overlay/action-overlay.component.ts`
- action openers in pages/header/sidenav/molecule/help/settings flows
- action components consuming specialized context payloads

## In scope

- Inventory each action scope and its current input/payload/result/pending state.
- Define typed action-session input/result contracts keyed by action scope.
- Create a fresh session identity/input snapshot on every open.
- Make action inputs immutable for the lifetime of that session.
- Make result delivery one-shot and associated with the originating session.
- Clear all session-owned payload/pending/result state on close/cancel/destroy.
- Remove or narrow root singleton action-context payload stores that can outlive an action session.
- Add stale-session/reopen/result tests.

## Out of scope

- Lazy loading action components.
- Redesigning individual action forms/business rules.
- Generic application-wide modal framework beyond the existing action overlay.
- Changing the visual overlay shell.

## Decisions already made

- Every open creates a new action session even when the same scope opens twice consecutively.
- Input is captured immutably at open time; later caller mutations do not alter the active action.
- Result is one-shot and belongs to the session that produced it.
- Close/cancel/destroy removes payload, pending and result state owned by that session.
- Late async completion from session A cannot mutate or close session B.

## Requirements

1. Enumerate action scopes and specialized context services, including molecule save/add/bind/create/select, profile/sensitive-data, help/ticket actions and any current scope added by execution time.
2. Define a typed mapping from scope to input and result shape, using `void`/empty input where appropriate rather than untyped optional global fields.
3. Change the overlay open API to create and return/track a unique action session containing scope and immutable input.
4. Refactor action components to read only their active session's typed input.
5. Deliver success/cancel/error result through a one-shot session result channel/command rather than persistent singleton fields or anonymous ticks.
6. On close/cancel/destroy, remove all session data and prevent stale timers/promises/Observables from mutating a newer session.
7. Eliminate specialized root context state where it only exists to shuttle payload into an overlay; retain a focused service only when it owns real domain state independent of the overlay.
8. Add tests opening scope A with payload 1, closing, reopening A with payload 2, opening B, and resolving a late async result from the old session; only current-session state may change.
9. Ensure no action can reopen with old pending/success/error state unless that persistence is explicitly part of its product contract.

## Acceptance criteria

- [ ] Every action open has a unique session and typed immutable input.
- [ ] Previous action payload/pending/result state cannot appear in a later opening.
- [ ] Results are one-shot and delivered only to the matching originating session/caller.
- [ ] Late old-session async completion cannot mutate the current overlay/action.
- [ ] Closing/destroying an action clears all overlay-session-owned state.
- [ ] Root action contexts no longer act as persistent payload mailboxes.
- [ ] Angular tests/build and canonical CI gates pass.

## Validation

Run action-session/state-machine tests with deliberate rapid reopen and late-response races, existing action component tests, and the canonical CI-parity gate.

## Browser validation

Through `http://localhost:8888`, exercise at least two available action scopes. Open/close/reopen the same action with different entities/input, then switch to another action. Verify no stale IDs/chips/form/pending/error/result state appears and late network completion cannot affect the newer overlay.

## Stop conditions

Mark `BLOCKED` if an action intentionally requires state to survive close/reopen and that persistence is part of product behaviour but is undocumented. Record exactly which state and lifetime require a human decision instead of retaining all singleton payloads.

## Dependencies

- `0045-model-the-action-overlay-as-an-exhaustive-state-machine.md`
- `0047-replace-anonymous-refetch-ticks-with-typed-domain-invalidation.md`

## Implementation notes

A typed `ActionSession<Scope>`/scope-to-contract mapping is preferred over one giant optional payload interface. The active session identity should also be usable as a generation token to reject late async work.

## Execution notes

### Feature branch
`feature/FE-036`, created from `develop` at base SHA `93bc6cb8d47b6e0853d7a53dc0706e09f0a1ac85`.

### Preflight
Confirmed no workspace-consuming Angular/Nest/Tox21/watch process was running, then ran root `npm ci` followed by `npm run ci:check` before any implementation change. Both completed successfully (green baseline) prior to touching any code.

### Preflight remediation
_None. Baseline was green before implementation began._

### Summary
Redesigned `ActionOverlayContextService` so every `open()`/`switchToScope()` call creates a fresh, generation-tokened `ActionSession<Scope>` carrying a typed, immutable `input` snapshot for the lifetime of that session (see `Models/action/action-overlay.models.ts`: `ActionSessionInputMap`, `ActionSession<S>`). The existing `generation` counter (from task `0045`) is reused directly as the session id. `SUBMIT` / `SUBMIT_SUCCEEDED` / `SUBMIT_FAILED` now require the caller's `sessionId` to equal the current generation before mutating state (closing a pre-existing gap: previously only `ACTIVATE`/`UNMOUNT`/`CLEAR` were generation-guarded), and `CLOSE`/`CANCEL` accept an optional `sessionId` that is honored when provided. This closes the literal race described in the task: a late/stale async completion from a superseded session can no longer mutate or close a newer one.

Added a `session<S>(scope)` accessor exposing `{ id, scope, input }` for the active session. All specialized action-context services that previously held real payload (`AddMoleculesToCollection`, `BindCollectionsToMolecule`, `SensitiveDataChange`, `TicketDetail`, `NewTicket`, `CustomMoleculeCollectionItemSave`) were converted from mutable root-singleton payload mailboxes (settable/clearable fields that could survive a close/reopen) into pure read-only `computed()` views derived from `overlay.session(scope)`. `CreateCollectionContextService`, `ProfileRegistryEditContextService` and `SelectCollectionThenRouteContextService` held no state and needed no conversion; `SelectCollectionThenRoute`'s `importFromChembl` input is now carried directly on its own session instead of being borrowed from `AddMoleculesToCollectionContextService` (that borrowing was itself a stale-mailbox bug: the value observed while `SelectCollectionThenRoute` was open was whatever `AddMoleculesToCollection` last held, not necessarily the value the current opener intended).

Found and fixed a genuine pre-existing cross-scope contamination bug: `NewTicketContextService` was an empty pass-through and the `NewTicket`/`TicketDetail` scopes shared `TicketDetailContextService`'s inner-scope field as a singleton mailbox. `NewTicket` now owns its own typed `innerScope` input, verified by a dedicated regression test (`new-ticket-context.service.spec.ts`).

`CustomMoleculeCollectionItemSaveContextService`'s `mode`/`smiles` are now computed from session input; its remaining session-scoped UI selection state (`selectedCollectionId`/`searchTerm`/`page`) is no longer manually reset by callers (the old `.reset()` call site was removed) but is auto-reset via an `effect()` keyed on session-id change (deduplicated with a `lastSessionId` field so the reset only fires on an actual new opening, not on every internal phase transition).

All 9 action components were updated to capture `sessionId = <ctx>.session('<Scope>')?.id ?? -1` once and route every `close()`/`cancel()` call (sync and inside async `.subscribe()` callbacks alike) through the guarded overlay method, and to stop calling now-removed setter/clear methods. `sensitive-data-change.component.ts` keeps its existing local mirror signal for the `ChangePhone` -> `AddPhone` internal substate transition (an in-session UI navigation, not new caller input), only removing the now-invalid context setter call. All 8 opener call sites (`settings`, `molecule-editor`, `molecule-detail`, `molecule-collection-detail`, `my-molecule-collections`, `all-my-molecules`, `sidenav`, `help` -- including its 3 `TicketDetail`/`NewTicket` open sites) now pass typed input directly to `open()`/`switchToScope()` instead of pre-seeding a singleton then opening with no input. `search-input.component.ts` only reads `AddMoleculesToCollectionContextService.collectionId()` and needed no change.

### Task-specific validation performed
- `npx tsc -p tsconfig.app.json --noEmit` (Angular app typecheck): pass, no errors.
- Comprehensive workspace grep for every removed setter/clear method name (`setCollectionId`, `clearCollectionId`, `setMoleculeId`, `clearMoleculeId`, `setInnerScope`, `clearInnerScope`, `setTicketId`, `clearTicketId`, `setRedirectToCollectionPath`, `setImportFromChembl`, `setSmiles`, `setMode(`): zero remaining call sites anywhere in `MercurionWebNg/src/app`.
- `npx ng test --watch=false --browsers=ChromeHeadless --include='**/action-context/**/*.spec.ts'`: 29/29 SUCCESS. Added stale-session/reopen/isolation tests to every specialized context service spec that carries real input (`add-molecules-to-collection`, `bind-collections-to-molecule`, `sensitive-data-change`, `ticket-detail`, `new-ticket`, `custom-molecule-collection-item-save`), each opening scope A with payload 1, closing, reopening with payload 2 (or a different scope), and asserting the earlier payload never resurfaces. `action-overlay-context.service.spec.ts` (pre-existing, updated) directly covers requirement 8: rapid reopen with different input, and rejection of a late `close()`/`beginSubmit()`/`submitSucceeded()`/`submitFailed()` carrying a stale `sessionId` after the generation has moved on.
- `npx ng test --watch=false --browsers=ChromeHeadless --include='**/action-components/**/*.spec.ts'`: 11/11 SUCCESS (all 9 action components plus the overlay shell and a message-item spec pulled in transitively).
- `npx ng test --watch=false --browsers=ChromeHeadless` targeted at the 8 opener pages/components (`settings`, `help`, `molecule-editor`, `molecule-detail`, `molecule-collection-detail`, `my-molecule-collections`, `all-my-molecules`, `sidenav`) plus `search-input` and their transitive fixtures: 27/27 SUCCESS.
- `npm run build` (Angular production build): succeeded; only pre-existing, unrelated warnings (initial bundle budget, CommonJS deps) -- no new warnings/errors introduced.

### Full pre-merge CI-parity validation
Ran root `npm ci` then `npm run ci:check` immediately before finalizing, after stopping every task-owned runtime process. Full aggregate passed: Angular lint, Nest lint, Angular typecheck, Nest typecheck, Angular tests (266/266 SUCCESS), Nest Jest unit tests (187/187 passed, 121/121 suites), Nest Jest E2E tests (23/23 passed, 4/4 suites), Angular production build, Nest build, GraphQL/generated-artifact drift checks, and every other registered static/policy check (console/debugger policy, environment-imports/configs, mock-ip, nested-subscriptions, OnPush-components, internal-imports) -- all green, exit code 0.

### Browser validation performed
Attempted but infeasible in this session environment, documented per the task's browser-validation fallback: after the preflight and implementation were both green, `../MercurionTox21` and `MercurionWebNg` (`ng serve`) started successfully behind the already-running nginx dev edge (`http://localhost:8888/` returned 200 once Angular was up), but `MercurionWebNode` (Nest) failed to boot -- `ConfigModule.forRoot` validation rejected the environment as incomplete, reporting roughly 100 missing/invalid required variables (SQL/Redis/JWT secrets, Twilio, SMTP, OAuth provider client IDs/secrets, session/cookie secrets, etc.). No `.env` populated with real or session-safe secrets is available in this worker's environment, and fabricating credentials for authentication/session/crypto/third-party-integration secrets is out of scope and unsafe. Because every action-overlay scope in this app requires an authenticated session backed by the Nest API/GraphQL layer, no action scope could be opened through the browser without a running backend, so no in-browser action-overlay validation was possible. All started runtime processes (Tox21, the failed Nest attempt, Angular) were stopped again before the final clean-install gate; the externally managed Docker nginx proxy was left untouched. Per the task's stated fallback ("browser validation is mandatory if two safe action scopes can be exercised; otherwise document the concrete limitation and use automated session/race validation"), the automated session/race unit tests described above (29 context-service tests plus the dedicated `action-overlay-context.service.spec.ts` race suite) serve as the substitute evidence for the isolation, one-shot-result, and late-async-rejection acceptance criteria.

### Commits
- The single commit on `feature/FE-036` (subject: "FE-036: isolate action-overlay session payloads per open session"), covering implementation, tests and these Execution notes. The coordinator can resolve its exact SHA via `git log -1 feature/FE-036` when observing feature-SHA CI.

### Merge / CI
Not performed by this worker. Per protocol, only the `Development Session Coordinator` pushes/merges `feature/FE-036` into `develop` and observes feature-SHA / merge-SHA GitHub Actions results.

### Rollback
_Not applicable -- no merge was performed by this worker._

### Blocker / human decision required
_None for implementation correctness._ Recorded for coordinator awareness: local browser/runtime validation of this change (and any future FE-0xx task requiring an authenticated browser session) is blocked in this environment until a complete Nest `.env` (database, Redis, JWT/session secrets, email, Twilio, OAuth) is provisioned; this is an environment/infrastructure gap unrelated to the FE-036 implementation itself.
