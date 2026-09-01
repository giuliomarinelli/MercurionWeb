# 0140 - Normalize Nest naming and remove legacy misspellings

- [ ] DONE
- [ ] BLOCKED

## Objective

Apply one repository naming convention to Nest files, symbols, directories and error codes, removing misspelled/legacy aliases instead of carrying duplicate names forward.

Source: `BE-026` in Series `0001`.

## Context

The audit identified divergent names such as `SercurityService` / `sercurity.service`, `recover-cretentials`, `Unauthanticated`, uppercase `DTO`/`Models` directory conventions and `socket.IO` casing. These inconsistencies make search/refactoring unreliable and are especially risky on case-sensitive CI/runtime filesystems.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/sercurity.service.ts`
- `MercurionWebNode/src/app_modules/auth/Models/DTO/recover-cretentials.cls.dto.ts`
- typed error taxonomy introduced by `0127`
- `MercurionWebNode/src/app_modules/socket.io/`
- backend `Models` / `DTO` directory trees
- imports, tests and generated/schema references affected by renames

## In scope

- Define/document one naming/casing convention for backend source folders, files, symbols and error codes.
- Rename known misspellings to canonical terms (`Security`, `recover-credentials`, `Unauthenticated`, etc.).
- Normalize directory/file casing where the migration can be performed safely across Windows and CI.
- Update every import, DI token/reference, test and documentation reference affected.
- Remove compatibility aliases/re-exports once callers are migrated.
- Add static checks for known forbidden legacy spellings and casing conventions where practical.

## Out of scope

- Do not rename public API fields/error codes that are intentionally versioned external contracts without preserving the approved compatibility contract.
- Do not perform unrelated domain refactors.
- Do not retain typo aliases indefinitely merely to avoid updating internal callers.

## Decisions already made

- Internal source naming uses one canonical spelling/casing convention.
- Legacy misspellings are removed, not treated as supported synonyms.
- Case-only renames must be Git-visible and work on case-insensitive development filesystems.

## Requirements

1. Inventory all occurrences of the audited misspellings/casing variants before changing them.
2. Rename symbols/files/directories with Git-safe two-step moves when needed for case-only changes.
3. Update typed application error codes from `0127` so `Unauthanticated` cannot survive as a canonical code.
4. Update imports/tests/path aliases and ensure Linux/case-sensitive resolution succeeds.
5. Add a deterministic forbidden-name/casing check or architecture rule for the normalized areas.
6. Verify generated artifacts are regenerated rather than manually patched if their names derive from source.

## Acceptance criteria

- [ ] `SercurityService`, `sercurity`, `recover-cretentials`, `Unauthanticated` and other audited legacy spellings are absent from production source.
- [ ] Directory/file casing follows one documented convention.
- [ ] No compatibility alias exports a removed typo internally.
- [ ] Build/tests pass on case-sensitive path semantics.
- [ ] CI detects reintroduction of governed legacy names.

## Validation

Run forbidden-name/static checks, TypeScript build/typecheck, full Nest tests/E2E and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a misspelled string is confirmed to be a currently supported external wire contract and changing it requires a versioning decision; internal naming cleanup should still proceed where separable.

## Dependencies

- `0127-replace-string-status-mapping-with-typed-application-errors.md` should be `DONE` before error-code cleanup.

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
