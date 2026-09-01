# 0001 - Canonicalize REST contract ownership

- [ ] DONE
- [ ] BLOCKED

## Objective

Eliminate manually duplicated REST payload definitions between Angular and Nest so every public REST request/response shape is derived from one canonical, versioned contract source, when possible (Nest uses `class-validator` with specific decorators and DTOs are defined as *class*: evaluate if it's safely possible to dedupe - Angular doesn't use and doesn't know `class-validator`).
Create a repo root monorepo package.json with MercurionWebNg and MercurionWebNode as workspaces. 
Create .npmrc with rules: save-exact=true, legacy-peer-deps=true.
Create a package which exports the common dependencies.
Refactor the package.json of the 2 projects to adapt the architecture to the monorepo structure, delete lockefiles and node_modules and run `npm install` from the root of the repo. 

Source: `SYS-001` in Series `0001`.

## Context

The audit found REST DTOs duplicated between `MercurionWebNg/src/app/Models/**` and Nest DTOs under `MercurionWebNode/src/**/Models/DTO/**`. Angular services using `HttpClient` include auth, account, feedback, history, country, recovery, Mercurion AI and RDKit clients. The repository does not currently expose an established OpenAPI/code-generation pipeline.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/`
- `MercurionWebNg/src/app/services/auth.service.ts`
- `MercurionWebNg/src/app/services/account.service.ts`
- `MercurionWebNg/src/app/services/feedback.service.ts`
- `MercurionWebNg/src/app/services/history.service.ts`
- `MercurionWebNg/src/app/services/rd-kit-api.service.ts`
- `MercurionWebNode/src/app_modules/**/Models/DTO/`
- `MercurionWebNode/src/app_modules/**/controllers/`
- package/configuration files needed by the chosen contract-generation mechanism

## In scope

- Inventory public REST request/response payloads consumed by Angular.
- Establish one canonical contract source for those payloads.
- Replace manual client-side copies with generated or directly shared contract types.
- Add a deterministic generation/check command suitable for CI.
- Remove obsolete duplicate declarations once consumers use the canonical source.

## Out of scope

- GraphQL contracts; those are handled by later tasks.
- WebSocket contracts.
- Unrelated API redesigns or endpoint renames.
- Changes to `../MercurionTox21`.

## Decisions already made

- Manual duplicated REST DTOs are not an acceptable steady state.
- The canonical solution must be either an OpenAPI-derived contract or a versioned shared contract package, as stated by the Series Definition of Done.
- Existing externally visible REST behaviour must be preserved unless another numbered task explicitly changes it.

## Requirements

1. Enumerate all Angular `HttpClient` calls and the Nest endpoints they consume.
2. Identify the request/response types currently duplicated across the two applications.
3. Use one canonical source to define every public REST payload in that inventory.
4. Ensure Angular consumes generated/shared types rather than maintaining equivalent handwritten DTOs.
5. Ensure Nest remains the authoritative runtime validator at the HTTP boundary.
6. Add an automated check that fails when generated/shared contract artifacts drift from the canonical source.
7. Keep runtime serialization compatible with the current API.

## Acceptance criteria

- [ ] Every public REST payload consumed by Angular has exactly one canonical contract definition.
- [ ] Angular contains no manually maintained duplicate of a Nest REST DTO for the covered endpoints.
- [ ] Contract generation/checking is deterministic and documented through executable package commands.
- [ ] Nest and Angular builds succeed with the canonical contract arrangement.
- [ ] Existing targeted REST tests remain green.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

From `MercurionWebNode`:

```text
npm run build
npm test -- --runInBand
```

From `MercurionWebNg`:

```text
npm run build
npm test -- --watch=false
```

Run the new contract generation/check command twice and verify the second run produces no content drift.

## Browser validation

Not applicable. Contract correctness is established through generation, compile-time use and automated tests.

## Stop conditions

Mark `BLOCKED` if the repository still contains no human-approved choice between OpenAPI generation and a versioned shared contract package. Do not make that architecture decision autonomously.

Also block if adopting the approved mechanism requires changing externally visible REST semantics not authorized by this task.

## Dependencies

- None.

## Implementation notes

Prefer a migration that can be introduced incrementally but leaves the covered public REST surface with a single source of truth by task completion. Avoid a third handwritten mirror layer.

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
