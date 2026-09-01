# 0164 - Introduce a Notebook ordered-tree domain

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the duplicated Chapter/Section/Page CRUD, move and reorder algorithms with one composition-based ordered-tree domain/repository capability plus thin level-specific adapters, while preserving Notebook ownership and GraphQL behaviour.

Source: `DATA-015` in Series `0001`.

## Context

`NotebookChapterService`, `NotebookSectionService` and `NotebookPageService` independently implement the same structural concepts: child creation using `MAX(order) + 1`, sibling listing, up/down neighbor swaps, bulk reorder and owner/parent filtering. `LabNotebookService` repeats root CRUD/query shaping but the root Notebook itself is not an ordered sibling level. The duplication has already produced parallel SQL and validation paths. Tasks `0165–0167` harden SQL binding, command validation and concurrency after this task establishes one domain seam.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/lab-notebook/services/lab-notebook.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-chapter.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-section.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/services/notebook-page.service.ts`
- Lab Notebook entities, resolvers and DTO/input models
- Unit of Work from `0152`
- canonical public-ID validation from `0149`
- ordered-tree tests introduced by this task

## In scope

- Define the ordered hierarchy explicitly: Notebook root -> Chapter siblings -> Section siblings -> Page siblings.
- Extract common structural operations into a reusable composition-based domain/repository component rather than inheritance between services.
- Represent each ordered level through a typed adapter describing entity identity, parent identity, owner identity, order field and allowed structural operations.
- Centralize common create/list/move/reorder/delete orchestration while retaining level-specific content/update rules in the owning adapter/service.
- Make all write operations accept/reuse the Unit of Work transaction context.
- Centralize parent/ownership traversal rules so Chapter/Section/Page do not independently reinvent ancestry checks.
- Consolidate repeated empty-child normalization/view shaping behind mapping/query helpers where it is structural rather than transport-specific.
- Preserve existing GraphQL operation names, arguments and returned hierarchy.

## Out of scope

- Do not invent an `order` field for the root `LabNotebook` collection; root notebook CRUD is related domain infrastructure but is not an ordered sibling level in the current model.
- Do not solve raw SQL interpolation in this task; `0165` owns parameter-safe reorder execution.
- Do not finalize complete-set/ownership validation semantics; `0166` owns atomic command validation.
- Do not finalize concurrent `MAX + 1`/swap/reorder locking or DB uniqueness; `0167` owns the concurrency invariant.
- Do not create a generic tree framework for unrelated domains.

## Decisions already made

- Reuse is achieved through typed composition/adapters, not a deep abstract base-service inheritance hierarchy.
- The ordered-tree primitive knows structural invariants; level adapters know entity-specific persistence/content details.
- Notebook, Chapter, Section and Page ownership ultimately derives from the authenticated Mercurion user and cannot be bypassed by knowing a descendant ID.
- Every structural write is transaction-context aware and can participate in one caller-owned Unit of Work.
- Current GraphQL contracts remain stable while implementation duplication is removed.

## Requirements

1. Inventory the structural methods in all four Notebook services and classify them as root-only, generic ordered-child operation, or level-specific content behaviour.
2. Define typed identities/contracts for an ordered child and its parent without using `any`/stringly-typed entity metadata.
3. Implement one ordered-tree coordinator/repository primitive for create/list/move/reorder/delete structural orchestration and inject level adapters for Chapter, Section and Page.
4. Ensure adapters can query/lock through the active `EntityManager` supplied by the Unit of Work; do not capture injected root repositories inside a transaction.
5. Define one ancestry/owner lookup contract so descendants cannot be manipulated through mismatched parent IDs.
6. Refactor Chapter/Section/Page services into thin domain-specific facades/adapters and remove duplicated neighbor/max/reorder orchestration where the new primitive owns it.
7. Keep Notebook root CRUD explicit; share only genuinely common query/mapping helpers rather than forcing root into an artificial ordered-child abstraction.
8. Add contract tests that execute the same structural behaviour suite against Chapter, Section and Page adapters, plus root Notebook-specific tests.
9. Ensure later `0165–0167` can replace ordering internals through one seam rather than editing three services again.

## Acceptance criteria

- [ ] Chapter, Section and Page structural CRUD/move/reorder orchestration has one canonical implementation.
- [ ] Level-specific adapters are typed and contain only entity/parent/content-specific behaviour.
- [ ] No abstract inheritance tree replaces the current service duplication.
- [ ] All structural writes are Unit-of-Work/manager aware.
- [ ] Owner/parent traversal is represented once and reused across ordered levels.
- [ ] Existing Notebook GraphQL behaviour remains compatible.
- [ ] A shared structural contract test suite passes for Chapter, Section and Page.

## Validation

Run ordered-tree contract/unit tests for all three ordered levels, Notebook resolver/service tests, relevant DB integration tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if Chapter, Section and Page intentionally implement incompatible structural semantics that cannot be represented as typed adapter differences without changing product behaviour, or if ownership of a descendant is ambiguous in the persisted model.

## Dependencies

- `0152-introduce-canonical-typeorm-unit-of-work.md` must be `DONE`.
- `0149-canonicalize-public-id-validation-across-nest-transports.md` should be `DONE`.

## Implementation notes

The goal is a small domain primitive with strong invariants, not an ORM abstraction layer. If a level has genuinely different content semantics, keep those in its service/adapter rather than adding switches such as `if (level === 'page')` to the common coordinator.

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
