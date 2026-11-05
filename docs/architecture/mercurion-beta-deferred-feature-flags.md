# Mercurion 1.0.0 beta — dormant scientific and document features

**Decision (2026-10-22):** keep implemented Notebook, Synthesis and Documents logic intact but make these incomplete end-to-end features inaccessible in **all four environments** until their development is explicitly resumed. This protects the Mercurion case-study release and the current marketing priorities.

## Configuration: zero new environment variables

Backend: `MercurionWebNode/src/feature-flags/feature-flags.ts`

- Existing validated `App.env`, values `development`, `test`, `staging`, `production`
- Static `FEATURE_FLAGS[App.env]` mapping

Frontend: `MercurionWebNg/src/app/feature-flags/feature-flags.ts`

- Existing `environment.name`, values `development`, `testing`, `staging`, `production`
- Static `FEATURE_FLAGS[environment.name]` mapping (Angular file replacements already exist)

| Environment | Notebook | Synthesis | Documents |
|---|---|---|---|
| Development | false | false | false |
| Test/testing | false | false | false |
| Staging | false | false | false |
| Production | false | false | false |

There are **no** `FEATURE_*` environment variables, no feature-flag database tables and no flags API. Change the two static source maps together only when deliberately resuming development. A backend/Angular build & redeployment is required after a change.

## Backend protection

`FeatureAccessGuard` is registered globally in `AppModule` **after the authentication guard**. For an unannotated route it returns true without configuration lookup. For a class or handler annotated `@RequiresFeatures(...)`, it reads `App.env` and throws `ForbiddenException('FEATURE_DISABLED')` if any required feature is disabled. Class-level flags automatically cover subsequent methods added to that same class. Additional method-level flags are **cumulative**, not overriding.

For authenticated calls, disabled REST endpoints produce HTTP 403; GraphQL is presented by Mercurion's existing error envelope. Unauthenticated calls may be refused earlier by the authentication guard with 401. No service, multipart parsing or object storage operation is reached after the feature gate rejects the request.

The GraphQL schema/SDL is intentionally preserved (operations may still be discoverable through introspection). This is **execution blocking**, not schema removal.

The pre-cutover Notebook chapter/section/page implementation remains in source for compatibility tests and historical reference. Its 19 files under `lab-notebook/models` and `lab-notebook/services` are individually classified in `MercurionWebNode/nest-reachability.config.json` as non-production legacy code. The orphan gate rejects production imports of any declared non-production file, as well as unclassified orphans; the canonical `scientific-domain` implementation remains in the production graph behind its feature guard.

### GraphQL inventory: 46 blocked root operations

| Feature | Query operations | Mutation operations |
|---|---|---|
| Notebook (10 + 21) | `labNotebooksByUser`, `labNotebook`, `notebookSections`, `notebookSection`, `notebookExperiments`, `notebookExperiment`, `experimentExecutions`, `experimentExecution`, `experimentProtocolRevisions`, `experimentProtocolRevision` | `createLabNotebook`, `updateLabNotebook`, `archiveLabNotebook`, `createNotebookSection`, `updateNotebookSection`, `reorderNotebookSections`, `createNotebookExperiment`, `updateNotebookExperiment`, `archiveNotebookExperiment`, `reorderNotebookExperiments`, `createExperimentExecution`, `updateExperimentExecution`, `startExperimentExecution`, `completeExperimentExecution`, `cancelExperimentExecution`, `archiveExperimentExecution`, `reorderExperimentExecutions`, `linkSynthesisToExperiment`, `unlinkSynthesisFromExperiment`, `linkSynthesisToExecution`, `linkMoleculeToExecution` |
| Synthesis (5 + 10) | `mySyntheticRoutes`, `syntheticRoute`, `syntheticStepsByRoute`, `syntheticStepById`, `synthStepItems` | `createSyntheticRoute`, `updateSyntheticRoute`, `deleteSyntheticRoute`, `createSyntheticStep`, `updateSyntheticStep`, `deleteSyntheticStep`, `configureSynthesisPool`, `addSynthStepItem`, `updateSynthStepItem`, `removeSynthStepItem` |

