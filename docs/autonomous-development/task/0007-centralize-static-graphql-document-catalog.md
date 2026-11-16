# 0007 - Centralize static GraphQL document catalog

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

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

Centralized the complete Angular GraphQL client surface in the canonical
`MercurionWebNg/src/app/graphql/documents/**/*.graphql` catalog. The five
feature-oriented catalog files contain all 73 named operations and three
shared fragments, and Code Generator now discovers only this catalog rather
than an incremental TypeScript/source allowlist.

Removed every executable `gql` template and obsolete
`graphql-operations/*.ts` module from Angular source. Help, molecule,
molecule-search, collection, collection-item, collection-join, and Notebook
consumers now use generated typed document nodes plus generated
operation/result/variable types.

Replaced the finite molecule-collection field-string builder with four
explicit minimal/`WithItems` operation pairs backed by named
`MoleculeCollectionFields` and `MoleculeCollectionWithItemsFields` fragments.
The minimal and item-inclusive response selections remain available for list,
detail, create, and update calls. Resolver fields, data variables, fetch
policies, result extraction, and public service behavior were preserved. The
item-inclusive operations have semantic `WithItems` names so the catalog also
retains the global operation-name uniqueness contract.

Reworked validation to parse the complete catalog without executing
application code, validate it as one document set against the committed Nest
schema, reject anonymous operations, and enforce globally unique names. Added
a fail-closed catalog policy that rejects standalone GraphQL files outside the
canonical hierarchy and executable `gql` tags/calls in TypeScript, including
aliased Apollo `gql` imports. A committed negative fixture proves inline
executable documents are rejected.

One existing request-compatibility bridge remains explicit:
`AddManyChEMBLItemDTO.chemblMolregno` is a numeric client value while generated
`ID` input types are string-only. The service uses the generated operation and
variables type but preserves the existing numeric wire payload through a
documented type bridge; changing that contract was outside this relocation
task.

Implementation commit:

- `cb65fae8` - `feat(graphql): centralize Angular document catalog`

### Validation performed

- Task-start preflight on clean `feature/SYS-007` at supplied base
  `9d4d552662db3d19d3266aec4e91bf60a130f125`:
  - root `npm ci` - PASS, 1925 packages installed, 0 vulnerabilities;
  - root `npm run ci:check` - PASS, complete unchanged CI-parity aggregate.
- Catalog inventory and policy:
  - `npm run graphql:catalog-policy --workspace mercurion_web_ng` - PASS;
  - `npm run graphql:catalog-policy:negative --workspace mercurion_web_ng` -
    PASS; the committed inline executable `gql` fixture was rejected;
  - direct source inventory found five `.graphql` files, all under
    `src/app/graphql/documents`, and no executable `gql` definitions in
    Angular TypeScript.
- GraphQL validation, uniqueness, generation, and drift:
  - `npm run graphql:generate --workspace mercurion_web_ng` - PASS;
  - `npm run graphql:check --workspace mercurion_web_ng` - PASS;
  - inventory: five catalog files, 73 named operations, three fragments;
  - every catalog document validated against
    `MercurionWebNode/src/schema.graphql`;
  - operation names were globally unique;
  - invalid-field and duplicate-name negative fixtures were rejected;
  - GraphQL Code Generator `--check` reported no generated-artifact drift.
- Focused service regressions:
  - from `MercurionWebNg`,
    `npx ng test --watch=false --karma-config=karma.conf.js --include src/app/services/graphql/molecule-collection.service.spec.ts --include src/app/services/graphql/molecule-collection-item.service.spec.ts --include src/app/services/graphql/molecule-collection-join.service.spec.ts --include src/app/services/graphql/molecule-search.service.spec.ts --include src/app/services/graphql/notebook.service.spec.ts`
    - PASS, 18 tests;
  - collection tests prove all four former dynamic selections have explicit
    minimal and `WithItems` typed documents.
- Angular:
  - `npm run typecheck --workspace mercurion_web_ng` - PASS;
  - `npm run lint --workspace mercurion_web_ng` - PASS with existing warnings
    only;
  - `npm run build --workspace mercurion_web_ng` - PASS with existing
    bundle-budget and CommonJS warnings only;
  - `npm run test:ci --workspace mercurion_web_ng` - PASS, all 170 tests.
- Final pre-integration CI parity on the final task tree:
  - root `npm ci` - PASS;
  - root `npm run ci:check` - PASS, including autonomous recipe validation,
    contracts, Angular/Nest lint and typechecks, all Angular tests, all Nest
    unit/E2E tests, and both builds.
- `git diff --check` - PASS.

### Browser validation performed

Not required. This is a statically equivalent document/type relocation:
resolver fields, variables, selection contents, fetch policies, and result
handling are unchanged. The former finite `withItems` branch now selects an
explicit static typed document with the same response selection; only its
diagnostic operation name is made uniquely semantic. Static schema/codegen
validation and service tests fully establish the acceptance criteria without
requiring application data or a browser flow.

### Changed files

- Added the canonical feature documents under
  `MercurionWebNg/src/app/graphql/documents/`.
- Removed the legacy `graphql-operations/*.ts` executable document modules and
  the former Notebook fragment file outside the catalog.
- Updated all affected GraphQL services to generated typed documents and
  operation types.
- Updated `MercurionWebNg/codegen.yml`, generated
  `src/app/generated/graphql.ts`, and `GRAPHQL_CODEGEN.md`.
- Reworked `scripts/validate-graphql-documents.mjs`; added the catalog-policy
  checker, its negative proof runner, and its intentional fixture.
- Updated Angular package scripts and molecule-collection service regression
  coverage.
- Updated this recipe with provisional `DONE` status and execution evidence.

### Blocker / human decision required

None.
