# 0157 - Make Help public IDs single-source and deterministic

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Help ticket/message public identifiers deterministic projections of the persisted DB identity so the same logical ID is used exactly once and remains identical across API responses, email content and logs, with no random fallback.

Source: `DATA-008` in Series `0001`.

## Context

`Ticket.publicId` is a unique DB-generated bigint identity. `HelpService.createTicket()` currently formats `ticket.publicId`, sends email, mutates/filters the entity, then formats `ticket.publicId` a second time. `generateReadablePublicId()` also has a random fallback when its input is not a valid numeric identity. This lets an invalid persistence value produce a plausible but unrelated public identifier and mixes storage representation with presentation mutation.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/help/Models/entities/ticket.entity.ts`
- `MercurionWebNode/src/app_modules/help/Models/entities/ticket-message.entity.ts`
- `MercurionWebNode/src/app_modules/help/services/help.service.ts`
- Help DTO/presenter code
- mail notification code
- typed error/public-ID infrastructure

## In scope

- Define one side-effect-free formatter/value type for raw persisted Help identities.
- Preserve current approved ticket/message prefixes and zero-padding semantics.
- Keep the raw DB identity and formatted public identifier conceptually distinct.
- Format at a stable mapping/presentation boundary rather than mutating a persistence entity repeatedly.
- Remove random or synthetic fallback IDs; invalid/missing raw identity fails with a typed internal/data error.
- Ensure emails/logging/API consume the same already-resolved public identifier for one command.
- Add invariance and malformed-input tests.

## Out of scope

- Do not replace the underlying DB-generated bigint identity with a different key solely for aesthetics.
- Do not change Mercurion UUID primary keys.
- Do not change public prefixes/padding unless an existing public contract requires it.
- Do not perform the full entity-to-DTO separation owned by `0159` beyond the seam needed to stop entity mutation.

## Decisions already made

- Persisted DB identity is authoritative; presentation never invents a replacement identity.
- Public-ID formatting is pure and idempotent.
- Invalid persisted ID data is an error, not an opportunity to generate a random-looking ID.
- One command resolves the public ID once and reuses that value for response/email/log correlation.

## Requirements

1. Document the current raw ticket/message public-id column semantics, prefixes and padding widths.
2. Implement typed formatter/value helpers that accept only the valid raw identity representation.
3. Remove repeated `generateReadablePublicId` mutation from Help command/query flows.
4. Remove `randomBytes`/random fallback from public-ID creation; surface a typed internal data-integrity failure on invalid raw values.
5. Ensure newly persisted entities are reloaded/resolved only as needed to obtain the database-generated identity.
6. Pass the resolved public ID to notification/presentation code rather than letting each consumer recalculate independently.
7. Add tests for minimum/large IDs, repeated formatting, malformed/non-numeric/empty values and consistent API/email/log output.

## Acceptance criteria

- [ ] A ticket/message public ID is a deterministic function of its persisted raw identity.
- [ ] `createTicket` never formats the same mutable entity field twice.
- [ ] Invalid raw public IDs never produce a random fallback.
- [ ] DB, API, email and logging refer to the same logical public identifier.
- [ ] Public formatting is pure/idempotent and covered by tests.
- [ ] Existing valid public-ID strings remain backward compatible.

## Validation

Run public-ID unit/property tests, Help service/resolver tests, notification tests, DB-backed ticket creation tests, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if production contains multiple incompatible historical public-ID formats whose continued acceptance/serialization policy is not documented.

## Dependencies

- `0150-establish-versioned-typeorm-migrations.md` and `0151-enforce-database-integrity-constraints-and-indexes.md` should be `DONE` so the persisted identity contract is explicit.
- `0127-replace-string-status-mapping-with-typed-application-errors.md` should be `DONE` for invalid-data errors.

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
