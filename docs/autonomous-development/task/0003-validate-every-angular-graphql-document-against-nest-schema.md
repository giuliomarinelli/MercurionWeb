# 0003 - Validate every Angular GraphQL document against Nest schema

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every Angular GraphQL operation validate successfully against the Nest schema, including both concrete expansions of the four dynamic field-selection templates identified by the audit.

Source: `SYS-003` in Series `0001`.

## Context

The audit found seven invalid Angular GraphQL documents relative to `MercurionWebNode/src/schema.graphql`. Angular operations are split between central operation files and inline/template-generated `gql` documents. The validation must cover static documents and all deterministic variants of the dynamic templates rather than silently ignoring template-generated queries.

## Relevant files and modules

- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNg/src/app/services/graphql/`
- `MercurionWebNg/src/app/services/graphql/graphql-operations/`
- `MercurionWebNg/src/app/services/graphql/molecule-collection.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- GraphQL Code Generator/config introduced by `0002`, when available

## In scope

- Inventory every Angular GraphQL query/mutation/subscription source.
- Materialize/validate deterministic variants of dynamic documents for validation purposes.
- Correct schema/document mismatches without changing intended product behaviour.
- Add an automated validation command/test that fails on future invalid documents.

## Out of scope

- Broad document-location refactoring; task `0007` owns the final static catalog.
- Unrelated resolver redesign.
- Renaming duplicate operation names except where strictly necessary to make validation unambiguous; task `0006` owns global uniqueness.

## Decisions already made

- `MercurionWebNode/src/schema.graphql` is the schema to validate against.
- Dynamic templates must be validated in every supported expansion, not excluded from checks.
- Validation failures must be fixed at the contract/document level, not suppressed.

## Requirements

1. Enumerate all `gql` operations consumed by Angular.
2. Identify the seven baseline-invalid documents and reproduce each failure.
3. Identify the four dynamic templates and enumerate both supported expansions for each.
4. Correct field selections, argument types, fragment type conditions and variable scalar types so every resulting document is schema-valid.
5. Preserve operation semantics and expected client result shapes.
6. Add automated schema validation covering all static documents and all dynamic expansions.
7. Integrate validation with the GraphQL generation/check workflow when practical.

## Acceptance criteria

