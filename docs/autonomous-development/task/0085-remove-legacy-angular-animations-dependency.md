# 0085 - Remove legacy Angular animations dependency

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove application dependence on legacy `@angular/animations`/`provideAnimations` and express UI transitions through CSS and Angular's native enter/leave mechanisms or equivalent non-legacy primitives.

Source: `UI-027` in Series `0001`.

## Context

`MercurionWebNg/src/app/app.config.ts` currently imports `provideAnimations` from `@angular/platform-browser/animations` and registers it globally. `MercurionWebNg/package.json` still declares `@angular/animations`, and `NgxSpinnerModule` is globally imported even though the audited source search finds no application `ngx-spinner` consumer beyond configuration/package metadata. Earlier task `0071` creates the canonical progress/skeleton layer, so legacy spinner/animation support must not remain solely as historical infrastructure.

## Relevant files and modules

- `MercurionWebNg/src/app/app.config.ts`
- `MercurionWebNg/package.json` and lockfile
- Angular templates/components containing transition/animation behaviour
- canonical progress/skeleton primitives from `0071`
- `MercurionWebNg/src/styles.css`

## In scope

- Inventory any direct or transitive application usage that still requires Angular legacy animations.
- Replace application transitions with CSS and Angular native `animate.enter`/`animate.leave`-style mechanisms where lifecycle-aware enter/leave semantics are needed.
- Remove `provideAnimations()` and the legacy animations import/provider.
- Remove `@angular/animations` from direct application dependencies once no direct requirement remains.
- Remove dead `NgxSpinnerModule`/`ngx-spinner` configuration/dependency if it remains unused after the canonical progress migration; if a real use remains, migrate it to the canonical progress primitive before removal.
- Add a static dependency/source guard preventing reintroduction of application imports from `@angular/animations`.

## Out of scope

- Do not remove optional/transitive peer metadata from third-party lockfile entries that the package manager owns.
- Do not eliminate useful animation; preserve intended transitions with the supported replacement.
- Do not add another animation framework.
- Do not modify `../MercurionTox21`.

## Decisions already made

- The Angular application must not require `provideAnimations`, `BrowserAnimationsModule` or direct `@angular/animations` APIs after this task.
- CSS transitions/animations are preferred for purely visual state changes.
- Native Angular enter/leave support is appropriate when transition timing must align with DOM insertion/removal.
- `prefers-reduced-motion` behaviour established by the design system must be preserved.

## Requirements

1. Search production/test code and package metadata for legacy animation imports/providers/triggers and `ngx-spinner` usage.
2. Migrate any remaining legitimate application animation to supported CSS/native enter/leave patterns.
3. Remove `provideAnimations()` and its import from application configuration.
4. Remove the direct `@angular/animations` dependency and update the lockfile.
5. If `ngx-spinner` is still only dead configuration, remove its module/dependency; if actually used, replace the use with the canonical progress primitive first.
6. Add/extend a static check rejecting future direct application imports from the legacy animation package.
7. Verify production build, tests and transition behaviour in reduced-motion and normal modes.

## Acceptance criteria

- [ ] `app.config.ts` does not register legacy Angular animation providers.
- [ ] Production Angular source has no direct import from `@angular/animations` or legacy browser-animation modules/providers.
- [ ] `@angular/animations` is not a direct dependency of `MercurionWebNg`.
- [ ] Dead `ngx-spinner` configuration/dependency is removed if no genuine consumer exists.
- [ ] Existing intended transitions use CSS/native supported mechanisms and respect reduced motion.
- [ ] A deterministic static/CI check prevents legacy animation imports from returning.
- [ ] Existing interaction lifecycle remains compatible.

## Validation

```text
npm ci
npm run ci:check
npm run build
```

