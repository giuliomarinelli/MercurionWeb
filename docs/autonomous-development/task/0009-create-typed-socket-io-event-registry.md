# 0009 - Create typed Socket.IO event registry

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace duplicated Socket.IO event-name strings and ad-hoc payload/ack/error shapes with one typed, versioned registry consumed by both Angular and Nest.

Source: `SYS-009` in Series `0001`.

## Context

The audited client emits string literals such as `auth_refresh` and `so.pub.session_init`; Nest gateway/guards use strings such as `so.pub.public_test`, `sv.pub.public_test`, `so.pub.private_test`, `sv.pub.private_test`, `so.pub.session_init`, and `sv.pub.err`. Payloads and acknowledgements are currently inferred locally rather than derived from one contract.

## Relevant files and modules

- `MercurionWebNg/src/app/services/socket.IO/realtime-socket.service.ts`
- `MercurionWebNg/src/app/services/session-sync.service.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.gateway.ts`
- `MercurionWebNode/src/app_modules/socket.io/guards/ws.guard.ts`
- `MercurionWebNode/src/app_modules/redis/services/pub-sub.service.ts`
- any additional `.emit`, `.on`, `@SubscribeMessage` or server broadcast call sites discovered during inventory

## In scope

- Inventory client-to-server, server-to-client, ack and error events.
- Establish one canonical event contract/registry.
- Provide generated/shared TypeScript event names and payload/ack types to Angular and Nest.
- Replace string literals at event producer/consumer boundaries.
- Add static/automated checks preventing undeclared event names.
- Introduce explicit contract version metadata or a versioning mechanism suitable for later compatibility evolution.

## Out of scope

- Redesigning session semantics; task `0010` owns that protocol.
- Changing Socket.IO transport topology or Redis adapter architecture.
- Adding new product events unrelated to existing behaviour.

## Decisions already made

- Event names, payloads, acknowledgement shapes and transport error shapes derive from one typed registry.
- Existing event wire names remain stable unless the task can migrate all internal producers/consumers atomically with no external compatibility impact.
- The registry must be usable at compile time by both Angular and Nest.

## Requirements

1. Enumerate every Socket.IO event emitted/listened/subscribed/broadcast by both projects.
2. Record direction, payload type, acknowledgement type and error semantics for each event.
3. Introduce the canonical typed registry without maintaining a second handwritten mirror.
4. Replace boundary string literals with registry-derived constants/types.
5. Type the wrappers used by Angular and Nest so an incompatible payload/ack fails compilation where practical.
6. Add an automated inventory/policy check for event literals outside the canonical contract layer.
7. Add contract tests for representative public, private, session-init and error events.

## Acceptance criteria

- [ ] Every current Socket.IO event belongs to the canonical registry.
- [ ] Angular and Nest consume the same contract-derived event identifiers and payload/ack types.
- [ ] `so.pub.session_init`, public/private test events, current auth/session events and `sv.pub.err` are covered.
- [ ] Introducing an undeclared event or incompatible typed payload is caught by static/automated validation.
- [ ] Existing Socket.IO tests/builds pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNode`:

```text
npm run build
npm test -- --runInBand
```

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

Run the new Socket.IO contract/policy check.

## Browser validation

Using the canonical local runtime and Chrome DevTools MCP at `http://localhost:8888`, exercise one existing flow that opens the Socket.IO connection. Verify there are no unexpected console errors, the connection goes through the nginx `/socket.io/` edge, and the expected session/public event exchange succeeds where test credentials/state permit it.

If authentication/test data needed for the declared runtime verification is unavailable, mark the runtime portion `BLOCKED` rather than using production credentials.

## Stop conditions

Block if the repository has an externally consumed Socket.IO event whose compatibility/version contract is undocumented and the implementation would require renaming or changing its wire payload.