Notebook is covered by **five** resolver classes in `notebook-domain.resolver.ts`; Synthesis by **four** resolver classes under `synth/resolvers`. The three Notebook mutation handlers that bind Synthesis additionally require `synthesis`, so a later partial feature activation cannot bypass the Synthesis flag through Notebook.

`@ResolveField` nested resolvers are included under the annotated classes. The root queries/mutations are the public API boundary; GraphQL's default field-resolver guard-enhancer settings should not be modified merely for this beta gating.

### REST inventory: four blocked operations

All in `DocumentController`, annotated at the controller class:

| Method | Route |
|---|---|
| POST | `/api/documents/upload` |
| GET | `/api/documents` |
| GET | `/api/documents/:id` |
| DELETE | `/api/documents/:id` |

The upload transport also accepts `ChangeProfileImage`; **that action is deliberately unavailable while Documents is off**. The REST route-ownership generated inventory historically classified the POST as active and the other three as inactive; beta flagging supersedes that old operational classification. Regenerate source/documentation references with the standard inventory tool when they change, preserving the existing ownership classifications and evidence.

## Angular accessibility

- The route descriptors remain for future development.
- The Angular router **does not register** `/notebook`, `/notebook/:notebookId/read`, or `/notebook/:notebookId/edit` while `notebook` is false.
- The Notebook navigation metadata is omitted when disabled.
- A direct visit uses the existing wildcard and 404 page, not a feature component.
- No standalone Angular Synthesis or Documents routes currently exist.
- Existing components, services, GraphQL documents and generated schema remain in the repository. Angular hiding is only UX; NestJS is the true access boundary.

## Verification and future changes

Automated test coverage:

- `MercurionWebNode/src/feature-flags/feature-access.guard.spec.ts`: all 12 flag values false, registered resolver/controller classes, every handler rejected with 403 in four environments, all four Notebook/Synthesis activation combinations on the three cross-feature mutations, unknown-environment/feature rejection, no configuration lookup for unannotated handlers, and all 46 GraphQL root names.
- `MercurionWebNode/src/feature-flags/feature-access.graphql.spec.ts`: all 46 scientific root operations executed through Nest/Mercurius in each of the four environments (184 requests), using the canonical GraphQL formatter; every request returns HTTP 403 and the `FORBIDDEN` envelope without calling domain services. The fixture uses real resolvers and mock services, without database or storage access.
- `MercurionWebNode/src/feature-flags/feature-access.http.spec.ts`: all four Documents REST routes return 403 in each of the four environments (16 requests), without parsing multipart uploads or calling their command service.
- `MercurionWebNg/src/app/feature-flags/feature-flags.spec.ts`: 12 values false, all three Notebook routes omitted, navigation absent, no other deferred routes.

Locally, run Nest typecheck and Jest `feature-access` specs, then Angular typecheck/route tests/build. Existing scientific unit tests should remain valid: inner logic is deliberately retained and test fixtures that do not register the global beta guard may still exercise it.

From the repository root in PowerShell, direct CLI invocation preserves the Jest/Karma arguments:

```powershell
Push-Location MercurionWebNode
try {
  npm run typecheck
  ..\node_modules\.bin\jest.cmd --config ./jest.config.js --runInBand feature-access
} finally {
  Pop-Location
}

Push-Location MercurionWebNg
try {
  npm run typecheck
  npm run build
  ..\node_modules\.bin\ng.cmd test --watch=false --karma-config=karma.conf.js --include=src/app/feature-flags/feature-flags.spec.ts --include=src/app/route-manifest.spec.ts --include=src/app/route-policy.spec.ts --include=src/app/services/app-shell.facade.spec.ts
} finally {
  Pop-Location
}
```

**No PostgreSQL reset or DDL changes are required.** Existing scientific tables and historical protocol data remain.

When resuming either Notebook or Synthesis development: change both feature maps intentionally, validate cross-feature operations, re-run affected smoke/unit/E2E and responsive/accessibility checks, then redeploy the correct environment builds. Do **not** switch on a production flag merely to unblock development in a local build.
