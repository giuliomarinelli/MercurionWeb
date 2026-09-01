# 0007 - Centralize static GraphQL document catalog

- [ ] DONE
- [ ] BLOCKED

## Objective

Move Angular GraphQL operations into one statically analyzable document catalog and replace runtime string/template field assembly with named, typed fragments/documents.

Source: `SYS-007` in Series `0001`.

## Context

GraphQL operations currently live in multiple forms: central `graphql-operations` TypeScript files, inline `gql` strings inside services such as Notebook and molecule collection services, and templates whose selection sets are built dynamically. This prevents a complete static contract inventory and complicates Code Generator and validation.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/`
- `MercurionWebNg/src/app/services/graphql/graphql-operations/`
- `MercurionWebNg/src/app/services/graphql/notebook.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection-join.service.ts`
- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- GraphQL codegen/validation configuration from tasks `0002`–`0006`

## In scope

- Define one canonical location/pattern for Angular `.graphql` documents.
- Migrate inline queries/mutations/subscriptions to that catalog.
- Replace dynamic field-string interpolation with named fragments or distinct static operations representing supported variants.
- Update Angular services to import/use compiled documents and generated types.
- Make the full catalog discoverable by validation/codegen without executing application code.

## Out of scope

- Changing resolver semantics.
- Introducing arbitrary configurable GraphQL selections beyond the currently supported application behaviours.
- REST or Socket.IO contract work.

## Decisions already made

- The steady-state catalog uses static `.graphql` documents.
- Variable data remains GraphQL variables; document structure must not be assembled from arbitrary runtime strings.
- Existing supported field-selection variants should become explicit named fragments/documents rather than disappear.

## Requirements

1. Inventory all Angular `gql` usages and classify each as catalogued, inline-static, or dynamically assembled.
2. Create one canonical `.graphql` catalog hierarchy with stable naming.
3. Move every static operation into the catalog.
4. Convert each supported dynamic template variant into statically analyzable named fragments/documents.
5. Update consumers to import the generated/compiled document representation supported by the chosen toolchain.
6. Remove obsolete inline operation constants/templates.
7. Configure codegen/validation to scan the complete catalog and no broad legacy source glob once migration is complete.
8. Add a check that prevents new executable `gql` document definitions outside the canonical catalog, allowing only explicitly documented infrastructure exceptions if technically unavoidable.

## Acceptance criteria

- [ ] Every Angular GraphQL operation is represented by a static document in the canonical catalog.
- [ ] No response selection set is assembled by interpolating field strings at runtime.
- [ ] All previously supported dynamic variants remain available as explicit typed documents/fragments.
- [ ] Codegen and schema validation discover the entire GraphQL client surface from the catalog.
- [ ] Angular contains no undocumented inline executable `gql` documents.
- [ ] Angular build/tests and GraphQL checks pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

Run GraphQL codegen, schema validation, duplicate-name checking and the new catalog-policy check.

## Browser validation

Not required unless migration changes runtime request behaviour. If a migrated operation behaves differently at runtime, use the canonical local runtime and Chrome DevTools MCP at `http://localhost:8888` to exercise the affected flow and inspect `/api/graphql` requests/errors.

## Stop conditions

Block if a dynamic document is genuinely driven by arbitrary user/runtime-selected schema fields and cannot be represented by a finite documented set of static operations without changing product behaviour. Record that exact case and the architecture decision required.

## Dependencies

- `0002-generate-angular-graphql-documents-and-types.md`
- `0003-validate-every-angular-graphql-document-against-nest-schema.md`
- `0006-enforce-unique-graphql-operation-names.md`

## Implementation notes

Do not merely relocate TypeScript template strings into another TypeScript file. The final source should be statically parseable by standard GraphQL tooling.

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
