# 0163 - Package email templates as canonical Nest build assets

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make email templates, layouts and partials first-class Nest build assets copied by one build configuration to one runtime-relative path in development, test, staging and production, eliminating bootstrap/Dockerfile copy choreography.

Source: `DATA-014` in Series `0001`.

## Context

Email assets are currently copied through multiple independent mechanisms: `copy-bootstrap-files.ts` copies `src/app_modules/notification/email-templates` into `dist/...` during development, while production/staging/test Dockerfiles execute their own `mkdir/cp` commands. `nest-cli.json` currently declares no assets. The mail sender also historically resolves paths against `dist/...`. With layouts/partials from `0161` and registry path ownership from `0162`, the build must become the sole authority for asset placement.

## Relevant files and modules

- `MercurionWebNode/nest-cli.json`
- `MercurionWebNode/src/app_modules/notification/email-templates/`
- `MercurionWebNode/src/copy-bootstrap-files.ts`
- `MercurionWebNode/Dockerfile`
- `MercurionWebNode/Dockerfile.staging`
- `MercurionWebNode/Dockerfile.test`
- mailer/template registry from `0162`
- build/package tests

## In scope

- Declare the entire email template/layout/partial tree once in Nest compiler asset configuration.
- Ensure development watch/build and production build produce the same relative asset tree beneath `dist`.
- Remove email-template copy logic from `copy-bootstrap-files.ts` and all Dockerfiles.
- Make the template registry resolve assets from the canonical build path without depending on source-tree availability.
- Verify all partials/layouts are included, not only top-level `.hbs` files.
- Add a build artifact test that runs from a clean output directory and validates registry assets exist/render.
- Preserve any unrelated key/certificate bootstrap copying until its owning task addresses it.

## Out of scope

- Do not redesign Docker image stages unrelated to removing duplicate email asset copy commands.
- Do not move templates to a remote store.
- Do not change email copy/subjects/context semantics.
- Do not remove unrelated `copyBootstrapFiles` responsibilities such as key copying merely because the same file currently handles both.

## Decisions already made

- Nest build configuration is the single authority for repository-owned email assets.
- Source and compiled runtime use one logical template identity/relative layout.
- Docker images consume the built artifact; they do not rebuild/copy a second independent template tree.
- A clean build must be sufficient to run/render email templates.

## Requirements

1. Configure `nest-cli.json` compiler assets to include message templates, layouts and partials recursively, including watch behaviour needed for local development.
2. Verify the emitted path and align the registry/Handlebars partial configuration to that path without per-environment branching.
3. Delete email-template-specific copy code from `copy-bootstrap-files.ts` while retaining unrelated bootstrap files if still required.
4. Delete template `mkdir/cp` commands from production/staging/test Dockerfiles.
5. Build from a clean `dist` and assert every `0162` registry entry plus required partial/layout asset exists.
6. Run template render tests against compiled assets, not only the source tree.
7. Add a deterministic CI artifact check so a missing template/partial fails before container/runtime startup.

## Acceptance criteria

- [x] Email assets are declared once in Nest build configuration.
- [x] Clean local/test/staging/production builds emit the same logical template tree.
- [x] No Dockerfile or bootstrap helper separately copies email templates.
- [x] Runtime rendering does not require `src/app_modules/notification/email-templates` to exist.
- [x] Registry/render tests pass against clean compiled output.
- [x] CI fails if any registered template/partial is absent from the build artifact.

## Validation

Delete `dist`, run the Nest build, execute compiled-asset/template render checks, build applicable Docker stages, run notification tests and the canonical CI-parity gate.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the Nest compiler/runtime currently cannot preserve a required asset layout across supported build targets and choosing a new runtime layout would break an undocumented deployment consumer.

## Dependencies

- `0161-deduplicate-email-templates-with-handlebars-partials.md` and `0162-create-typed-email-template-registry.md` must be `DONE`.

## Execution notes

### Feature branch
`feature/DATA-014` (Source `DATA-014`), based on
`902e842759296b776403c372cca2bc7ed3e09675`.
### Preflight
Clean branch and working tree confirmed at the supplied base SHA. No
task-owned Angular, Nest, Tox21, Jest, or workspace watcher process was
active. Exact base-SHA Actions run
[`35048119526`](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/35048119526)
completed successfully for
`902e842759296b776403c372cca2bc7ed3e09675`; both platform prerequisite jobs,
container jobs, unit/E2E/browser jobs, build artifacts, and `Required gate`
were green. Prerequisites `0161` and `0162` were `DONE`.
### Preflight remediation
None.
### Summary
Configured Nest's compiler asset copy once for the complete email
template/layout/partial tree, with a stable `dist/src/app_modules/...`
runtime-relative output and watch support. Removed email-template copying from
the bootstrap helper and all production/staging/test Docker build stages.
Added a compiled-artifact registry/render check and registered it in the CI
static gate. The existing registry and mailer paths already target the
canonical compiled location, so no environment-specific path branch was
needed.
### Task-specific validation performed
- Cleaned `MercurionWebNode/dist`, then ran
  `npm run build --workspace mercurion_web_node`: passed; 22 email assets
  emitted, including all layouts and partials.
- `npm run check:email-assets --workspace mercurion_web_node`: passed,
  validating all 13 registry entries, four required layout/partial assets, and
  rendering each registered template from compiled output.
- `npm test --workspace mercurion_web_node -- --runInBand
  src/app_modules/notification/email-template-registry.spec.ts
  src/app_modules/notification/email-templates/email-templates.spec.ts`:
  passed, 2 suites and 18 tests.
- `npm run typecheck --workspace mercurion_web_node`: passed.
- `npm run lint --workspace mercurion_web_node`: passed.
- `git diff --check` and duplicate-copy search: passed; no Dockerfile or
  bootstrap email-template copy remains.
### Full pre-merge CI-parity validation
The first exact feature-SHA run
[`35049263627`](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/35049263627)
failed in both platform `Prerequisites` jobs because the artifact check was
registered in `ci:static`, which runs before the Nest build and therefore had
no compiled registry to inspect. The correction removes that premature static
invocation; the check remains in `ci:build:nest`, immediately after the build.
The corrected SHA `e1c243819fdc5820130ca615b850f3ad259234f0` passed exact-SHA
Actions run
[`35049585946`](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/35049585946).
`npm ci` and `npm run ci:check` remain Actions-only.
### Browser validation performed
Not applicable; the recipe declares no browser validation.
### Commits
`c2752827` (`DATA-014 package email templates as Nest assets`),
`7298b40a` (`DATA-014 record execution notes`), and
`e1c24381` (`DATA-014 run email artifact check after build`).
### Merge / CI
Pending coordinator feature-SHA CI and integration lifecycle.
### Rollback
Not applicable.
### Blocker / human decision required
None.
