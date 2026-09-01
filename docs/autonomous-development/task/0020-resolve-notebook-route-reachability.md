# 0020 - Resolve Notebook route reachability

- [ ] DONE
- [ ] BLOCKED

## Objective

Resolve the Lab Notebook feature into a coherent product state: make the existing Angular/Nest Notebook feature reachable and end-to-end covered, or remove it completely from client, schema and server.

Source: `SYS-020` in Series `0001`.

## Context

The repository contains Angular Notebook pages/components/services and Nest Lab Notebook resolvers/services, but `MercurionWebNg/src/app/app.routes.ts` has no Notebook route. The feature therefore exists in code yet is not reachable through the audited route tree.

## Relevant files and modules

- `MercurionWebNg/src/app/app.routes.ts`
- `MercurionWebNg/src/app/pages/notebook/`
- `MercurionWebNg/src/app/components/notebook/`
- `MercurionWebNg/src/app/services/graphql/notebook.service.ts`
- `MercurionWebNode/src/app_modules/lab-notebook/`
- `MercurionWebNode/src/schema.graphql`
- navigation/menu components that would expose an approved Notebook route

## In scope

After an explicit product decision is established:

**If Notebook is retained:**
- add the approved reachable route/navigation entry point;
- ensure route guards/access rules match the intended audience;
- make the existing Notebook flow compile and function against the canonical GraphQL documents/types;
- add an end-to-end/browser-level route/feature check and relevant unit/integration coverage.

**If Notebook is removed:**
- remove Angular pages/components/services/navigation remnants;
- remove Nest Lab Notebook runtime/resolver/schema surface;
- remove now-unused models/tests/configuration safely.

## Out of scope

- Autonomously deciding whether Notebook remains a product feature.
- Inventing route naming, information architecture or access policy if not already specified.
- Broad Notebook UX redesign.

## Decisions already made

- An unreachable but otherwise present feature is not an acceptable final state.
- The end state is fully reachable/supported or fully removed.
- Product route/feature ownership is human-controlled.

## Requirements

1. Confirm from repository/project documentation whether Notebook is explicitly retained or deprecated.
2. If retained, confirm the intended route path, navigation exposure and access policy from existing documentation/human instruction before implementing them.
3. Implement the chosen retain/remove branch completely rather than leaving partial zombie code.
4. Keep GraphQL schema/client generated artifacts aligned.
5. Add tests proving the final state.

## Acceptance criteria

- [ ] Notebook has an explicit documented product status.
- [ ] If retained, a user can reach the feature through the approved Angular route and its primary flow is covered end-to-end.
- [ ] If removed, Notebook code/schema/runtime exposure no longer remains in Angular or Nest.
- [ ] GraphQL checks, Angular/Nest builds and affected tests pass.
- [ ] No unreachable Notebook feature tree remains.

## Validation

Run GraphQL schema/codegen/validation checks plus affected Angular/Nest tests/builds.

## Browser validation

If **retained**, mandatory: start the canonical local runtime, navigate through `http://localhost:8888` to the approved Notebook route using Chrome DevTools MCP, verify the route is reachable under the correct guard, exercise a representative Notebook flow, inspect `/api/graphql`, and verify no uncaught console errors.

If **removed**, verify any former/navigation entry is absent and a stale former route follows the explicitly chosen fallback behaviour only if that route existed publicly.

## Stop conditions

**Mandatory:** mark `BLOCKED` if there is no explicit human/product decision to retain/remove Notebook.

If retained, also block when route path, navigation placement or access policy is unspecified. Do not invent those product decisions.

## Dependencies

- `0005-align-notebook-delete-mutation-id-scalars.md`
- `0007-centralize-static-graphql-document-catalog.md` if retained.
- `0008-enforce-nest-graphql-schema-drift-check.md` for either branch.

## Implementation notes

The current absence from `app.routes.ts` is evidence of unreachability, not evidence that deletion is desired.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / branch-dependent._

### Changed files

_Not recorded._

### Blocker / human decision required

_None recorded yet._
