# 0002 - Generate Angular GraphQL documents and types

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Connect the Nest GraphQL schema, Angular GraphQL documents and Angular TypeScript types through GraphQL Code Generator so response/input types are no longer duplicated manually.

Source: `SYS-002` in Series `0001`.

## Context

Nest generates `MercurionWebNode/src/schema.graphql` from code-first metadata. Angular currently stores handwritten `gql` documents and handwritten response types, including files under `MercurionWebNg/src/app/services/graphql/graphql-operations/` and `MercurionWebNg/src/app/Models/graphql/`. No GraphQL Code Generator configuration was found at the Series baseline.

## Relevant files and modules

- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNg/src/app/services/graphql/`
- `MercurionWebNg/src/app/services/graphql/graphql-operations/`
- `MercurionWebNg/src/app/Models/graphql/`
- `MercurionWebNg/package.json`

## In scope

- Add GraphQL Code Generator tooling/configuration to Angular or repository-level tooling.
- Point generation at the committed Nest schema and Angular documents.
- Generate operation/result/input/scalar types needed by Angular consumers.
- Migrate existing GraphQL service call sites away from manually duplicated response types where generated equivalents exist.
- Add deterministic generation/check commands.

## Out of scope

- Fixing every invalid GraphQL document discovered by the audit; task `0003` owns complete validation.
- Centralizing all inline/dynamic operations; task `0007` owns that normalization.
- Changing GraphQL resolver behaviour or public field semantics unless required only to make the current schema accurately represent runtime behaviour.

## Decisions already made

- Use GraphQL Code Generator.
- `MercurionWebNode/src/schema.graphql` is the schema input until task `0008` strengthens schema-drift enforcement.
- Generated files must be reproducible and must not require a running production service.

## Requirements

1. Configure GraphQL Code Generator against `MercurionWebNode/src/schema.graphql` and the Angular GraphQL document locations.
2. Provide scalar mappings appropriate to existing client types.
3. Generate operation variable/result types and reusable schema types required by Angular.
4. Replace handwritten response/input type declarations where generated types are semantically equivalent.
5. Ensure generated output has a stable location and is not manually edited.
6. Add package commands for generation and drift checking.
7. Document any documents that cannot yet be generated because they are invalid/dynamic so task `0003`/`0007` can resolve them.

## Acceptance criteria

- [ ] GraphQL Code Generator runs successfully from a clean checkout after dependencies are installed.
- [ ] Angular services use generated GraphQL types for all documents accepted by the generator.
- [ ] No equivalent handwritten response type remains for migrated operations.
- [ ] A deterministic check detects stale generated GraphQL artifacts.
- [ ] Angular build succeeds.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNg` run the new GraphQL generation/check commands, then:

```text
npm run build
npm test -- --watch=false
```

Run generation twice and verify the second execution is idempotent at file-content level.

## Browser validation

Not applicable. This task changes contract/type generation rather than browser-visible behaviour.

## Stop conditions

Block if the current invalid/dynamic document set makes it impossible to introduce codegen incrementally without changing operation semantics. Record the exact documents and continue only after the required prerequisite task is clarified.

## Dependencies

- None.

## Implementation notes

Do not hide invalid operations by excluding broad source directories. Temporary explicit exclusions are acceptable only when documented precisely for follow-up by `0003`/`0007`.

## Execution notes

### Summary

Implemented incremental Angular GraphQL Code Generator coverage against the
committed Nest schema. The Angular workspace now has pinned Code Generator
tooling, deterministic generation/check commands, generated schema and
operation/document artifacts, existing `JsonValue`/`string` scalar mappings,
and generated-type adoption across every operation admitted by the explicit
allowlist.

Accepted help, molecule detail/preview, collection, collection-join and
molecule-search service calls now use generated operation variables/results;
static operation modules use generated typed document nodes. Equivalent
handwritten API aliases and schema input/response declarations were replaced
with aliases derived from generated operation types. Nullability exposed by
the committed schema is handled at existing UI/domain boundaries without
changing resolver behaviour.

Task commit:

- `fbefddab` - `feat(angular): generate GraphQL documents and types`

### Validation performed

