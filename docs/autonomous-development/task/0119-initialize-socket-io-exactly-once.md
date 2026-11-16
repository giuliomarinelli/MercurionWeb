# 0119 - Initialize Socket.IO exactly once

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Ensure `SocketIoModule` and its gateway/provider lifecycle are initialized exactly once per Nest application context, with tests that prevent duplicate imports or duplicate side effects.

Source: `BE-005` in Series `0001`.

## Context

`MercurionWebNode/src/app.module.ts` currently lists `SocketIoModule` twice in the root `imports` array. Even when Nest deduplicates some module metadata internally, duplicate registration is an architectural error and makes gateway/adapter lifecycle reasoning ambiguous. Provider ownership is normalized by `0118`; this task gives the realtime module one explicit composition-root entry and verifies runtime lifecycle.

## Relevant files and modules

- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/app_modules/socket.io/socket.io.module.ts`
- Socket.IO gateway/adapter/providers and their specs
- application bootstrap/module-compilation tests

## In scope

- Remove duplicate `SocketIoModule` imports.
- Establish one intentional owner/composition-root path for Socket.IO initialization.
- Verify gateway/provider construction and connection/listener registration occur once per app context.
- Ensure imports by other modules, if any, consume public realtime ports rather than reinitializing the gateway module.
- Add regression tests/static checks for duplicate root-module import.

## Out of scope

- Do not redesign the WebSocket protocol or auth semantics.
- Do not change Redis pub/sub capability policy; `BE-024` owns readiness for keyspace notifications.
- Do not implement shutdown hooks yet; `BE-021` owns coordinated shutdown.

## Decisions already made

- Socket.IO infrastructure has one production initialization point.
- Domains may depend on public realtime capabilities/events but cannot import infrastructure in a way that creates a second gateway lifecycle.

## Requirements

1. Remove the duplicate root import and verify the final module graph contains one Socket.IO initialization path.
2. Add an observable/test hook or module test proving the gateway/provider is instantiated once.
3. Verify Redis adapter/pub-sub bindings and event listeners are not registered twice.
4. Ensure reconnect/session tests still pass after deduplication.
5. Extend the architecture/configuration test to fail on duplicate production module entries where applicable.

## Acceptance criteria

- [ ] `SocketIoModule` appears exactly once in the production composition graph as an initializing module.
- [ ] Socket.IO gateway and infrastructure providers have one lifecycle per app context.
- [ ] No duplicate event/listener/Redis adapter registration is observed in tests.
- [ ] Existing WebSocket behaviour remains compatible.

## Validation

Run Socket.IO module/gateway/guard tests, Nest app compilation/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable; WebSocket compatibility is covered through transport-level E2E tests.

## Stop conditions

Mark `BLOCKED` if current runtime behaviour depends on duplicate module initialization; diagnose that dependency rather than preserving duplicate registration.

## Dependencies

- `0118-give-every-core-nest-provider-a-single-owner.md` must be `DONE`.

## Execution notes

### Feature branch
`feature/BE-005`, created from and still descended from green `develop` base
`7a00ececaf499ec36bb210d12e004100ee77225b`.
### Preflight
- Verified a clean worktree, current branch `feature/BE-005`, `HEAD`,
  `develop`, and `origin/develop` all at
  `7a00ececaf499ec36bb210d12e004100ee77225b`; `git merge-base --is-ancestor`
  returned 0.
- Verified no task/session-owned Angular, Nest, Tox21, Jest, Karma, or other
  workspace-consuming process was active. The existing coordinator and
  Chrome DevTools MCP control-plane processes were not task runtime processes.
- Confirmed exact-base GitHub Actions run
  [34688673031](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34688673031)
  succeeded with `Quality (ubuntu-latest)`, `Quality (windows-latest)`, and
  `Required gate` all green.
- Confirmed prerequisite task `0118` is `DONE`.
- Unchanged focused baseline passed:
  `node scripts/check-nest-module-graph.mjs --root=MercurionWebNode`;
  `node scripts/test-nest-module-graph-negative.mjs`; and 6 focused Jest
  suites (12 tests) covering the app module, Socket.IO module/gateway/guard,
  Redis pub/sub, and session protocol.
### Preflight remediation
_None._
### Summary
- Removed the duplicate `SocketIoModule` entry from the production
  composition root and added a root-metadata regression assertion.
- Made gateway adapter/middleware/PubSub binding and Redis keyspace
  subscription/listener initialization idempotent per provider instance.
- Added a Nest module-compilation test proving one `SocketIOGateway` provider
  wrapper and instance per application context.
- Extended the Nest module-graph gate with duplicate top-level production
  module import detection and a negative fixture.
### Task-specific validation performed
- `node scripts/check-nest-module-graph.mjs --root=MercurionWebNode` - passed;
  22 production modules and 8 configuration files were acyclic with unique
  module imports.
- `node scripts/test-nest-module-graph-negative.mjs` - passed, including the
  new duplicate-import fixture.
- Focused Jest run covering app/module composition, gateway, guard, Redis
  pub/sub, provider ownership, socket/session contracts, reconnect/session
  service behavior, and WebSocket utilities - 10 suites and 24 tests passed.
- `npm run ci:nest:architecture` - passed module graph, duplicate-import
  negative, provider ownership, and provider-ownership negative checks.
- `npm run lint --workspace mercurion_web_node` - passed with 60 pre-existing
  warnings and no errors.
- `npm run typecheck --workspace mercurion_web_node` - passed.
- `npm run test:e2e --workspace mercurion_web_node -- --runInBand` - 1 suite
  and 1 test passed.
- `npm run build --workspace mercurion_web_node` - passed.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run by policy.
The exact base SHA has the successful full Windows/Linux run recorded above;
exact feature-SHA CI remains coordinator-owned after this branch is pushed.
### Browser validation performed
Not applicable; the recipe declares transport/unit/E2E validation instead of
browser/runtime evidence.
### Commits
- `9c340361b8a3c0c707c2342ba63adabf107cee2b` -
  `fix(socket): initialize realtime infrastructure once`
- Task completion metadata is recorded by the final branch commit reported in
  the worker result.
### Merge / CI
Not merged. Exact feature-SHA CI is pending coordinator observation.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
