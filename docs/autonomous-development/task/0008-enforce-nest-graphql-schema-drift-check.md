# 0008 - Enforce Nest GraphQL schema drift check

- [ ] DONE
- [ ] BLOCKED

## Objective

Make the committed `MercurionWebNode/src/schema.graphql` a verified artifact: CI must regenerate the Nest code-first schema and fail whenever the generated schema differs from the committed file.

Source: `SYS-008` in Series `0001`.

## Context

`MercurionGraphQLModule` uses `autoSchemaFile: join(process.cwd(), 'src', 'schema.graphql')`, so the schema is generated from Nest resolver/type metadata. The schema is committed, but the audited repository has no automatic guard proving that the committed file still matches current code.

## Relevant files and modules

- `MercurionWebNode/src/mercurion-graphql.module.ts`
- `MercurionWebNode/src/schema.graphql`
- `MercurionWebNode/package.json`
- Nest bootstrap/test utilities capable of initializing GraphQL metadata
- `.github/workflows/` or the repository's current CI configuration if one is introduced/found during implementation

## In scope

- Add a deterministic command that generates the code-first GraphQL schema in a controlled environment.
- Compare generated output against the committed schema without mutating it as part of the check.
- Add CI execution for that check.
- Keep a separate explicit developer command for intentionally updating the committed schema when resolver/type metadata changes.

## Out of scope

- Changing GraphQL API semantics merely to make current drift disappear.
- Client code generation except integration with the already-established GraphQL workflow.
- General CI redesign beyond the schema gate.

## Decisions already made

- `schema.graphql` remains committed.
- Code-first Nest metadata is authoritative; CI verifies the committed artifact against regeneration.
- CI must fail on drift rather than silently rewriting the repository.

## Requirements

1. Implement a schema-generation command that does not require production credentials/services.
2. Normalize only nondeterministic formatting/order if the framework itself produces unstable output; do not normalize away semantic differences.
3. Implement a check command that exits non-zero on drift and presents an actionable diff/path.
4. Provide an explicit update command for developers to regenerate the committed schema intentionally.
5. Run the check in CI on changes that can affect the Nest GraphQL schema.
6. Ensure the Angular GraphQL validation/codegen flow consumes the verified committed schema.

## Acceptance criteria

- [ ] A clean checkout regenerates a schema byte-for-byte or semantically identically equal to the committed artifact under the chosen deterministic comparison.
- [ ] Modifying a resolver/type field without updating `schema.graphql` makes the CI/check command fail.
- [ ] The failure clearly identifies schema drift.
- [ ] An explicit developer command can update the committed schema.
- [ ] Nest build/tests remain green.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNode` run the new schema update/check commands and then:

```text
npm run build
npm test -- --runInBand
```

Demonstrate the check with a controlled temporary schema mismatch, then restore the ordinary file content using normal file editing rather than Git write commands.

## Browser validation

Not applicable.

## Stop conditions

Block if schema generation cannot run without unavailable external infrastructure and no existing test/bootstrap path can isolate GraphQL metadata. Record the exact runtime dependency instead of embedding production credentials into CI.

## Dependencies

- None.

## Implementation notes

A CI workflow may be added if the repository has no current workflow directory. Keep the underlying drift check runnable locally so CI is only an executor, not the sole implementation.

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
