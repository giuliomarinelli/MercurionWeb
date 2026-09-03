# 0006 - Enforce unique GraphQL operation names

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make every Angular GraphQL operation name globally unique and semantically representative of the operation it performs.

Source: `SYS-006` in Series `0001`.

## Context

The audit identified duplicate operation names including `GetChapterById`, `MyMoleculeItems`, `UpdateMoleculeCollection`, and `UpdateMoleculeItemLabel`. One concrete example is `UPDATE_MOLECULE_ITEM_LABEL` and `UPDATE_MOLECULE_ITEM_NAME` both declaring `mutation UpdateMoleculeItemLabel`; another is an inline `UpdateMoleculeCollection` mutation coexisting with a centrally defined operation of the same name.

Operation-name uniqueness matters for diagnostics, persisted-operation tooling, tracing, schema validation and generated client types.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/`
- `MercurionWebNg/src/app/services/graphql/notebook.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- `MercurionWebNg/src/app/services/graphql/graphql-operations/`
- GraphQL validation/codegen configuration introduced by earlier tasks

## In scope

- Inventory every named Angular GraphQL operation.
- Resolve all duplicate operation names.
- Rename operations so names describe the actual semantic action and remain stable.
- Add an automated uniqueness check covering static documents and supported generated/dynamic variants.
- Regenerate client types when operation names feed generated artifacts.

## Out of scope

- Moving all operations into `.graphql` files; task `0007` owns catalog normalization.
- Changing server field names merely to mirror client operation names.
- Product-visible behaviour changes.

## Decisions already made

- GraphQL operation names are globally unique within the client document set.
- Names must describe the actual operation rather than being made unique with meaningless numeric suffixes.
- Server resolver/field names do not need to change when only the client operation name is duplicated.

## Requirements

1. Extract every `query`, `mutation`, and `subscription` operation name from Angular sources.
2. Reproduce the four duplicate groups identified by the Series baseline.
3. Rename every conflicting operation to a unique semantic name.
4. Update generated type references/tests/snapshots affected by the names.
5. Add a deterministic automated check that fails when duplicate operation names are introduced.
6. Ensure the check includes documents materialized from supported dynamic templates until task `0007` removes those templates.

## Acceptance criteria