- [ ] Zero Angular GraphQL documents fail validation against the Nest schema.
- [ ] Both expansions of every audited dynamic template are validated automatically.
- [ ] The validation command fails when intentionally given an invalid field/type/variable fixture.
- [ ] Angular build succeeds after corrected operations/types are regenerated as needed.
- [ ] Relevant Nest GraphQL tests remain green.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg`, run the GraphQL validation/codegen check, then:

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

Not applicable. Schema validation and automated GraphQL tests provide the required evidence.

## Stop conditions

Block if fixing a validation failure requires choosing a new product-visible GraphQL shape rather than reconciling an obvious client/server mismatch. Record the operation, incompatible alternatives and affected consumers.

## Dependencies

- `0002-generate-angular-graphql-documents-and-types.md` should be `DONE` first when its codegen configuration is available; if `0002` is blocked solely by the invalid documents, this task may proceed using a standalone validator and must leave integration notes for `0002`.

## Implementation notes

Do not reduce validation coverage to make the command green. The audit explicitly requires the dynamic document variants to remain part of the checked surface.

## Execution notes

### Summary

Implemented full Angular GraphQL source validation against the committed Nest
schema. The validator recursively discovers standalone GraphQL files and
TypeScript `gql` templates under `MercurionWebNg/src`, parses each document
independently so task `0006`'s cross-document operation-name cleanup remains
out of scope, and fails closed on unsupported template interpolation.

The inventory contains 9 GraphQL source files and 66 static documents. The
four audited templates in `molecule-collection.service.ts` are asserted by
operation name and materialized in both supported field variants, producing 8
validated dynamic expansions:

- `MyMoleculeCollections`: minimal and `withItems`;
- `MoleculeCollection`: minimal and `withItems`;
- `CreateMoleculeCollection`: minimal and `withItems`;
- `UpdateMoleculeCollection`: minimal and `withItems`.

The pre-fix validator reproduced 11 schema errors across the seven audited
invalid documents:

- `MY_MOLECULE_ITEMS`, `ALL_BASIC_DATA`, `CREATE_MOLECULE_ITEM`, and
  `UPDATE_MOLECULE_ITEM`: eight impossible DTO fragment-spread diagnostics
  against the former entity-interface return contract;
- `DeleteLabNotebook`, `DeleteChapter`, and `DeleteSection`: three `String!`
  variables used where the schema requires `ID!`.

The molecule-item list/create/update contract now returns the existing
polymorphic DTO union that those Angular consumers already expect. Nest
reloads and maps create/update results and enriches list results with batched
ChEMBL details, preserving the existing client result shape rather than
discarding requested fields. The four smaller update mutations were adjusted
to select their existing fields through DTO union fragments. Notebook delete
variables now use `ID!`.

The validator, an intentional-invalid fixture probe, and Code Generator drift
checking are composed by `npm run graphql:check`. Broad document relocation
remains with task `0007`; duplicate operation names remain with task `0006`.

Implementation commit:

- `b2b8d050` - `feat(graphql): validate every Angular document`

### Validation performed

- Task-start preflight at base
  `c845496f1cc70a8b76582a9973242f60667f7e64` on clean
  `feature/SYS-003`:
  - root `npm ci` - PASS, 1925 packages installed;
  - root `npm run ci:check` - PASS, complete unchanged CI-parity aggregate;
  - branch/SHA proof before scope:
    `feature/SYS-003` at the exact supplied base with a clean tree.
- Baseline-invalid reproduction after adding only the validator:
  - `npm run graphql:validate --workspace mercurion_web_ng` - expected FAIL,
    exit `1`;
  - inventory: 9 source files, 66 static documents, 4 dynamic templates and 8
    dynamic expansions;
  - result: exactly the seven audited invalid documents reproduced as 11
    concrete schema diagnostics.
- GraphQL validation and generation:
  - `npm run graphql:validate --workspace mercurion_web_ng` - PASS, zero
    invalid Angular documents across the complete inventory;
  - `npm run graphql:validate:negative --workspace mercurion_web_ng` - PASS,
    confirming the committed invalid-field fixture is rejected;
  - direct
    `node MercurionWebNg/scripts/validate-graphql-documents.mjs --extra-document scripts/fixtures/invalid-field.graphql`
    - expected FAIL, exit `1`, with
    `Cannot query field "definitelyInvalidField" on type "Query"`;
  - `npm run graphql:generate --workspace mercurion_web_ng` - PASS;
  - `npm run graphql:check --workspace mercurion_web_ng` - PASS, including
    full validation, negative probe and generated-artifact drift check;
  - an in-memory GraphQL execution probe confirmed `graphql-fields` merges
    both DTO union fragment selections into the field map used by the Nest
    loader.
- Angular:
  - `npm run typecheck --workspace mercurion_web_ng` - PASS;
  - from `MercurionWebNg`, `npm run build` - PASS; existing bundle budget and
    CommonJS warnings only;
  - from `MercurionWebNg`, `npm test -- -- --watch=false` executed all 157
    tests successfully, but the owned process did not terminate after
    `TOTAL: 157 SUCCESS` and was stopped;
  - from `MercurionWebNg`, `npm run test:ci` - PASS with clean exit, 157 tests.
- Nest:
  - `npm run typecheck --workspace mercurion_web_node` - PASS;
  - focused molecule-item service spec - PASS, 4 tests, including polymorphic
    DTO enrichment coverage;
  - from `MercurionWebNode`, `npm run build` - PASS;
  - from `MercurionWebNode`, `npm test -- -- --runInBand` - PASS, 116 suites
    and 155 tests.
- Pre-integration CI parity after implementation commit `b2b8d050`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, including autonomous recipe validation,
    contracts, Angular/Nest lint and typechecks, all Angular tests, all Nest
    unit/E2E tests, and both builds.
- `git diff --check` - PASS.

### Browser validation performed

Not applicable per the recipe. The acceptance criteria are covered by schema
validation, generated-artifact checks, builds and automated tests.

### Changed files

- Added
  `MercurionWebNg/scripts/validate-graphql-documents.mjs`,
  `scripts/test-graphql-validator-negative.mjs`, and
  `scripts/fixtures/invalid-field.graphql`.
- Updated Angular GraphQL scripts/documentation in
  `MercurionWebNg/package.json` and `GRAPHQL_CODEGEN.md`.
- Corrected notebook delete variable scalar types and molecule-item union
  selections in Angular documents.
- Updated the Nest molecule-item resolver/service contract, enrichment test,
  and committed schema.
- Regenerated `MercurionWebNg/src/app/generated/schema.ts`.

### Blocker / human decision required

None.
