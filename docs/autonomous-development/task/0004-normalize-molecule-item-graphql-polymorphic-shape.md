# 0004 - Normalize molecule-item GraphQL polymorphic shape

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

- Identified the four audited operations as `MyMoleculeItems`,
  `MoleculeItemBasicData` (formerly the second `MyMoleculeItems` document),
  `CreateMoleculeItem`, and `UpdateMoleculeItem`.
- Kept the existing entity interface for persistence/legacy entity fields and
  made the existing `MoleculeCollectionItemUnion` the coherent public return
  shape for molecule-item queries, pagination, create, and update operations.
- Centralized union runtime discrimination in
  `resolveMoleculeCollectionItemType`, aligned the DTO TypeScript
  discriminants with `custom`/`chembl`, made the custom canonical SMILES field
  non-null to match persistence, and made update nullability agree across the
  resolver, schema, generated types, and client handling.
- Consolidated all polymorphic Angular molecule-item documents around the
  reusable `MoleculeItemFields` fragment. Generated typed document nodes now
  drive the service, and the handwritten response union plus molecule-variant
  casts were removed.
- Preserved both runtime variants and existing client view models while
  filtering nullable joins at the transport boundary.
- Implementation commit:
  `8d7d579a` (`feat(graphql): normalize molecule item polymorphism`).

### Validation performed

- Unchanged task-start preflight at
  `a2e465081d114e49f92aebd9e4a3010b9d23037b`:
  - `npm ci` — passed; 1,925 packages installed, 0 vulnerabilities.
  - `npm run ci:check` — passed with exit status 0.
  - `git status --short` remained empty and `HEAD` remained the supplied base.
- GraphQL/code generation:
  - `npm run graphql:generate --workspace mercurion_web_ng` — passed and
    regenerated `schema.ts` / `graphql.ts`.
  - `npm run graphql:check --workspace mercurion_web_ng` — passed; all 55
    static documents and all 8 supported dynamic expansions validated against
    the committed Nest schema, the negative fixture was rejected, and the
    generated-artifact drift check was clean.
- Focused variant coverage:
  - Angular direct Karma command for
    `molecule-collection-item.service.spec.ts` — 5/5 tests passed in Chrome
    Headless, covering custom and ChEMBL mapping, generated `__typename`
    narrowing, basic-data normalization, and the four audited documents.
  - Nest direct Jest command for the molecule collection item resolver/service
    specs — 2 suites, 8 tests passed. The resolver spec executes both variants
    through the committed schema and verifies union discrimination plus update
    nullability.
- Angular:
  - `npm run typecheck --workspace mercurion_web_ng` — passed.
  - `npm run lint --workspace mercurion_web_ng` — passed with baseline
    warnings only and zero errors.
  - `npm run build --workspace mercurion_web_ng` — passed; only the existing
    bundle/CommonJS warnings were reported.
  - `npm run test:ci --workspace mercurion_web_ng` — full suite passed with
    exit status 0.
- Nest:
  - `npm run typecheck --workspace mercurion_web_node` — passed.
  - `npm run lint --workspace mercurion_web_node` — passed with 61 baseline
    warnings and zero errors.
  - `npm run build --workspace mercurion_web_node` — passed.
  - Direct `jest --runInBand` from `MercurionWebNode` — 117 suites and 159
    tests passed.
- Final clean-tree CI parity:
  - `npm ci` — passed.
  - `npm run ci:check` — passed.

### Browser validation performed

Not applicable. The change is schema/document/generated-type plumbing and
transport mapping; it does not change molecule-card templates, rendering
branches, interaction behavior, or other browser-observable UI logic.

### Changed files

- Backend DTO/union/resolver/service/schema files under
  `MercurionWebNode/src/app_modules/molecule-collection/` and
  `MercurionWebNode/src/schema.graphql`.
- New focused backend resolver/schema test:
  `molecule-collection-item.resolver.spec.ts`.
- Angular polymorphic operation catalog, codegen allowlist/documentation,
  generated artifacts, molecule client types/service, and focused service
  tests.

### Blocker / human decision required

None. No third runtime molecule-item shape was found; the existing service
rejects unknown discriminants explicitly.
