# 0006 - Enforce unique GraphQL operation names

- [ ] DONE
- [ ] BLOCKED

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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
