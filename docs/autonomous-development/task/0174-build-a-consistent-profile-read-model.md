# 0174 - Build a consistent profile read model

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

Planner status at execution: `PENDING/READY`. Resolved hard dependencies:
`0152` and `0143`, both `DONE`; no terminal dependency closure applies.
## Objective

Replace the profile registry's sequential mixed-snapshot reads with one coherent read-model projection that obtains profile fields, SSO identity, collection/molecule counts and optional recent-history data with a constant, bounded number of queries on the same snapshot.

Source: `DATA-025` in Series `0001`.

## Context

`UserService.getVerifiedUserProfileById()` starts a TypeORM transaction and reads the User/AuthIdentity plus multiple counts through its transaction manager, but then calls `HistoryService.getRecentHistoryTinyDistinctPerDay()` through a repository owned outside that manager. Collection, custom molecule and ChEMBL counts are also executed sequentially. The resulting profile is a projection, not an aggregate to mutate, and should have explicit read-model semantics rather than mixing domain repositories and transaction scopes.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/user/services/user.service.ts`
- profile DTOs/resolvers/controllers
- `HistoryService`
- User/AuthIdentity entities
- molecule collection/item entities
- canonical pagination/read-model utilities where applicable

## In scope

- Extract a dedicated profile read-model/query service.
- Load all profile data from one explicit database snapshot/transaction manager.
- Aggregate independent counts in one grouped query or a fixed bounded set of queries rather than sequential per-metric round trips.
- Make recent-history loading use the same manager/snapshot when requested.
- Return a purpose-built immutable profile DTO/projection rather than persistence entities.
- Keep SSO versus native-email projection behavior explicit.
- Add query-count and consistency tests under concurrent writes.

## Out of scope

- Do not move profile mutations into the read model.
- Do not redesign History's general paginated read model; `0182` owns that broader refactor.
- Do not add process-global profile caching.

## Decisions already made

- Profile is a query projection, not a mutable domain entity.
- All fields presented as one profile response must come from one coherent snapshot where the database supports it.
- Query count must be constant with respect to the number of profile metrics.

## Requirements

1. Inventory every value currently produced by the profile registry and its source query.
2. Introduce an explicit profile projection/query service with no write methods.
3. Use one transaction manager for User, AuthIdentity, aggregate counts and recent-history query when history is requested.
4. Consolidate custom/ChEMBL/collection counts using conditional aggregate queries or an equivalent fixed-query projection.
5. Expose a manager-aware History query primitive without making the profile service reach into History entity internals.
6. Preserve security/obscuring rules for email/phone fields through explicit presentation logic.
7. Add instrumentation tests asserting an upper bound on SQL queries and snapshot-consistent results while another transaction mutates related rows.

## Acceptance criteria

- [ ] Profile registry does not mix transaction-manager reads with repository reads outside the snapshot.
- [ ] Profile metrics are obtained with a fixed bounded query count.
- [ ] The returned object is an immutable profile projection/DTO.
- [ ] Native and SSO profiles retain correct identity/email behavior.
- [ ] Consistency/query-count tests protect the read model.

## Validation

Run profile/User/History focused integration tests, concurrent snapshot tests against the supported database, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

Validate the profile/settings surface through `http://localhost:8888`, including a native account and an SSO account when fixtures support both.

## Stop conditions

Mark `BLOCKED` if the currently supported database isolation level cannot provide the required snapshot semantics without a repository-wide isolation-policy decision, or if profile fields have undocumented product semantics that conflict with the current response contract.

## Dependencies

- `0152` canonical Unit of Work must be `DONE`.
- `0143` canonical pagination/read conventions should be available where reused.

## Implementation notes

Do not optimize by firing the current queries concurrently with `Promise.all`; that reduces latency but still leaves scattered query ownership and may not guarantee a coherent snapshot. Build the projection explicitly.

## Execution notes

### Feature branch
`feature/DATA-025`
### Preflight
Base SHA `d11790ca7eaeec10c064f3ee63290a18ae1b18af` was clean, matched the
requested feature branch, and had successful exact-SHA Actions run
`35287572853` (`Required gate` green). `npm run autonomous:plan --silent`
classified task `0174` as `PENDING/READY` with no stale skips, cycles, or
planner errors. Local signing policy was `commit.gpgSign=false`. No
workspace-consuming application process was active before the task runtime
probe.
### Preflight remediation
None.
### Summary
Extracted `ProfileReadModelService` as a read-only projection boundary. Profile
identity, conditional molecule counts, collection count, and optional recent
history are now read through one transaction manager; the profile result is a
frozen DTO projection. `HistoryService` exposes an explicit manager-aware
recent-history primitive, while its existing API preserves standalone
transaction behavior.
### Task-specific validation performed
Passed:

- `npm test --workspace mercurion_web_node -- --runInBand src/app_modules/user/services/profile-read-model.service.spec.ts src/app_modules/user/services/user.service.spec.ts`
  (2 suites, 9 tests).
- `npm run typecheck --workspace mercurion_web_node`.
- `npm run lint --workspace mercurion_web_node`.
- `npm run build --workspace mercurion_web_node`.
- `git diff --check`.

The profile tests cover native and SSO identity projection, missing SSO
identity handling, frozen output, bounded metric-query instrumentation, and
manager identity propagation to recent history.
### Full pre-merge CI-parity validation
Initial feature SHA `765d48f4807e23941a622d788c3dbeb301071465` failed exact
feature-SHA CI run `35288626219`: provider-ownership could not resolve
`HistoryService` for `ProfileReadModelService`. The narrow repair imports `HistoryModule` into `UserModule`; the provider
ownership test now overrides the task-local read-model/history providers when
assembling its intentionally partial module graph. A replacement exact
feature-SHA `Required gate` is pending; local `npm ci` and `npm run ci:check`
were not run.
### Browser validation performed
Canonical runtime started in the required order with live handles:
Tox21, Nest watch mode, Angular watch mode. Two consecutive readiness rounds
passed through `http://localhost:8888` for `/` and `/health` before browser
use, both before and after implementation. The supported fresh ordinary local
login completed before implementation and rendered the protected dashboard.
Post-change protected settings validation at
`http://localhost:8888/settings` showed the native profile summary, masked
email, provider identity, and molecule/collection metrics; the page had no
console errors. No SSO fixture was available in the local environment.
Task-owned Tox21, Nest, and Angular processes were stopped after validation.
### Commits
Initial implementation `765d48f4807e23941a622d788c3dbeb301071465`; CI repair
commit pending on `feature/DATA-025`.
### Merge / CI
Pending coordinator integration after exact feature-SHA CI succeeds.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
