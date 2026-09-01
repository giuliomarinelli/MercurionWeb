# 0213 - Refresh canonical repository documentation

- [ ] DONE
- [ ] BLOCKED

## Objective

Replace stock/stale repository and project READMEs with one verified documentation set that accurately describes the current toolchain, setup, environments, architecture, runtime dependencies and canonical lint/typecheck/test/build workflows.

Source: `QA-027` in Series `0001`.

## Context

The Angular README remains scaffold-like and the Nest README describes stack/configuration that no longer matches the repository. By this task, the Series has normalized workspace commands, application boundaries, contracts, runtime topology, test suites, CI and container behavior. Documentation must describe that resulting system from executable sources of truth and must not preserve obsolete commands or duplicate secrets/version values manually.

## Relevant files and modules

- root `readme.md`
- `MercurionWebNg/README.md`
- `MercurionWebNode/README.md`
- `MercurionData/README.md`
- `MercurionLandingFactory/README.md`
- root/project package manifests and canonical scripts
- `AGENTS.md` and `docs/autonomous-development/`
- canonical runtime/Compose/Kubernetes configuration
- environment/config schema and example files
- API/schema/architecture documentation produced by earlier tasks

## In scope

- Inventory every active repository project/service and its supported toolchain/runtime role.
- Rewrite the root README as the repository entrypoint with architecture, prerequisites, setup and canonical command map.
- Rewrite each active project README with real framework/runtime versions, responsibilities, local commands and dependencies.
- Document environment classes, required external services and safe configuration setup without secret values.
- Document the authoritative REST/GraphQL/WebSocket/NATS contract and generation/validation workflows at the appropriate level.
- Document unit, integration, E2E, browser/system, build and container workflows using commands that actually exist.
- Remove stale scaffold text, obsolete paths and contradictory environment/deployment guidance.
- Add automated documentation/link/command-reference checks where deterministic.

## Out of scope

- Do not turn technical setup documentation into marketing copy or duplicate the complete autonomous-development protocol in every README.
- Do not publish secrets, internal credentials, production endpoints or sensitive operational data.
- Do not document aspirational commands/features that are not present and verified.
- Do not create manually copied version/config tables that immediately diverge from canonical metadata.
- Do not modify `../MercurionTox21`; document it only as the read-only external runtime dependency where relevant.

## Decisions already made

- The root README is the navigation/setup authority for the monorepository.
- Project READMEs own project-specific responsibilities and commands and link to shared contracts instead of copying them.
- All documented commands are derived from or validated against actual package scripts/configuration.
- Secret documentation uses names, purpose, required/optional status and safe example placeholders only.
- Architecture diagrams/tables describe the post-Series target implemented by earlier completed tasks, not the audited legacy topology.

## Requirements

1. Compare every current README statement/command/version/path with package manifests, source entrypoints, config schemas, runtime manifests and CI; record/remove stale claims.
2. Document repository prerequisites, clean install, canonical `ci:check`, local development runtime and browser edge `http://localhost:8888` in the root README.
3. Describe each active project's ownership, entrypoints, public transports/contracts, generated artifacts, build output and supported commands in its README.
4. Add a configuration reference derived from the validated config contract: variable name, purpose, required environments, safe default/example and secret classification, without real values.
5. Document required PostgreSQL/Redis/NATS/nginx and other runtime dependencies plus the supported isolated test equivalents.
6. Document all test layers and diagnostics/artifacts, including how local checks map to the canonical GitHub Actions aggregate.
7. Add a deterministic docs check for broken relative links, missing referenced paths/scripts and forbidden placeholder/scaffold markers; generate volatile sections where practical.
8. Follow the documented clean-checkout setup and execute every canonical command sequence, correcting documentation or implementation references when they disagree.

## Acceptance criteria

- [ ] Root and active project READMEs describe the actual post-Series repository and supported toolchain versions.
- [ ] A new contributor can install, configure and run the canonical local stack from the documented steps without hidden repository knowledge.
- [ ] Environment/runtime dependencies and secret classifications are complete without exposing secret values.
- [ ] Lint, typecheck, unit, integration/E2E, browser/system, build and container commands are accurate and executable.
- [ ] Stock scaffold text, obsolete commands/paths and contradictory environment claims are absent.
- [ ] CI rejects broken internal links, missing referenced scripts/paths and known scaffold placeholders.

## Validation

Run the documentation/link/reference checker, execute the documented clean-install and all canonical command sequences on a clean checkout, validate referenced configuration examples and container/runtime commands, then run repository-wide CI parity.

## Browser validation

Follow the newly documented runtime startup from a clean environment and open `http://localhost:8888` with Chrome DevTools MCP. Verify the application shell loads through nginx, one Angular-to-Nest request succeeds and no relevant uncaught console/network error contradicts the setup guide.

## Stop conditions

Mark `BLOCKED` if an active project's ownership, supported environment or required external-service contract remains contradictory after earlier tasks, or if accurate setup requires an undocumented credential/distribution decision. Do not present an assumption as supported behavior.

## Dependencies

- `0001`/`0008` workspace and canonical command contracts must be `DONE`.
- Major architecture, runtime, test and CI tasks through `0212` should be `DONE` so documentation describes the stabilized implementation.

## Implementation notes

Prefer links and generated/reference-checked tables over copying the same command/configuration across files. Documentation drift is reduced by owning each fact once.

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
_Not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
