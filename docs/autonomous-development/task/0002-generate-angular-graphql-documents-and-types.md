# 0002 - Generate Angular GraphQL documents and types

- [ ] DONE
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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
