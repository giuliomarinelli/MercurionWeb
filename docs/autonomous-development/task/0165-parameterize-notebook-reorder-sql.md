# 0165 - Parameterize Notebook reorder SQL

- [ ] DONE
- [ ] BLOCKED

## Objective

Eliminate SQL text construction from user-provided Notebook IDs so every Chapter/Section/Page reorder uses fully bound parameters or an equivalently parameter-safe bulk-update primitive.

Source: `DATA-016` in Series `0001`.

## Context

The current Chapter, Section and Page reorder implementations build SQL fragments with code equivalent to `WHEN id = '${id}' THEN ${idx}` and inject the resulting string into a `CASE` expression. The surrounding `WHERE id IN (:...ids)` is parameterized, but that does not make the interpolated `CASE` values safe. `0164` provides one ordered-tree persistence seam, so the fix belongs there rather than three independent patches.

## Relevant files and modules

- ordered-tree persistence/coordinator from `0164`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-chapter.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-section.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-page.service.ts`
- TypeORM query/migration/database dialect configuration from `0150`
- SQL-safety/static architecture tests

## In scope

- Replace every Notebook reorder `CASE` expression containing interpolated IDs/order values with parameter binding.
- Prefer a set-based bulk update appropriate for the supported DB dialect, such as a parameterized `CASE`, `VALUES` join or equivalent query-builder/raw-query form whose data values are all bind parameters.
- Keep parent and owner predicates parameterized in the same statement/transaction.
- Ensure the implementation works through the common ordered-tree seam established by `0164`.
- Add static tests/rules preventing future construction of reorder SQL using template literals/string concatenation with request-derived IDs.
- Add malicious/malformed input tests proving input data cannot alter SQL structure.

## Out of scope

- Do not treat UUID validation as the SQL-injection defense; validation is defense in depth, while binding is mandatory regardless of ID shape.
- Do not finalize whether a reorder list is complete/authorized; `0166` owns those semantic checks.
- Do not finalize concurrent sibling-order locking/uniqueness; `0167` owns that invariant.
- Do not rewrite unrelated raw SQL unless the same unsafe pattern is discovered in the ordered-tree path.

## Decisions already made

- Every request-derived identifier and order value is data, never SQL syntax.
- `IN (:...ids)` does not excuse interpolation of the same IDs elsewhere in the query.
- The supported database dialect established by `0150` determines the exact safe bulk-update technique.
- Parameter safety is verified by tests/static checks and is not dependent on UUIDv7 validation.

## Requirements

1. Capture the existing Chapter/Section/Page reorder SQL and prove which values are currently interpolated versus bound.
2. Implement one parameter-safe bulk-order update behind the ordered-tree adapter/repository seam.
3. Bind every sibling ID, parent ID, owner ID and resulting order value; no user/request value may be concatenated into SQL text.
4. Preserve the current intended ordering result for valid input while using deterministic zero-/one-based positions according to the established domain convention.
5. Add query-level tests that inspect generated SQL + parameter arrays or execute against a disposable database and prove values remain parameters.
6. Add adversarial input tests with quotes/comment/operator-like strings at the boundary and verify rejection/binding cannot modify the statement structure.
7. Add a scoped static rule/check to canonical CI that rejects template/string construction of SQL from ordered-tree IDs.
8. Remove all old `WHEN id = '${...}'`-style implementations from Chapter/Section/Page.

## Acceptance criteria

- [ ] No Notebook reorder statement interpolates request-derived IDs or positions into SQL text.
- [ ] Chapter, Section and Page all use one parameter-safe bulk-order implementation.
- [ ] Parent/owner filters remain parameterized.
- [ ] Invalid/adversarial input cannot alter SQL syntax even if boundary validation is bypassed in a test.
- [ ] Existing valid reorder semantics remain compatible.
- [ ] CI detects reintroduction of interpolated ordered-tree SQL.

## Validation

Run ordered-tree SQL-generation/integration tests on the supported disposable DB, adversarial input tests, Notebook service/resolver tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the database dialect support decision from `0150` is still unresolved and no single safe bulk-update strategy can be implemented/tested for the active supported dialects without choosing which deployment is authoritative.

## Dependencies

- `0150-establish-versioned-typeorm-migrations.md` should be `DONE` so supported SQL dialect semantics are known.
- `0164-introduce-notebook-ordered-tree-domain.md` must be `DONE` first.

## Implementation notes

A raw SQL statement is acceptable only when its structure is static and every dynamic value is passed through the driver's parameter mechanism. Avoid solving the issue by pre-validating strings and then continuing to interpolate them.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
