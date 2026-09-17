# 0082 - Make invalid CSS and Tailwind utilities fail CI

- [x] DONE
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

> Current status (2026-09-17): `DONE` / `CI_PENDING`. Implementation and
> focused validation passed on `feature/UI-024`; exact feature-SHA and merge
> CI remain coordinator-owned.

### Feature branch
`feature/UI-024`

### Preflight
- Verified clean `feature/UI-024` at certified base
  `cb1681211e389193390da3cf5bdaf74c57d2ea9f`.
- Confirmed supplied fresh full develop CI run `35222871770` succeeded with
  the Required gate and platform/container jobs.
- Unchanged focused checks passed: `npm run ui:tokens:check`,
  `npm run ui:colors:check`, and `npm run ci:angular:ui-variant-apis`.
- Chrome DevTools MCP non-navigating capability probe passed with the
  dedicated browser page at `about:blank`.
- Runtime preflight started Tox21, Nest watch mode, and Angular watch mode in
  the required order with live handles. The nginx edge returned two complete
  readiness rounds of HTTP 200 for `/health` and `/`.

### Preflight remediation
None.

### Summary
Added `ci:angular:styling`, a deterministic PostCSS/Tailwind generated-CSS
validator for Angular external and inline templates plus governed stylesheets.
The gate rejects malformed repeated variants, candidates absent from generated
CSS, non-enumerable Tailwind class construction, malformed CSS, and invalid
standard property values. Added four negative regression fixtures and wired
the command into the existing `ci:static` aggregate. Corrected nine existing
invalid utility usages surfaced by the new gate without adding a broad
allowlist.

### Task-specific validation performed
- `node scripts/check-angular-styling.mjs` passed for 479 governed files and
  1,127 Tailwind candidates.
- `node scripts/test-angular-styling-negative.mjs` passed for malformed
  `dark:dark:bg-*`, an unknown utility, non-enumerable dynamic class
  construction, and invalid `scrollbar-width`.
- `npm run ci:typecheck:angular` passed.
- `npm run ci:lint:angular` passed with zero warnings.
- `npm run build --workspace mercurion_web_ng` passed; Angular reported only
  the existing initial bundle budget warning.
- `git diff --check` passed.

### Full pre-merge CI-parity validation
Not run locally because `npm ci` and `npm run ci:check` are Actions-only.
Exact feature-SHA validation is coordinator-owned after publication.

### Browser validation performed
- Restarted Tox21, Nest watch mode, and Angular watch mode in the required
  order with live handles; two complete readiness rounds returned HTTP 200
  through `http://localhost:8888/health` and `http://localhost:8888/`.
- Chrome DevTools MCP opened `http://localhost:8888/welcome`; the rendered
  canonical welcome shell, images, links, responsive utility classes, and
  theme selector were present.
- Opened the theme selector, switched to dark theme, confirmed the theme
  controls rendered, then restored the light theme. Browser console contained
  no errors before or after the interaction.
- No authentication or protected state was required.
- Stopped all three task-owned runtime sessions and verified no matching
  Tox21, Nest, or Angular process remained.

### Commits
`9d306affed32bf4fad654b028317e51e468f6465`

### Merge / CI
Feature branch publication and exact feature-SHA/merge-SHA CI remain
coordinator-owned.

### Rollback
_Not applicable._

### Blocker / human decision required
None.
