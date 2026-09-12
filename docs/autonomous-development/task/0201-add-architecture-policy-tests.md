# 0201 - Add architecture policy tests

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Consolidate the architecture rules established throughout the Series into deterministic CI tests that reject dependency cycles, forbidden layer imports, environment-specific Angular imports and direct browser persistence outside canonical adapters.

Source: `QA-015` in Series `0001`.

## Context

Earlier FE/NG/BE tasks remove Angular import cycles, Nest module/provider cycles, environment-specific imports, direct browser storage ownership and other architectural violations. Without a permanent executable policy those defects can silently return. Some earlier tasks may already introduce scanners/scripts for individual rules; this task must consolidate and reuse them rather than create competing analyzers with inconsistent results.

## Relevant files and modules

- Angular source/import graph
- Nest module/source dependency graph
- static/architecture scripts introduced by FE/NG/BE tasks
- canonical environment/config and storage adapters
- root package scripts
- `.github/workflows/ci.yml`
- documented architecture/layer rules

## In scope

- Define a version-controlled architecture policy describing allowed dependency directions and explicit boundaries for Angular and Nest.
- Enforce zero forbidden cycles across maintained production modules.
- Enforce Angular layer/import boundaries and prohibit environment-variant-specific imports.
- Enforce no direct `localStorage`/`sessionStorage` use outside canonical persistence owners.
- Enforce key Nest module/layer boundaries and zero module/provider cycles established by BE tasks.
- Consolidate existing static-check scripts into one canonical architecture/static gate where practical.
- Provide narrow documented allowlists only for intentional architecture edges, with owner/rationale.
- Register the gate in canonical CI parity.

## Out of scope

- Do not build a second full linter when ESLint already enforces a local rule effectively.
- Do not duplicate generated-schema/GraphQL drift checks from existing gates.
- Do not permit wildcard layer exceptions or a permanent baseline of known cycles.
- Do not force runtime-only dependency relationships into a static model if they cannot be represented truthfully; document the appropriate separate test instead.

## Decisions already made

- Architectural invariants are executable and fail CI when regressed.
- Existing earlier static gates are reused/consolidated rather than forked.
- Production dependency cycles targeted by the Series have a zero baseline.
- Exceptions are explicit, narrow and reviewable.

## Requirements

1. Inventory the architecture/static rules already implemented by FE/NG/BE tasks and select one canonical runner/interface for them.
2. Model allowed Angular layer dependencies and reject reverse/forbidden edges, direct environment variants and persistence bypasses.
3. Model Nest module/layer dependency directions and reject cycles/forbidden cross-domain internals.
4. Ensure lazy-route/action entrypoints are understood correctly so valid lazy boundaries are not reported as orphans/cycles.
5. Store any unavoidable allowlist entry with path/edge, reason and owner; broad globs are forbidden.
6. Add representative negative fixtures/tests proving each policy actually fails.
7. Expose a deterministic root command such as a canonical `ci:static` constituent rather than creating a parallel CI workflow.
8. Keep diagnostics actionable by printing the violating edge/path/rule.

## Acceptance criteria

- [ ] Maintained Angular and Nest production graphs satisfy the documented architecture policy.
- [ ] Forbidden cycles and layer edges fail the architecture gate.
- [ ] Environment-specific Angular imports and direct browser persistence outside adapters fail automatically.
- [ ] Existing static scanners are consolidated/reused where equivalent.
- [ ] Any exception is narrow, named and justified.
- [ ] The architecture gate is part of canonical CI parity.

## Validation

Run the architecture/static gate on the real repository and representative negative fixtures, then lint/typecheck/tests/build and repository-wide CI parity.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if two earlier tasks established genuinely contradictory dependency rules or if an intentional cross-layer edge has no documented architectural owner/decision.

## Dependencies

- Relevant FE/NG/BE architecture tasks must be `DONE`.
- `0199` and `0200` should provide strict local lint rules where those are the canonical enforcement mechanism.
- `0008` canonical CI interface must be available.

## Implementation notes

The value is preserving the architecture already paid for by earlier refactors. Prefer small deterministic rule sets with excellent diagnostics over an opaque score or huge generic analyzer configuration.

## Execution notes

### Feature branch
`feature/QA-015`, based on `bdaaffdc2a37d0f14c33df979138b7534b7eb96a.`
### Preflight
Confirmed clean branch identity and exact supplied base SHA. Dependencies `0008`,
`0199` and `0200` are `[x] DONE`; relevant Angular import/environment/storage
and Nest module/provider ownership tasks are already integrated. No workspace
watcher or task-owned runtime process was active. The supplied base is the
green `develop` tip. Browser validation is not applicable. Did not run `npm ci`
or `npm run ci:check`.
### Preflight remediation
_None._
### Summary
Added the versioned architecture policy and one canonical `ci:architecture`
runner. It reuses the existing Angular/Nest graph, environment, storage,
GraphQL and provider scanners and their negative fixtures, adds deterministic
static layer checks with actionable edge diagnostics, and keeps dynamic lazy
imports out of the eager layer model while retaining graph cycle detection.
One exact notification-template adapter edge is allowlisted with owner and
rationale; future exceptions must use the same narrow format. Registered the
canonical gate in `ci:static` without duplicating the existing scanners.
### Task-specific validation performed
Passed: `npm run ci:architecture`; `node scripts/test-architecture-policy-negative.mjs`;
`npm run ci:static`; `git diff --check`. The negative fixture rejected Angular
service-to-page and Nest utility-to-domain imports and accepted a dynamic lazy
import. Existing negative fixtures reported their violating edge/path
diagnostics. Full clean-install and aggregate CI parity remain GitHub Actions
responsibilities.
### Full pre-merge CI-parity validation
_Not started._
### Browser validation performed
_Not applicable._
### Commits
Pending final task commit.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
