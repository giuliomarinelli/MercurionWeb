# 0003 - Validate every Angular GraphQL document against Nest schema

- [ ] DONE
- [ ] BLOCKED

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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