- [ ] No GraphQL operation name occurs more than once across the complete Angular document set.
- [ ] `GetChapterById`, `MyMoleculeItems`, `UpdateMoleculeCollection`, and `UpdateMoleculeItemLabel` no longer form duplicate-name groups.
- [ ] Every renamed operation still invokes the intended server field with the same variables/selections.
- [ ] GraphQL validation/codegen checks pass.
- [ ] Angular build and relevant tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg` run the GraphQL uniqueness/validation/codegen checks, then:

```text
npm run build
npm test -- --watch=false
```

## Browser validation

Not applicable. Operation naming is observable through tooling/tracing rather than product UI.

## Stop conditions

Block if two operations are intentionally required to share the same persisted external operation name by an undocumented external consumer. Record the evidence and required compatibility decision rather than silently breaking that contract.

## Dependencies

- `0003-validate-every-angular-graphql-document-against-nest-schema.md` should be `DONE` first.

## Implementation notes

Prefer names that include the resource and action/context when necessary, for example differentiating a compact list query from a detailed query instead of appending arbitrary suffixes.

## Execution notes

### Summary

Reproduced the four audit-baseline duplicate groups at commit
`8048279c1f7cf65b7d46149e19ad039c4e47c5f3`: `GetChapterById` occurred three
times, `MyMoleculeItems` twice, `UpdateMoleculeCollection` twice, and
`UpdateMoleculeItemLabel` four times. Earlier integrated GraphQL work had
already given the molecule-item variants semantic names
(`MoleculeItemBasicData`, `UpdateMoleculeItemName`,
`UpdateMoleculeItemCanonicalSmiles`, and `UpdateMoleculeItemNotes`), leaving
the Notebook header queries and collection-name mutation as the remaining
conflicts on this feature base.

The section and page-header queries are now named `GetSectionById` and
`GetPageHeaderById`, while the dedicated static collection-name mutation is
named `UpdateMoleculeCollectionName`. Their server fields, variable names and
types, selections, service method behavior, and runtime result extraction are
unchanged. GraphQL Code Generator regenerated the corresponding
`UpdateMoleculeCollectionName*` result, variable, and document symbols.

The Angular GraphQL validator now inventories every operation definition,
including all operations inside a multi-operation `gql` template. It rejects
anonymous operations and duplicate names globally across standalone
documents, static templates, and the four supported dynamic templates.
Dynamic `minimal` and `withItems` materializations are both schema-validated
and treated as variants of one source operation, while a collision between a
dynamic template and any other document still fails deterministically. The
negative fixture deliberately duplicates dynamic operation
`MyMoleculeCollections` and proves that path.

Implementation commit:

- `b4722c57` - `feat(graphql): enforce unique operation names`

### Validation performed

- Task-start preflight on clean `feature/SYS-006` at supplied base
  `b08c3a86c5ad9e575a2e66b101e8811fda8357b2`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, complete unchanged CI-parity aggregate.
- Audit reproduction:
  - `git grep` against audit baseline
    `8048279c1f7cf65b7d46149e19ad039c4e47c5f3` reproduced counts of
    `GetChapterById` = 3, `MyMoleculeItems` = 2,
    `UpdateMoleculeCollection` = 2, and `UpdateMoleculeItemLabel` = 4.
- GraphQL validation/code generation:
  - `npm run graphql:generate --workspace mercurion_web_ng` - PASS;
  - `npm run graphql:check --workspace mercurion_web_ng` - PASS;
  - inventory covered 11 source files, 55 static documents, four dynamic
    templates, all eight dynamic expansions, and 69 named operations;
  - result was 69 distinct names with every document valid against the
    committed Nest schema;
  - `npm run graphql:validate:negative --workspace mercurion_web_ng` - PASS
    for both the invalid-field and duplicate-name fixtures;
  - direct duplicate probe exited non-zero with
    `Duplicate GraphQL operation name "MyMoleculeCollections"` and identified
    both the fixture and the dynamic template source.
- Focused regressions:
  - from `MercurionWebNg`,
    `npx ng test --watch=false --include="src/app/services/graphql/notebook.service.spec.ts" --include="src/app/services/graphql/molecule-collection.service.spec.ts"`
    - PASS, 10 tests;
  - tests assert the semantic Notebook operation names and unchanged selected
    fields/variables, plus the generated collection-name operation, `id` and
    `name` variables, and unchanged `updateMoleculeCollection` server field.
- Angular:
  - `npm run typecheck --workspace mercurion_web_ng` - PASS;
  - `npm run lint --workspace mercurion_web_ng` - PASS with existing warnings
    only;
  - from `MercurionWebNg`, `npm run build` - PASS with existing bundle-budget
    and CommonJS warnings only;
  - `npm run test:ci --workspace mercurion_web_ng` - PASS with all 169 tests
    and a clean exit.
- Final pre-integration CI parity after implementation commit `b4722c57`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, including autonomous recipe validation,
    contracts, Angular/Nest lint and typechecks, all Angular tests, all Nest
    unit/E2E tests, and both builds.
- `git diff --check` - PASS.

### Browser validation performed

Not applicable per the recipe. Operation naming is fully established through
document inventory, schema/codegen checks, AST-level regression tests, and the
negative duplicate probe.

### Changed files

- Updated `MercurionWebNg/scripts/validate-graphql-documents.mjs` with
  deterministic global operation inventory and uniqueness enforcement across
  static and dynamic documents.
- Updated `MercurionWebNg/scripts/test-graphql-validator-negative.mjs` and
  added
  `MercurionWebNg/scripts/fixtures/duplicate-operation-name.graphql`.
- Renamed the two conflicting Notebook header operations in
  `MercurionWebNg/src/app/services/graphql/notebook.service.ts`.
- Renamed the static collection-name operation in
  `MercurionWebNg/src/app/services/graphql/graphql-operations/molecule-collection.gql-operations.ts`
  and updated generated references in
  `MercurionWebNg/src/app/services/graphql/molecule-collection.service.ts`.
- Regenerated `MercurionWebNg/src/app/generated/graphql.ts`.
- Expanded Notebook and molecule-collection service tests with semantic-name,
  variable, and server-field assertions.
- Updated `MercurionWebNg/GRAPHQL_CODEGEN.md` and this recipe with the
  uniqueness contract and execution evidence.

### Blocker / human decision required

None. No evidence was found that an external persisted-operation consumer
requires any of the duplicate audit-baseline names to remain shared.