Also block if choosing how to physically share/generate the registry between the two independently built applications requires an unresolved repository packaging decision not already established by task `0001` or project tooling.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` only if it establishes a reusable cross-project contract package/generation mechanism; otherwise this task may use an equivalent approved canonical-codegen mechanism without coupling REST and Socket contracts semantically.

## Implementation notes

Keep direction explicit. A client-to-server event and server-to-client response should not become ambiguous merely because they share a conceptual feature name.

## Execution notes

### Summary

- Branch `feature/SYS-009` was verified clean at supplied base
  `d145a623852125340f3de736e450db468d47220f`; repository-local
  `commit.gpgSign=false`, Node.js `22.16.0`, and npm `10.9.2`.
- The unchanged task-start preflight passed: root `npm ci` and
  `npm run ci:check` both exited `0` before task changes.
- Inventoried all application Socket.IO boundaries in Angular and Nest. The
  eight current wire events are `auth_refresh`, `so.pub.public_test`,
  `sv.pub.public_test`, `so.pub.private_test`, `sv.pub.private_test`,
  `so.pub.session_init`, `sv.pub.err`, and `sv.pub.session_expired`.
- Added the framework-neutral `@mercurion/socket-contracts@1.0.0` workspace
  package. Its single registry records direction, payload, acknowledgement,
  error semantics, and contract version, and derives the Socket.IO event maps
  used by both applications.
- Replaced application boundary literals in the Angular realtime/session
  wrappers, Nest gateway and guard, and Redis session broadcast. The public,
  private, session-init, auth-refresh, error, and session-expiration wire names
  and payload values remain unchanged.
- Added compile-time negative assertions, representative runtime contract
  tests, and an AST policy gate that rejects undeclared Socket.IO literals and
  duplicated declared literals outside the canonical registry. The gate is
  registered in root `ci:static`.
- The implementation is preserved as coherent partial work, but the declared
  browser validation could not start safely because mandatory local runtime
  prerequisites failed. Per the recipe and browser-validation rule, the task
  is `BLOCKED`, not complete.

### Validation performed

- Process preflight found no task/session-owned Angular, Nest, Tox21, Karma, or
  Jest runtime before the unchanged clean install.
- Unchanged baseline:
  - `npm ci` — passed, exit `0`.
  - `npm run ci:check` — passed, exit `0`.
- Socket contract/static validation:
  - `npm run ci:socket-contracts` — passed repeatedly; dual-format package
    build, package typecheck, positive policy scan, and negative policy tests
    all exited `0`.
  - Policy inventory reported 8 declared application events and selected every
    Socket.IO-aware boundary file from 770 Angular/Nest TypeScript files.
  - A repository source scan for raw `so.*`, `sv.*`, and `auth_refresh`
    string literals outside the contract package returned no matches.
  - `node -e "require('@mercurion/socket-contracts')..."` loaded the CommonJS
    export and reported version `1.0.0` with 8 events.
- Type/lint:
  - Angular typecheck — passed.
  - Nest typecheck — passed.
  - Angular lint — passed with existing warnings and zero errors.
  - Nest lint — passed with 61 existing warnings and zero errors.
- Task-specific builds/tests:
  - `MercurionWebNode: npm run build` — passed.
  - `MercurionWebNode: npm test -- --runInBand` — 118 suites and 163 tests
    passed.
  - Targeted Socket.IO/registry suites — 4 suites and 6 tests passed.
  - `MercurionWebNg: npm run build` — passed; only the existing bundle,
    `quill-delta`, and RDKit warnings remained after the package's ESM export
    was selected.
  - The literal `MercurionWebNg: npm test -- --watch=false` invocation was
    observed to launch `ng test` without forwarding the option in this npm
    workspace context, so its watcher was stopped by its tracked shell. The
    canonical equivalent `npm run test:ci --workspace mercurion_web_ng`
    (`ng test --watch=false --karma-config=karma.conf.js`) then passed with
    exit `0`.
- All tracked runtime/test processes were stopped after validation; no
  task-owned watcher remained.
- Preserved-branch full CI parity after runtime shutdown:
  - Final root `npm ci` — passed, including the socket-contract package build.
  - Final root `npm run ci:check` — passed, exit `0`, covering autonomous
    recipe validation, both lints/typechecks/test suites/builds, GraphQL drift,
    REST contracts, and the new Socket.IO contract/policy gate.

### Browser validation performed

- The externally managed nginx edge initially returned `502` for both
  `http://localhost:8888/` and `/health`, consistent with intentionally
  stopped application runtimes.
- Started only the canonical task-scoped processes and tracked them:
  - Tox21 Python PID `90544`.
  - Nest watcher command PID `113280` and application PID `65728`.
  - Angular watcher command PID `49092`.
