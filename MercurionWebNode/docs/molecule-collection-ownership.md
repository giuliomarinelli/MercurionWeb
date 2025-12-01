# Molecule Collection Module – Ownership Enforcement Audit

## Scope
Comprehensive pass over every query builder / repository call inside `src/app_modules/molecule-collection/**` to confirm that every GraphQL endpoint only exposes rows that belong to the authenticated user. The focus is on multi‑tenant isolation (per‑user data) before the first public release.

## Guarding Patterns Observed
- **Service layer filtering:** almost every query enforces `WHERE <entity>.user_id = :userId` before TypeORM joins are added (e.g. `MoleculeCollectionItemService.findOne`, `MoleculeCollectionService.findOne`).
- **Join/service helpers:** `MoleculeCollectionItemJoinService` now guards every write path with `assertCollectionOwnership` / `assertItemOwnership`, ensuring cross‑user joins cannot be created accidentally (`src/app_modules/molecule-collection/services/molecule-collection-item-join.service.ts:45:337`).
- **Resolvers enforce auth decorators:** every GraphQL mutation/query is decorated with `@AuthenticatedUserId()` (unless explicitly meant to be public in other modules) and relies on the service layer filters.
- **History + touch tracking:** writes go through helper methods that first `exists(... { userId, id })`, which doubles as an ownership guard.

## Detailed Review

### MoleculeCollectionItemService (`src/app_modules/molecule-collection/services/molecule-collection-item.service.ts`)
| Method | Ownership Enforcement | Notes |
| --- | --- | --- |
| `findOne` (lines 95‑165) | `item.user_id = :userId` + join filters `j.user_id = :userId`, `c.user_id = :userId`, and relation count scoped to user. | Prevents leakage in `moleculeItem` GraphQL query. |
| `findOneDTO` (167‑191) | Delegates to `findOne`; no extra queries. | Safe. |
| `findAllByUser` (193‑200) | Base `where item.user_id = :userId`; subsequent joins come from the entity tree. | Safe assuming join service prevents foreign joins (now true). |
| `paginateAllByUser` (246‑312) | `item.userId = :userId`, optional `LEFT JOIN item.joins` constrained by `(join.collectionId = :collectionId AND join.userId = :userId)`. | Ownership respected even when excluding joins. |
| `paginateByCollection` (315‑383) | Adds explicit `where item.userId = :userId` before joining `item.joins`. | Ensures another user’s collection ID cannot be used to steal items. |
| `update/delete` | Both methods filter by `{ id, userId }`. | Safe. |

### MoleculeCollectionItemJoinService (`src/app_modules/molecule-collection/services/molecule-collection-item-join.service.ts`)
| Method | Ownership Enforcement | Notes |
| --- | --- | --- |
| `addMoleculeToCollectionWithManager` (45‑60) | Calls `assertCollectionOwnership` + `assertItemOwnership`, so you can’t attach someone else’s entities. | Prevents historical leak discovered in bug report. |
| `removeMoleculeFromCollectionWithManager` (72‑101) | `where: { collectionId, itemId, userId }` plus delete and optional cascade delete requiring the same `userId`. | Safe. |
| `addManyMoleculesToCollectionWithManager` (117‑183) | Guards collection ownership, filters candidate item IDs to owned ones, and `SELECT`s only from user rows. | Handles both “select some” and “select all” cases. |
| `bindManyCollectionsToMoleculeWithManager` (185‑335) | Validates either: (a) ChEMBL molregno (creating user‑scoped item) or (b) user already owns the item ID. Candidate collection IDs are filtered to owned records before insert. | Avoids binding other people’s collections during “bind all” actions. |

### MoleculeCollectionService (`src/app_modules/molecule-collection/services/molecule-collection.service.ts`)
| Method | Ownership Enforcement | Notes |
| --- | --- | --- |
| `findOne` / `findAllByUser` / `searchByName` | Every query includes `.where('collection.user_id = :userId')`. | Safe. |
| `update` | Uses `{ id, userId }` before writing (`line 266`). | Prevents editing foreign rows. |
| `paginateAllByUser` | `collection.userId = :userId` even before the dynamic filtering/exclusion logic. | Safe. |
| `markAsTouchedWithManager` | Short‑circuits if `exists(... { userId, id })` is false. | Safe. |

### CustomMoleculeItemService (`src/app_modules/molecule-collection/services/custom-molecule-item.service.ts`)
| Method | Ownership Enforcement | Notes |
| --- | --- | --- |
| `addToCollection` | Finds/creates item scoped to `userId`, then verifies the provided collection also has the same `userId` before calling the join service (which re‑verifies). | Safe. |
| `removeFromCollection` | Delegates to join service (already scoped). | Safe. |

### ChEMBLMoleculeItemService (`src/app_modules/molecule-collection/services/chembl-molecule-item.service.ts`)
| Method | Ownership Enforcement | Notes |
| --- | --- | --- |
| `getChemblMolregnosByUserId` / `hasUserChEMBLMolecule...` / `findOneById` / `findByCollection` | All filter by `userId`. | Safe. |
| `getChemblMolregnosByCollectionId` | Reads join rows filtered by `userId`. | Safe. |
| `addToCollection` / `addManyChemblItemsToCollection` | Items & collections filtered by the caller’s `userId`. | Safe. |
| `existsChEMBLMoleculeByUUIDThenGetMolregno` (75‑85) | **Now authenticated**: service filters by `{ id, userId }`, so only the owner can resolve their UUID to a molregno. |

### Resolvers
- `MoleculeCollectionItemResolver` / `MoleculeCollectionResolver` / `CustomMolecule` and `ChEMBL` resolvers all inject `@AuthenticatedUserId` (public routes live elsewhere, e.g., OAuth). Ownership is therefore enforced by passing the user ID into the services that already filter, including the newly-secured molregno lookup.
- `MoleculeCollectionResolver.itemsCount` now counts join rows with both `collectionId` **and** `userId`, so even if a collection ID is leaked it cannot be used to infer global totals.

### Utility Helpers
- `TypeOrmUtils.addJoins` blindly left‑joins requested GraphQL relations without user filters. This is acceptable only because every base query already filters by user and the new join service prevents cross‑user joins; however, when we add new relations we must ensure they cannot reference multi‑tenant tables unless additional `ON ... user_id = :userId` clauses are added manually (as done in `MoleculeCollectionItemService.findOne`). **Action:** document this requirement for future contributors.

## Known Gaps / Recommended Fixes
1. **Dynamic joins need manual scoping:** whenever `TypeOrmUtils.addJoins` is used (e.g. `MoleculeCollectionService.findAllByUser`, `MoleculeCollectionItemService.findAllByUser`), new relations must either be limited to user‑owned child rows or joined via explicit query builder code similar to the custom logic in `findOne`. Document this as part of code review checklist.

## Next Steps Checklist
- [ ] Document the “always add user filters on joins” guideline (code review checklist / contributor docs).
