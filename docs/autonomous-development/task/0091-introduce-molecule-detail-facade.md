# 0091 - Introduce a cancellable molecule-detail facade

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Move molecule-detail fetching, type discrimination, derived view-model composition and command orchestration out of `MoleculeDetailPageComponent` into a cancellable facade so detail sections render ready-to-use view models and do not orchestrate services.

Source: `NG-005` in Series `0001`.

## Context

`molecule-detail.page.component.ts` currently imports and coordinates multiple GraphQL/services, type guards, history/action contexts, AI/embedding logic, collection services and many child sections. The template branches repeatedly on system/ChEMBL/custom molecule shapes. The Series specifically identifies a large `fetchData` orchestration hotspot. Later tasks `NG-023/NG-024` own Apollo cache/fetch policy; this task must improve ownership without pre-empting those cache-policy decisions.

## Relevant files and modules

- `MercurionWebNg/src/app/pages/molecule-detail/molecule-detail.page.component.ts`
- molecule detail models/type guards
- `MercurionWebNg/src/app/services/graphql/molecule.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- molecule collection/history/action services used by the page
- molecule-detail child components

## In scope

- Introduce a feature-local molecule-detail facade with a discriminated, immutable view model.
- Move route-id driven fetch orchestration and cancellation into the facade.
- Move repeated system/ChEMBL/custom shape normalization into mappers/selectors.
- Expose derived section data and commands through narrow typed APIs.
- Keep section components presentational or feature-local, receiving data rather than orchestrating shared services.
- Add tests for route changes, cancellation/latest-wins behavior, each molecule variant and error/empty states.

## Out of scope

- Do not redesign Apollo entity/type policies; tasks `NG-023`/`NG-024` own that.
- Do not change backend molecule contracts.
- Do not rewrite Ketcher/RDKit vendor boundaries; task `0104` owns that.
- Do not change product-visible molecule-detail content except as required to preserve existing behavior through the new view model.

## Decisions already made

- Molecule variants remain represented by a discriminated application model; templates should not repeatedly reconstruct transport-shape discrimination.
- Route changes must cancel/obsolete stale detail work.
- The page is a composition shell; fetch/mapping/action orchestration belongs to the facade.

## Requirements

1. Normalize the supported molecule variants into a stable detail view-model contract.
2. Make route parameter changes latest-wins and prevent stale results from replacing newer navigation state.
3. Represent loading/error/content states explicitly.
4. Keep user-triggered commands (delete, save/update, bind collections, history, etc.) behind typed facade methods.
5. Ensure child sections receive only the data/commands they need.
6. Preserve title/breadcrumb behavior and existing action-entry points.

## Acceptance criteria

- [ ] `MoleculeDetailPageComponent` contains no multi-service fetch orchestration.
- [ ] Repeated variant-specific shape extraction is centralized in typed mapping/selectors.
- [ ] Fast route changes cannot render stale molecule data.
- [ ] Child sections do not independently refetch the same detail data.
- [ ] Existing detail behavior for all supported molecule kinds remains compatible.

## Validation

Run focused facade/page/mapper tests and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, open representative system, ChEMBL and custom molecule detail routes available locally; navigate rapidly between molecules; exercise edit/delete/bind actions where permitted; verify loading/error/content transitions, title/breadcrumb updates, network cancellation/no duplicate fetches and no relevant console errors.

## Stop conditions

Mark `BLOCKED` if a molecule variant's authoritative mapping/identity semantics cannot be inferred safely from existing contracts.

## Dependencies

- Prior FE/UI state and component normalization tasks must be integrated.

## Execution notes

### Feature branch
`feature/NG-005` from base `9e0705161ee23b6b22335491121da36483efab90`.

### Preflight
- Exact base Actions run `34598046869` succeeded on Ubuntu, Windows, and
  `Required gate`.
- Tox21, Nest, and Angular started in order with two complete readiness rounds
  returning HTTP 200 for `/health` and `/`; all were stopped afterward.
- Authenticated protected dashboard state was confirmed through the dedicated
  non-production profile.

### Preflight remediation
_None._

### Summary
Introduced `MoleculeDetailFacade` with route-driven latest-wins loading,
variant normalization, explicit loading/error state, title composition, and
typed detail commands.

The task is `BLOCKED`: post-implementation navigation to a representative
ChEMBL detail route and the following browser snapshot timed out while the
runtime remained healthy, so required system/ChEMBL/custom route and
rapid-navigation evidence cannot be claimed.

### Task-specific validation performed
- Angular typecheck passed.
- Focused Angular tests compiled and began, then ChromeHeadless disconnected
  at 75/382; the watcher was stopped.
- Nest compilation and Angular development build passed.
- No local `npm ci` or `npm run ci:check` was run.

### Full pre-merge CI-parity validation
Not applicable; the task was blocked before merge.

### Browser validation performed
Preflight protected dashboard evidence passed. Required post-change detail
route validation timed out at
`http://localhost:8888/molecules/detail/01a0903f-2cea-7000-b7cb-a3138940194a`.

### Commits
Partial implementation and diagnostic are preserved on `feature/NG-005`.

### Merge / CI
No merge. The feature branch remains preserved and frozen for review.

### Rollback
_Not applicable._

### Blocker / human decision required
Diagnose and authorize a retry of the post-implementation browser validation;
the observed blocker was the detail-route navigation and subsequent snapshot
timeout despite healthy canonical runtime processes.
