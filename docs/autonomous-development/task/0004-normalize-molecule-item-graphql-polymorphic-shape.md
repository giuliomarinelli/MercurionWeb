# 0004 - Normalize molecule-item GraphQL polymorphic shape

- [ ] DONE
- [ ] BLOCKED

## Objective

Expose a coherent discriminated GraphQL shape for molecule collection items and update the four audited Angular operations so their fragments are valid for the actual schema types.

Source: `SYS-004` in Series `0001`.

## Context

The backend exposes `MoleculeCollectionItemEntity` as an interface/entity hierarchy and separately defines `MoleculeCollectionItemUnion = CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO`. Angular already models `MoleculeItemDTO` as a `__typename` discriminated union, while audited operations apply DTO fragments in contexts whose declared GraphQL type is `MoleculeCollectionItemEntity`.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/molecule-collection/Models/entities/molecule-collection-item.entity.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/Models/DTO/molecule-collection-item.union.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/Models/DTO/custom-molecule-item.dto.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/Models/DTO/chembl-molecule-item.dto.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/resolvers/molecule-collection-item.resolver.ts`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNg/src/app/services/graphql/graphql-operations/molecule-collection-item.gql-operations.ts`
- `MercurionWebNg/src/app/Models/graphql/molecule-collection/molecule-collection.types.ts`

## In scope

- Reconcile backend resolver return types/schema polymorphism with concrete DTO shapes.
- Ensure Angular operations select concrete fields through valid fragments/type conditions.
- Preserve a discriminant usable by generated/client TypeScript types.
- Add tests covering both custom and ChEMBL item variants.

## Out of scope

- Redesigning molecule collection persistence inheritance.
- Unrelated molecule search or collection behaviour.
- UI redesign.

## Decisions already made

- Client-visible polymorphism must be explicit and discriminated.
- Both custom and ChEMBL molecule-item variants remain supported.
- GraphQL documents must validate against the generated Nest schema.

## Requirements

1. Identify the four audited operations with invalid DTO fragments on `MoleculeCollectionItemEntity` contexts.
2. Choose the smallest schema-consistent representation using the existing interface/union/DTO model rather than creating another parallel hierarchy.
3. Ensure resolver metadata and actual returned values agree with the schema type.
4. Update Angular fragments/operations to use valid concrete type conditions and `__typename` where needed.
5. Regenerate generated GraphQL types from `0002` when applicable.
6. Add resolver/document tests proving both molecule-item variants serialize and discriminate correctly.

## Acceptance criteria

- [ ] The four audited molecule-item operations validate against `schema.graphql`.
- [ ] Both `CustomMoleculeItemDTO` and `ChEMBLMoleculeItemDTO` are represented without unsafe client casts.
- [ ] Generated/client types narrow correctly using the GraphQL discriminant.
- [ ] Relevant backend and Angular tests cover both variants.
- [ ] GraphQL validation/codegen checks pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

Run the GraphQL validation/codegen checks from `MercurionWebNg`, then:

```text
npm run build
npm test -- --watch=false
```

From `MercurionWebNode`:

```text
npm run build
npm test -- --runInBand
```

## Browser validation

Not applicable unless the implementation changes browser-observable molecule-card rendering beyond type plumbing. If it does, use `http://localhost:8888` to verify at least one custom and one ChEMBL item render without console/GraphQL errors.

## Stop conditions

Block if the existing backend can legitimately return a third runtime shape not represented by the Series or schema and choosing its public GraphQL representation requires a product/API decision.

## Dependencies

- `0003-validate-every-angular-graphql-document-against-nest-schema.md` should be `DONE` first.

## Implementation notes

Prefer aligning the current union/interface model over introducing adapter DTOs that recreate the same shape under new names.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable / not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
