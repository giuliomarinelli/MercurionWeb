# 0017 - Remove GraphQL internal Maybe imports

- [ ] DONE
- [ ] BLOCKED

## Objective

Remove all dependencies on the internal `graphql/jsutils/Maybe` module and use TypeScript nullish types or a public application-owned alias instead.

Source: `SYS-017` in Series `0001`.

## Context

The audited code imports `Maybe` from `graphql/jsutils/Maybe` in both applications. Examples include Angular GraphQL helpers, `AppContextService`, `AuthService`, UI components and Nest `HelpService`. `graphql/jsutils/*` is an internal package path and is not a stable public API contract.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/graphql-helpers/v1/extract-gql-data.helper.ts`
- `MercurionWebNg/src/app/services/graphql/graphql-helpers/v2/apollo-like.model.ts`
- `MercurionWebNg/src/app/services/context/app-context.service.ts`
- `MercurionWebNg/src/app/services/auth.service.ts`
- Angular components returned by repository search for `graphql/jsutils/Maybe`
- `MercurionWebNode/src/app_modules/help/services/help.service.ts`
- every additional import discovered by repository-wide search

## In scope

- Remove every `graphql/jsutils/Maybe` import in production and test code.
- Replace uses with `T | null | undefined`, generated GraphQL nullability types, or one small public application alias only where it improves readability.
- Add a static rule/check preventing imports from GraphQL internal paths.

## Out of scope

- Broad nullability redesign unrelated to the imported alias.
- Changing GraphQL field nullability in the server schema.

## Decisions already made

- No application code depends on GraphQL package internals.
- Prefer primitive TypeScript nullish types unless a shared public alias materially improves a repeated contract.

## Requirements

1. Search both projects for imports under `graphql/jsutils/` or other private GraphQL internals.
2. Replace `Maybe` without widening/narrowing semantics accidentally.
3. Prefer generated GraphQL types in document/result code where task `0002` already provides them.
4. Add an ESLint/static check or equivalent policy that rejects future internal GraphQL imports.
5. Update tests/types affected by the nullability notation.

## Acceptance criteria

- [ ] Repository search finds no application import from `graphql/jsutils/Maybe`.
- [ ] No equivalent import from another GraphQL internal/private path is introduced.
- [ ] Existing null/undefined behaviour is preserved.
- [ ] Angular and Nest builds/tests pass.
- [ ] The new static policy catches a deliberate internal-path import.

## Validation

Run the static policy plus:

From `MercurionWebNg`:

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

Not applicable.

## Stop conditions

Block only if a discovered internal GraphQL import provides runtime functionality rather than a replaceable type and removing it requires an unrelated architectural migration. Document the exact import/use.

## Dependencies

- None.

## Implementation notes

Avoid creating an application `Maybe<T>` alias merely to preserve the old spelling in a few files; direct `T | null` / optional fields are preferred where clear.

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
