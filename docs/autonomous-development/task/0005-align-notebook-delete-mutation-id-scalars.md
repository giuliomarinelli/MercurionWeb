# 0005 - Align Notebook delete mutation ID scalars

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Change the three Angular Notebook delete mutations to declare `ID!` variables exactly as required by the Nest GraphQL schema and add regression coverage for their execution.

Source: `SYS-005` in Series `0001`.

## Context

Nest exposes Notebook deletion arguments as GraphQL `ID!`. At the audited baseline, Angular `notebook.service.ts` declares `String!` for `DeleteLabNotebook`, `DeleteChapter` and `DeleteSection`; for example `DeleteLabNotebook($id: String!)` calls a schema field requiring `id: ID!`.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/notebook.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/resolvers/lab-notebook.resolver.ts`
- `MercurionWebNode/src/schema.graphql`
- Notebook GraphQL/codegen tests introduced by earlier tasks

## In scope

- Correct all three delete-operation variable declarations.
- Ensure generated operation variable types remain compatible with existing string UUID values in TypeScript.
- Add schema validation and execution/regression tests for the three deletes.

## Out of scope

- Notebook route reachability; task `0020` owns that product-level issue.
- Notebook data model redesign.
- Other GraphQL scalar cleanup outside these three mutations.

## Decisions already made

- The server schema is authoritative: the deletion identifier scalar is `ID!`.
- Existing UUID/string runtime values remain valid GraphQL ID inputs.

## Requirements

1. Change `DeleteLabNotebook`, `DeleteChapter` and `DeleteSection` variables from `String!` to `ID!`.
2. Regenerate client GraphQL types if codegen is active.
3. Add or update tests proving each mutation validates and sends the expected identifier.
4. Do not alter resolver deletion semantics.

## Acceptance criteria

- [ ] All three delete documents use `ID!`.
- [ ] All three validate against `MercurionWebNode/src/schema.graphql`.
- [ ] Automated tests cover operation execution/variable construction for notebook, chapter and section deletion.
- [ ] Angular build and GraphQL validation/codegen checks pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

Run the repository GraphQL validation/codegen check introduced by earlier tasks.

## Browser validation

Not applicable. Notebook UI reachability is separately unresolved and browser validation is not needed to prove the scalar correction.

## Stop conditions

Block only if the generated/current Nest schema no longer declares these arguments as `ID!`; record the current schema and resolver metadata rather than forcing the Series baseline assumption.

## Dependencies

- `0003-validate-every-angular-graphql-document-against-nest-schema.md` should be `DONE` first.

## Implementation notes

Keep this task deliberately narrow: it is a concrete schema mismatch, not a reason to refactor the whole Notebook service.

## Execution notes

### Summary

SYS-003 had already corrected the three delete variables to `ID!`. This task
preserved that contract and added the focused execution/code-generation
coverage needed to close the remaining regression gap.

`DeleteLabNotebook`, `DeleteChapter`, and `DeleteSection` now live in a narrow
static operation source accepted by GraphQL Code Generator. `NotebookService`
executes the generated typed documents without changing its public methods,
returned booleans, identifier values, or any Nest resolver/service deletion
semantics. Generated `*MutationVariables` types map each `ID!` input to
TypeScript `string`, so existing UUID strings remain compatible.

`NotebookService` tests now execute all three delete methods against a mocked
Apollo client and assert the operation name, selected mutation field, exact
`{ id }` variables, `ID!` AST declaration, returned result, and compile-time
construction of all three generated variable types from a string UUID.

Implementation commit:

- `0e678d25` - `test(graphql): cover notebook delete IDs`

### Validation performed

- Task-start preflight on clean `feature/SYS-005` at supplied base
  `70fb74979cdada61ac083827eb2f82f827578266`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, complete unchanged CI-parity aggregate.
- Server contract/semantics inspection:
  - `MercurionWebNode/src/schema.graphql` declares
    `deleteLabNotebook(id: ID!)`, `deleteChapter(id: ID!)`, and
    `deleteSection(id: ID!)`;
  - the three resolver arguments continue to use Nest `ID` metadata;
  - no Nest resolver or service file was changed.
- GraphQL/code generation:
  - from `MercurionWebNg`, `npm run graphql:generate` - PASS;
  - from `MercurionWebNg`, `npm run graphql:check` - PASS;
  - inventory validated 11 source files, 55 static documents, 4 dynamic
    templates and 8 dynamic expansions against the committed Nest schema;
  - the generated delete variable types are each `{ id: string }`, and the
    generated typed documents retain non-null `ID` variable definitions.
- Focused notebook regression:
  - from `MercurionWebNg`,
    `npm test -- -- --watch=false --include='src/app/services/graphql/notebook.service.spec.ts'`
    - PASS, 5 tests;
  - notebook, chapter, and section deletion each exercised the Apollo
    mutation path and exact UUID variable construction.
- Angular:
  - `npm run lint --workspace mercurion_web_ng` - PASS with existing warnings
    only;
  - from `MercurionWebNg`, `npm run build` - PASS with existing bundle-budget
    and CommonJS warnings only;
  - from `MercurionWebNg`, `npm run test:ci` - PASS with clean exit.
- Final pre-integration CI parity after implementation commit `0e678d25`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, including autonomous recipe validation,
    contracts, Angular/Nest lint and typechecks, all Angular tests, all Nest
    unit/E2E tests, and both builds.
- `git diff --check` - PASS.

### Browser validation performed

Not applicable per the recipe. The scalar, generated type, variable
construction, and execution requirements are fully covered by schema
validation, code generation, and automated tests.

### Changed files

- Added
  `MercurionWebNg/src/app/services/graphql/graphql-operations/notebook-delete.gql-operations.ts`.
- Updated `MercurionWebNg/codegen.yml` and `GRAPHQL_CODEGEN.md` to admit and
  document the three static delete operations.
- Regenerated `MercurionWebNg/src/app/generated/graphql.ts`.
- Updated `MercurionWebNg/src/app/services/graphql/notebook.service.ts` to use
  the generated typed documents and variable/result types.
- Expanded
  `MercurionWebNg/src/app/services/graphql/notebook.service.spec.ts` with
  focused notebook/chapter/section delete regressions.
- Updated this recipe with the provisional `DONE` status and execution
  evidence.

### Blocker / human decision required

None.
