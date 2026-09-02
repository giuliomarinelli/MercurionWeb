# Angular GraphQL code generation

GraphQL Code Generator reads the committed Nest schema at
`../MercurionWebNode/src/schema.graphql` and the explicit Angular document
allowlist in `codegen.yml`. It writes:

- `src/app/generated/schema.ts` for reusable schema/input/scalar types;
- `src/app/generated/graphql.ts` for accepted operation variables/results,
  fragment types, and typed document nodes.

Both generated files carry a generated-file header and must not be edited
manually.

## Commands

Run from `MercurionWebNg`:

```text
npm run graphql:generate
npm run graphql:validate
npm run graphql:check
```

`graphql:validate` recursively inventories every `gql` template and standalone
GraphQL document under `src`, then validates each document against the
committed Nest schema. It fails closed on an unsupported template
interpolation.

The four runtime field-selection templates in
`molecule-collection.service.ts` are materialized in both supported forms:

- `MyMoleculeCollections` with and without `items`;
- `MoleculeCollection` with and without `items`;
- `CreateMoleculeCollection` with and without `items`;
- `UpdateMoleculeCollection` with and without `items`.

`graphql:validate:negative` proves the validator rejects the committed
intentional-invalid fixture. `graphql:check` runs full document validation,
the negative probe, and the generated-artifact drift check. Task `0008` owns
registering this aggregate in the root CI gate.

The scalar mappings are:

- `ID` -> `string`;
- `JSON` -> the existing Angular `JsonValue` type.

## Incremental document coverage

The allowlist currently accepts every document in these sources:

- `src/app/services/graphql/graphql-operations/help.gql-operations.ts`;
- `src/app/services/graphql/graphql-operations/molecule-collection.gql-operations.ts`;
- `src/app/services/graphql/graphql-operations/molecule.gql-queries.ts`;
- `src/app/services/graphql/molecule-collection-join.service.ts`;
- `src/app/services/graphql/molecule-search.service.ts`;
- `src/app/Models/graphql/notebook/fragments.graphql`.

The following exact files are temporarily excluded rather than hiding a broad
source directory:

### `graphql-operations/molecule-collection-item.gql-operations.ts`

- `MY_MOLECULE_ITEMS` and `ALL_BASIC_DATA` both declare the operation name
  `MyMoleculeItems`.
- `UPDATE_MOLECULE_ITEM_LABEL`, `UPDATE_MOLECULE_ITEM_NAME`,
  `UPDATE_MOLECULE_ITEM_SMILES`, and `UPDATE_MOLECULE_ITEM_NOTES` all declare
  the operation name `UpdateMoleculeItemLabel`.

Every document in the file is schema-valid and covered by
`graphql:validate`. Task `0006` owns the remaining operation-name uniqueness
cleanup needed before the whole file can join the combined Code Generator
document set.

### `molecule-collection.service.ts`

`MyMoleculeCollections`, `MoleculeCollection`, `CreateMoleculeCollection`, and
`UpdateMoleculeCollection` interpolate a runtime field string into a `gql`
template. Static Code Generator document plucking cannot parse those dynamic
selection sets. The full validator covers both deterministic expansions of
all four templates. `DeleteMoleculeCollection` is static but shares the same
mixed source file. Task `0007` owns centralizing/normalizing this document set.

### `notebook.service.ts`

- the chapter, section and page header queries reuse the operation name
  `GetChapterById`;
- all notebook operations are inline in the service.

Every notebook operation is schema-valid and covered by `graphql:validate`.
Task `0006` owns operation-name uniqueness and task `0007` owns document
centralization. The existing notebook fragment file is already generated so
reusable fragment result types remain available.
