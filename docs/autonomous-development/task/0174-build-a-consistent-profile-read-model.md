# 0174 - Build a consistent profile read model

- [ ] DONE
- [ ] BLOCKED

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