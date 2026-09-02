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
npm run graphql:check
```

`graphql:check` exits unsuccessfully when committed generated artifacts differ
from a fresh generation. Task `0008` owns registering this drift check in the
root CI aggregate.

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

- `MY_MOLECULE_ITEMS`, `ALL_BASIC_DATA`, `CREATE_MOLECULE_ITEM`, and
  `UPDATE_MOLECULE_ITEM` spread `ChEMBLMoleculeItemDTO` /
  `CustomMoleculeItemDTO` on fields whose committed schema type is
  `MoleculeCollectionItemEntity`; those DTO object types are not possible
  implementations of that interface.
- `MY_MOLECULE_ITEMS` and `ALL_BASIC_DATA` both declare the operation name
  `MyMoleculeItems`.
- `UPDATE_MOLECULE_ITEM_LABEL`, `UPDATE_MOLECULE_ITEM_NAME`,
  `UPDATE_MOLECULE_ITEM_SMILES`, and `UPDATE_MOLECULE_ITEM_NOTES` all declare
  the operation name `UpdateMoleculeItemLabel`.

Task `0003` owns resolving the invalid/duplicate operation set. Until then the
file remains handwritten and its service types are outside this task's
migration boundary.

### `molecule-collection.service.ts`

`MyMoleculeCollections`, `MoleculeCollection`, `CreateMoleculeCollection`, and
`UpdateMoleculeCollection` interpolate a runtime field string into a `gql`
template. Static document plucking cannot parse those dynamic selection sets.
`DeleteMoleculeCollection` is static but shares the same mixed source file.
Task `0007` owns centralizing/normalizing this dynamic document set.

### `notebook.service.ts`

- the section and page header queries reuse the operation name
  `GetChapterById`;
- `DeleteLabNotebook`, `DeleteChapter`, and `DeleteSection` declare `String!`
  variables where the committed schema requires `ID!`;
- all notebook operations are inline in the service.

Task `0003` owns the invalid operation corrections and task `0007` owns
document centralization. The existing notebook fragment file is already
generated so reusable fragment result types are available without changing
those operation semantics here.
