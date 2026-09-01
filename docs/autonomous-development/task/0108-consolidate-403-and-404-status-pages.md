# 0108 - Consolidate 403 and 404 into one status-page component

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace the duplicated 403/404 landing components with one accessible presentational status-page component configured by route/status metadata.

Source: `NG-022` in Series `0001`.

## Context

`Forbidden403LandingPageComponent` and `NotFound404LandingPageComponent` duplicate the same full-screen layout, home/back navigation logic, authenticated-home resolution and almost all styles/markup. Earlier UI/route tasks establish canonical buttons, typed route metadata and thinner app-state ownership; this task removes the parallel page implementations.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/forbidden-403-landing/`
- `MercurionWebNg/src/app/pages/not-found-404-landing/`
- `MercurionWebNg/src/app/app.routes.ts` / typed route manifest from `FE-035`
- canonical Button primitive
- auth selector/store used to choose Home vs Dashboard

## In scope

- Create one stateless/presentational status-page component taking typed status, heading, description and CTA configuration.
- Configure 403 and 404 through route data/wrappers without duplicating the visual implementation.
- Centralize back/home behavior in one thin route-aware host/facade if navigation commands cannot remain purely declarative.
- Use the canonical button/link primitives and typed route generation.
- Preserve distinct 403 vs 404 copy/semantics and accessibility.
- Remove the obsolete duplicated page components and specs.

## Out of scope

- Do not merge 403 and 404 into the same semantic status or URL.
- Do not use `AppContextService` as a generic navigation side-effect bucket if earlier tasks have removed that ownership.
- Do not redesign the error-page appearance beyond canonical UI migration.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Status pages are configuration of one UI component, not separate implementations.
- The wildcard route still resolves to the 404 state; forbidden flows still resolve to 403.
- Authenticated users may receive a Dashboard CTA and anonymous users a Home CTA through the canonical auth selector.
- Back navigation is optional/defensive and must not create a loop.

## Requirements

1. Define a typed status-page configuration model supporting at least 403 and 404.
2. Render status code, heading, description, back action and primary CTA from that model.
3. Use the route manifest for destination paths rather than hard-coded duplicates.
4. Preserve accessible heading association, status semantics, focus and keyboard behavior.
5. Remove the duplicate source/spec files after all routes/consumers migrate.
6. Add focused tests proving each status renders its own copy and CTA destination.

## Acceptance criteria

- [ ] One production status-page implementation renders both 403 and 404.
- [ ] 403 and 404 keep distinct URLs, titles, copy and semantics.
- [ ] No duplicate home/back logic remains in separate status components.
- [ ] Canonical button/link and route APIs are used.
- [ ] Keyboard/focus/accessibility behavior remains correct.

## Validation

Run status-page/router focused tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open explicit 403 and an unknown URL as both anonymous/authenticated state where practical. Verify copy, back behavior, Home/Dashboard CTA, route/title, focus and responsive appearance.

## Stop conditions

Mark `BLOCKED` if earlier routing/auth refactors leave unresolved intended behavior for the primary CTA or back navigation.

## Dependencies

- `FE-035` typed route manifest should be `DONE`.
- Canonical UI button/link primitives from the UI section must be used.

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
