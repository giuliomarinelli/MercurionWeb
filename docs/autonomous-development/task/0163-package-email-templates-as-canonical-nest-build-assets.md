# 0163 - Package email templates as canonical Nest build assets

- [ ] DONE
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

- [ ] Email assets are declared once in Nest build configuration.
- [ ] Clean local/test/staging/production builds emit the same logical template tree.
- [ ] No Dockerfile or bootstrap helper separately copies email templates.
- [ ] Runtime rendering does not require `src/app_modules/notification/email-templates` to exist.
- [ ] Registry/render tests pass against clean compiled output.
- [ ] CI fails if any registered template/partial is absent from the build artifact.

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
_Not started._
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
_Not started._
### Task-specific validation performed
_Not started._
### Full pre-merge CI-parity validation
_Not started._
### Browser validation performed
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
