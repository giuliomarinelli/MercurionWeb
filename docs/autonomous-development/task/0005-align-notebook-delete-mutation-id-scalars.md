# 0005 - Align Notebook delete mutation ID scalars

- [ ] DONE
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

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
