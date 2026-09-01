# 0085 - Remove legacy Angular animations dependency

- [ ] DONE
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