- Task-start preflight at base
  `3cd6a9300c2869c0052f7d3318c17f9e1ff93554`:
  - `npm ci` - PASS with Node `v22.16.0` / npm `10.9.2`;
  - `npm run ci:check` - PASS (complete root CI-parity aggregate);
  - `git status --short` and `git diff --exit-code` afterward - clean/no task
    change.
- GraphQL generation and drift:
  - `npm run graphql:generate --workspace mercurion_web_ng` - PASS;
  - `npm run graphql:check --workspace mercurion_web_ng` - PASS;
  - intentional one-line generated-artifact drift probe followed by
    `npm run graphql:check --workspace mercurion_web_ng` - expected FAIL,
    exit `1`, naming `src/app/generated/graphql.ts` as stale;
  - regeneration restored the artifact and the subsequent check passed;
  - two consecutive generation runs produced identical SHA-256 content:
    - `graphql.ts`:
      `763540371C8ED482940F626AE44D20954F8250CD6137E5BE26AB6D9FC2D95F55`;
    - `schema.ts`:
      `353CD1D761F7ED8311A86B275D3F4CD7389722BF428052F0DDFD2B809E66291F`;
    - result: `IDEMPOTENT=True`.
- Angular:
  - `npm run typecheck --workspace mercurion_web_ng` - PASS;
  - `npm run lint --workspace mercurion_web_ng` - PASS with the existing
    warning-only migration debt;
  - from `MercurionWebNg`, `npm run build` - PASS; existing bundle/CommonJS
    warnings only;
  - the recipe spelling `npm test -- --watch=false` was attempted, but npm
    `10.9.2` did not forward the flag to the child `ng test` process and left
    Karma in watch mode; the owned process tree was stopped after diagnosis;
  - from `MercurionWebNg`, `npm test -- -- --watch=false` (explicit npm
    forwarding separator, child command confirmed as `ng test --watch=false`)
    - PASS, complete Angular suite;
  - the canonical root CI aggregate independently reran the complete Angular
    suite through `test:ci`.
- Pre-integration CI parity after the implementation commit:
  - root `npm ci` - PASS, `1925` packages installed, `0` vulnerabilities;
  - root `npm run ci:check` - PASS, including autonomous recipe validation,
    contracts, Angular/Nest lint, typechecks, all Angular tests, Nest unit/E2E
    tests and both builds.
- `git diff --check` - PASS.

### Browser validation performed

Not applicable per the recipe; this task changes generated contract/type
artifacts and has no browser acceptance criterion.

### Changed files

- Added `MercurionWebNg/codegen.yml`,
  `MercurionWebNg/GRAPHQL_CODEGEN.md`, and generated
  `src/app/generated/{schema,graphql}.ts`.
- Added pinned GraphQL Code Generator packages/scripts to
  `MercurionWebNg/package.json` and regenerated the root `package-lock.json`
  through npm `10.9.2`.
- Migrated accepted GraphQL service call sites and related API aliases under
  `MercurionWebNg/src/app/services/graphql/` and
  `MercurionWebNg/src/app/Models/graphql/`.
- Added the two omitted pagination metadata fields to the accepted collection
  operation so its generated result matches the existing `PageModel`
  contract.
- Added narrow null handling at affected Angular consumers where generated
  schema nullability replaced handwritten non-null assertions.

### Blocker / human decision required

None for this task.

Explicit follow-up boundary:

- `molecule-collection-item.gql-operations.ts` remains excluded because its
  committed 21-document set contains impossible interface/DTO fragment
  spreads and duplicate `MyMoleculeItems` / `UpdateMoleculeItemLabel`
  operation names; task `0003` owns those corrections.
- `molecule-collection.service.ts` remains excluded because its mixed source
  contains runtime-interpolated selection sets that static plucking cannot
  parse; task `0007` owns centralization/normalization.
- `notebook.service.ts` remains excluded because it has duplicate
  `GetChapterById` operation names, three `String!` variables used where the
  schema requires `ID!`, and inline documents; tasks `0003` and `0007` own
  those corrections.
- The exact diagnostics and accepted allowlist are documented in
  `MercurionWebNg/GRAPHQL_CODEGEN.md`. Task `0008` owns adding GraphQL drift to
  the permanent root CI aggregate.