- Angular became reachable through nginx with HTTP `200`, but Nest never
  became ready and `/health` remained `502`.
- The canonical Nest command failed environment validation because no
  non-production runtime configuration was available to the process; required
  values beginning with `APP_*`, `SQL_DATABASE_*`, `JWT_*`,
  `SECURE_COOKIE_*`, `REDIS_*`, and other service configuration were absent.
  No credentials or values were fabricated or sourced from production.
- The canonical Tox21 command also exited before validation because its startup
  log contains a check-mark character that the inherited Windows `cp1252`
  console could not encode (`UnicodeEncodeError`).
- Because the required backend runtime never reached readiness, Chrome DevTools
  MCP was not opened against a knowingly broken stack and no `/socket.io/`
  network, console, or public/session exchange could be claimed. Angular,
  Nest, and Tox21 processes were stopped; the edge again returned `502`.

### Changed files

- Root workspace/package lock and CI aggregate scripts.
- `packages/socket-contracts/**`.
- Angular realtime socket and session-sync services.
- Nest Socket.IO gateway/guard and Redis session broadcast.
- Nest Socket.IO contract runtime tests and Jest TypeScript transform scope.
- This task recipe.

### Blocker / human decision required

- Provide an approved, non-production local runtime configuration for the
  canonical Nest `npm run start:dev` process, and an approved UTF-8-capable
  invocation environment for the documented Tox21 command. Then rerun the
  canonical three-process stack and capture the mandatory Chrome DevTools MCP
  evidence through `http://localhost:8888`, including `/socket.io/` activity,
  console state, and a safe public/session exchange. Production credentials or
  data must not be used.

### Human-assisted recovery attempt (2026-09-05)

- Reconciled `feature/SYS-009` with the current `develop` without rebasing.
  The resolved boundary retains the current `APP_CONFIG` runtime endpoint
  mapping and canonical application-error catalog while keeping all eight
  existing Socket.IO wire names stable.
- `SocketApplicationError` now derives its `code` from
  `@mercurion/rest-contracts`; `WsGuard`, Angular session synchronisation and
  the registry assertions use the same typed `{ code, detail }` envelope.
  The socket package declares its REST-contract dependency and root
  post-install builds the REST package before the socket package.
- Final local validation after a clean install completed: socket-contract
  build/type/policy checks, Angular and Nest type checks, the four targeted
  Socket.IO suites, and the full root `npm run ci:check` gate. The final gate
  ran with no task-owned runtime process active.
- A non-production runtime was brought up only for validation: Tox21 ran with
  process-scoped UTF-8 settings; Nest read the already ignored local
  development env through a process-scoped dotenv preload; Angular, Nest and
  Tox21 were stopped afterwards. Through `http://localhost:8888`, `/health`
  returned `200` and a fresh Socket.IO client completed the public exchange
  `so.pub.public_test("SYS-009") -> sv.pub.public_test("SYS-009 RESP")`.
- The required Chrome DevTools browser evidence is still unavailable in this
  agent session: the exposed computer-use inventory has no browser and each
  available Playwright navigation, snapshot and tab query remained unresolved
  until cancelled. No console, DOM, or browser-network result is therefore
  claimed. Per the task and runtime protocol, the recipe remains `BLOCKED` and
  must not be merged until a human-assisted Chrome DevTools validation records
  the nginx `/socket.io/` request and clean browser console.

### Human-authorized browser completion (2026-09-05)

- A direct human instruction re-enabled this previously blocked recipe solely
  to obtain the missing browser evidence. Chrome was controlled through the
  ChatGPT extension; no credentials were entered and no production system was
  accessed.
- With the non-production stack running behind `http://localhost:8888`, the
  application completed its normal navigation from `/welcome` to `/dashboard`.
  The rendered dashboard was available through the nginx edge and the browser
  console contained no warnings or errors.
- The same runtime then completed the registry public-event exchange through
  the nginx Socket.IO edge: `so.pub.public_test("SYS-009") ->
  sv.pub.public_test("SYS-009 RESP")`. Angular, Nest and Tox21 were stopped
  before this status update and the feature worktree is clean.
- This supersedes the browser-availability blocker above. The exact final
  feature SHA must still pass the required GitHub Actions gate before the
  no-fast-forward merge into `develop`; post-merge CI remains subject to the
  mandatory revert protocol.
