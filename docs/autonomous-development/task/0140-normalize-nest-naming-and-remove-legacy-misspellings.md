# 0140 - Normalize Nest naming and remove legacy misspellings

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-026`
### Preflight
Clean feature branch at `6e1c50d7d3942417cf61024bd6ad867d45b3d64b`, exactly matching
`develop`. Exact-SHA GitHub Actions run `34943551143` succeeded with both Ubuntu
and Windows prerequisite gates, all test/build/container jobs, and the stable
`Required gate`. No task-owned workspace process was active. The pre-change
inventory covered `SercurityService`, `sercurity`, `recover-cretentials`,
`Unauthanticated`, `Models`, `DTO`, and `socket.IO`.
### Preflight remediation
_None._
### Summary
Normalized Nest source paths to lowercase `models/` and `models/dto/`, renamed
the security and recovery files/symbols, normalized the realtime module path to
`socket-io/`, removed the typed legacy unauthenticated error alias, and added an
executable naming policy to the architecture checks.
### Task-specific validation performed
`node scripts/check-nest-naming-policy.mjs` passed; case-sensitive inventory
found no governed legacy names; `git diff --check` passed.
`npm run typecheck --workspace mercurion_web_node` passed,
`npm run typecheck --workspace @mercurion/rest-contracts` passed,
`npm run typecheck --workspace mercurion_web_ng` passed and the Angular build
passed after correcting the case of unchanged Angular `Models/` imports exposed
by the first feature-CI run,
`npm run test:ci --workspace mercurion_web_node` passed (154 suites, 475
tests), `npm run test:e2e:ci --workspace mercurion_web_node` passed (1 suite,
3 tests), `npm run build --workspace mercurion_web_node` passed,
`npm run ci:architecture` passed, and `npm run ci:errors` passed.
### Full pre-merge CI-parity validation
Exact feature SHA `5c319fabc15cc0b2caddcb12583b7d76c97285a8` run
`34945537394` failed in Angular container/typecheck because the first commit
had changed unchanged Angular `Models/` imports to lowercase. This was a
task-owned correction, validated locally, and pushed as the repair commit;
GitHub Actions must certify the resulting SHA. Local `npm ci` and
`npm run ci:check` were not run.
### Browser validation performed
_Not applicable._
### Commits
`7933c1374df39f207d62941dccf4c581409a2a60`
(`refactor: normalize Nest naming conventions`), followed by the case-repair
and execution-note commits.
### Merge / CI
Feature-SHA CI required before integration.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