Also search production application source for `@angular/animations`, `provideAnimations`, `BrowserAnimationsModule` and `ngx-spinner`; only package-manager-owned transitive metadata may remain where unavoidable.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`:

1. exercise dialogs/action overlays, loading/progress transitions and any migrated enter/leave UI;
2. verify rapid open/close sequences do not leave orphaned DOM or styles;
3. emulate `prefers-reduced-motion: reduce` and confirm animations are suppressed/reduced appropriately;
4. verify both themes and mobile/desktop layouts;
5. confirm no runtime animation-provider errors.

## Stop conditions

Mark `BLOCKED` if a required third-party production component truly depends on the legacy provider and replacing that component is an unresolved architectural/product decision, or if CI cannot be restored to green. Prove the dependency before blocking; dead historical configuration is not a blocker.

## Dependencies

- `0071-consolidate-progress-indicators-and-skeletons.md` must be `DONE` first.
- `0083-add-automated-accessibility-and-keyboard-coverage-for-canonical-ui.md` must be `DONE` first.

## Implementation notes

Do not confuse peer-dependency entries in `package-lock.json` with direct application dependence. The target is zero direct runtime dependence by MercurionWebNg.

## Execution notes

> Current status (2026-09-11): PENDING. The planner identified the prior
> dependency skip as stale after direct owner re-enablement of its prerequisite
> chain; historical skip evidence below is retained only for traceability.

### Feature branch
`feature/UI-027`

### Preflight
Certified base `885fcd7be7744c8dd905f7366f6a1ddf2070d506` matched the
feature branch before edits. The required browser capability probe succeeded
with the non-navigating Chrome DevTools `list_pages` call. Tox21, Nest and
Angular were started in that order with live execution handles; Nest and
Angular completed clean startup, Tox21 remained alive, and two consecutive
post-start rounds returned HTTP 200 from `http://localhost:8888/health` and
`http://localhost:8888/`. All task-owned processes were stopped before
implementation and again before handoff.

### Preflight remediation
_None._

### Summary
Removed the global legacy Angular animation provider and unused
`NgxSpinnerModule`, removed their direct dependencies from `MercurionWebNg`,
and refreshed the lockfile. Existing CSS/native `animate.enter` and
`animate.leave` transitions remain in place with their reduced-motion rules.
Added a deterministic static policy and negative test to prevent direct legacy
animation or spinner dependency reintroduction.

### Task-specific validation performed
Passed:

- `node scripts/check-angular-legacy-animations.mjs`
- `node scripts/test-angular-legacy-animations-negative.mjs`
- `npm run typecheck --workspace mercurion_web_ng`
- `npm run lint:angular --workspace mercurion_web_ng`
- `npm run build --workspace mercurion_web_ng`
- `npm run test:accessibility --workspace mercurion_web_ng`
- `git diff --check`

The production source search found no direct `@angular/animations`,
`provideAnimations`, legacy browser-animation provider, or `ngx-spinner`
usage. The lockfile retains only an optional third-party peer declaration.

### Full pre-merge CI-parity validation
Not run locally by policy. Exact feature-SHA CI is coordinator-owned.

### Browser validation performed
Using Chrome DevTools MCP through `http://localhost:8888` after a fresh
ordinary login with the local test account:

- Protected dashboard state was reached successfully and showed the testing
  account UI.
- Search dialog opened, closed, and survived a rapid reopen/close sequence
  without orphaned dialog content.
- Settings accordion content entered and left the DOM cleanly.
- Light and dark themes rendered at desktop size; the protected dashboard
  rendered at a 390x844 mobile viewport.
- No Chrome console errors were reported.
- The MCP `emulate` surface does not expose reduced-motion emulation in this
  version; reduced-motion preservation was verified statically in the
  existing progress, skeleton, toast, and migrated transition CSS.

### Commits
`b2024a80` — Remove legacy Angular animations dependency.
`2af6f8a4` — Record UI-027 commit in execution notes.

### Merge / CI
Feature branch is ready for coordinator-owned exact feature-SHA CI. No merge
or integration was performed.

### Rollback
_Not applicable._

### Blocker / human decision required
None.


### Historical dependency-skip trace

The following stale dependency-skip metadata predates the explicit task
execution request and is retained only for traceability; it is not the current
task outcome.

Direct terminal prerequisite: 0077 (), terminal non-DONE dependency.

### Historical dependency-skip trace

Direct terminal prerequisite: `0071` (`UI-013`), `BLOCKED`; the other direct
prerequisite `0083` remains pending. This task was materialized in the new
terminal closure on 2026-09-13.
