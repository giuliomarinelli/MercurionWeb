# 0082 - Make invalid CSS and Tailwind utilities fail CI

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Add a deterministic Angular styling validation gate that rejects malformed CSS, invalid Tailwind utilities and non-enumerable dynamic class generation before they can silently disappear from the production bundle.

Source: `UI-024` in Series `0001`.

## Context

The audited code contains a real malformed Tailwind candidate (`dark:dark:bg-neutral-900/75`) and runtime-generated candidates such as `size-${this.size}`. Tailwind v3 can silently omit unknown/dynamic candidates, so successful TypeScript compilation or even an Angular build is not sufficient proof that required UI classes exist. Tasks `0077`-`0081` normalize tokens, variants and global CSS; this task makes those invariants enforceable.

## Relevant files and modules

- `MercurionWebNg/src/**/*.{ts,html,css,scss}`
- `MercurionWebNg/tailwind.config.js`
- Angular lint/style configuration
- root package/CI scripts established by `0008`

## In scope

- Introduce or configure maintained CSS/Tailwind-aware static validation compatible with the repository's Angular/Tailwind versions.
- Cover global CSS, component CSS, external templates and inline Angular templates.
- Detect malformed Tailwind variants/utilities and invalid CSS syntax/declarations that can be checked statically.
- Detect Tailwind class construction that cannot be statically enumerated.
- Require dynamic variant sets to use explicit lookup maps or an explicit finite safelist when genuinely necessary.
- Add regression fixtures proving known bad patterns fail.
- Register the gate in root `ci:check` and GitHub Actions through the canonical aggregate.

## Out of scope

- Do not create a second independent lint pipeline that CI runs but local preflight does not.
- Do not suppress genuine errors with a broad ignore list.
- Do not require class ordering/prettification rules unless they improve correctness; this task is about validity.
- Do not modify `../MercurionTox21`.

## Decisions already made

- The check must understand both `.html` templates and inline `template` strings in Angular TypeScript.
- Unknown Tailwind candidates used as real UI classes are errors, not warnings.
- Runtime string interpolation of Tailwind utility names is forbidden unless the complete candidate set is explicitly enumerated for generation.
- A narrow compatibility allowlist is acceptable only for third-party/generated syntax the validator cannot understand, with rationale and regression coverage.

## Requirements

1. Select/configure a Tailwind-v3-compatible validation approach that can inspect Angular source and emitted candidates; a maintained plugin is preferred, but a repository checker that resolves candidate utilities against generated CSS is acceptable when more reliable.
2. Add CSS syntax/property validation for the application stylesheets.
3. Add Tailwind candidate validation for external and inline templates.
4. Add a check for dynamic class-name construction such as template literals that produce utility fragments.
5. Create negative test fixtures containing at least `dark:dark:bg-*`, an unknown utility and a non-enumerable dynamic Tailwind class; verify the gate rejects them.
6. Ensure legitimate typed/static class maps from `0080` pass without broad suppression.
7. Expose one deterministic package/root command and include it in `ci:check`.

## Acceptance criteria

- [ ] Invalid CSS in the governed Angular source fails locally and in CI.
- [ ] Malformed/unknown Tailwind utilities fail locally and in CI.
- [ ] `dark:dark:bg-*` is covered by a regression test and rejected.
- [ ] Non-enumerable runtime Tailwind class construction is rejected.
- [ ] Legitimate finite variant maps/safelisted candidates remain supported and generated.
- [ ] The same gate runs in task preflight and GitHub Actions via the canonical CI aggregate.
- [ ] No broad ignore configuration masks real application styling defects.

## Validation

```text
npm ci
npm run ci:check
```

Run the styling gate directly against both valid production source and temporary/fixture invalid cases. Confirm each invalid fixture produces a non-zero exit code.

## Browser validation

Not required for the validator itself. After the gate is green, use Chrome DevTools MCP at `http://localhost:8888` for a short smoke check of representative canonical primitives to ensure valid generated classes still render correctly.

## Stop conditions

Mark `BLOCKED` if available tooling cannot reliably inspect Angular inline/external templates and implementing a correct deterministic fallback would materially exceed this task, or if CI cannot be restored to green. Do not mark the task done with a checker known to miss the audited failure modes.

## Dependencies

- `0080-make-ui-variant-apis-typed-and-tailwind-internal-free.md` must be `DONE` first.
- `0081-consolidate-global-css-utilities-and-remove-invalid-declarations.md` must be `DONE` first.

## Implementation notes

Prefer correctness over fashionable lint rules. If a third-party linter cannot prove candidate existence, supplement it with a small deterministic generated-CSS/candidate check rather than assuming coverage.

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
_Not applicable / smoke only._

### Commits
_Not recorded._

### Merge / CI
_Not started._

### Rollback
_Not applicable._

### Blocker / human decision required
_None._
