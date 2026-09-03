# Angular GraphQL document catalog and code generation

GraphQL Code Generator reads the committed Nest schema at
`../MercurionWebNode/src/schema.graphql` and every static document under the
canonical Angular catalog:

```text
src/app/graphql/documents/**/*.graphql
```

The catalog is the only supported location for Angular operations and
fragments. Runtime data remains in GraphQL variables; TypeScript must not
construct executable documents or interpolate selection fields.

Code generation writes:

- `src/app/generated/schema.ts` for reusable schema/input/scalar types;
- `src/app/generated/graphql.ts` for operation variables/results, fragment
  types, and typed document nodes.

Both generated files carry a generated-file header and must not be edited
manually.

## Commands

Run from `MercurionWebNg`:

```text
npm run graphql:generate
npm run graphql:catalog-policy
npm run graphql:validate
npm run graphql:check
```

`graphql:catalog-policy` scans Angular source and fails when a `.graphql` or
`.gql` file exists outside the catalog or executable `gql` is defined in
TypeScript. The committed negative probe proves that an inline executable
document is rejected.

`graphql:validate` loads the whole catalog without executing application code,
validates the combined document set against the committed Nest schema, rejects
anonymous operations, and enforces globally unique operation names. Its
negative probes prove rejection of an invalid field and a duplicate real
operation name.

`graphql:check` runs the catalog policy and its negative proof, schema and
uniqueness validation and their negative proofs, then GraphQL Code Generator's
generated-artifact drift check. Task `0008` owns registering this aggregate in
the root CI gate.

The former finite molecule-collection field builder is represented by paired
static typed operations: the original minimal operations and explicit
`WithItems` variants. This preserves both supported response shapes without
runtime document assembly.

The scalar mappings are:

- `ID` -> `string`;
- `JSON` -> the existing Angular `JsonValue` type.
