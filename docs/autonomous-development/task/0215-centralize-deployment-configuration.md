# 0215 - Centralize deployment configuration

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Make Docker Compose, Docker build references and Kubernetes manifests derive from one validated service/deployment schema plus explicit environment overlays so image identity, names, ports, required variables and secret references cannot drift.

Source: `QA-029` in Series `0001`.

## Context

The repository repeats service variables, image names, ports and environment wiring across development Compose, local staging, beta/prod release Compose files, Dockerfiles and Kubernetes manifests. Repetition makes a change appear valid in one environment while another silently retains an old name, port or required variable. The application config schema from `0130`/`0131`, canonical images from `0208` and build identity from `0214` provide the inputs for a single deployment model.

## Relevant files and modules

- `docker_md/docker-compose.yml`
- `docker_sl/docker-compose.yml`
- `docker_sl/local-staging/docker-compose.yml`
- `docker_sl/releases/beta/docker-compose.yml`
- `docker_sl/releases/prod/docker-compose.yml`
- canonical project Dockerfiles from `0208`
- `k8s/beta/` and `k8s/core/`
- typed application/environment configuration from `0130`/`0131`
- service ports, health endpoints and secret references
- build identity/image metadata from `0214`
- deployment render/schema validation scripts and CI

## In scope

- Inventory every logical service and its image, port, environment, volume, dependency, health and secret-reference contract across active manifests.
- Define one machine-readable canonical deployment/service schema.
- Define explicit overlays for development, local staging, beta and production differences.
- Render or deterministically validate Compose/Kubernetes artifacts from the schema/overlays.
- Centralize application image name/version/digest references and required environment-variable names.
- Preserve secret references as references; validate presence/shape without committing values.
- Remove obsolete/conflicting manifest values and add drift/schema/cross-environment CI checks.

## Out of scope

- Do not deploy, apply Kubernetes manifests or connect to production infrastructure.
- Do not commit secret values, sealed-secret private material or local credentials.
- Do not force environment-specific scaling/storage/network policy values to be identical when their difference is intentional.
- Do not introduce a second manually editable manifest source alongside the canonical schema/overlay.
- Do not modify `../MercurionTox21`; represent its external runtime contract only from this repository's deployment side.

## Decisions already made

- Logical service identity, application image coordinates, container/service ports, required variable names and secret-reference names have one source of truth.
- Environment differences live in named overlays and are schema-validated.
- Generated manifests are either reproducibly rendered or checked for drift; they are not independent configuration authorities.
- Secrets remain external references and never enter rendered CI artifacts as real values.
- Image version/revision comes from `0214` build identity and may be locked by digest where the delivery workflow supports it.

## Requirements

1. Build a cross-environment matrix of every active service and flag divergent names, ports, variables, secret refs, image tags/digests, dependencies and health configuration.
2. Define a typed/schema-validated canonical service registry with stable logical identifiers and the fields shared by Compose/Kubernetes.
3. Encode only intentional development/local-staging/beta/production differences in explicit overlays with no implicit fallback to another environment.
4. Implement deterministic render/validation for all active Compose and Kubernetes artifacts; choose one ownership model so generated files cannot be edited as a second source of truth.
5. Map application variables to the validated config schema and fail when a required variable is absent, misspelled, duplicated under another name or supplied to the wrong service.
6. Validate secret references by identifier/required environment without resolving or printing secret values.
7. Derive application image version/revision/digest metadata from `0214` and reject floating/mismatched references where the environment policy requires an immutable artifact.
8. Add CI fixtures for an unknown variable, port mismatch, missing secret reference, stale generated manifest and cross-environment image mismatch.
9. Register schema/render/drift checks in canonical CI and retain safe rendered summaries/artifacts for review.

## Acceptance criteria

- [ ] One canonical schema owns logical services, shared ports, required variables, secret-reference names and application image identity.
- [ ] Development, local staging, beta and production differences are explicit validated overlays.
- [ ] Compose and Kubernetes artifacts render/validate deterministically with no independent conflicting values.
- [ ] No real secret value is committed, logged or retained in CI render artifacts.
- [ ] Image/version and application-variable mismatches fail before deployment.
- [ ] All active environment artifacts pass schema, drift and cross-environment consistency gates.

## Validation

Render/validate every environment from safe fixture values, compare output twice for determinism, run all negative configuration fixtures, validate Compose syntax and Kubernetes schemas without applying them, inspect for secret leakage, then run repository-wide CI parity.

## Browser validation

Use the canonical local-development overlay to start the isolated runtime and exercise `http://localhost:8888`. Verify Angular, Nest and required local services resolve through the declared names/ports and one representative request succeeds without relevant console/network errors. Do not access beta/production.

## Stop conditions

Mark `BLOCKED` if two active manifests encode conflicting environment behavior whose intended value/owner cannot be established, or if an external secret/image registry contract is undocumented. Do not copy one environment's value into another speculatively.

## Dependencies

- `0130-define-every-nest-configuration-property-once.md`, `0131-make-environment-validation-bootstrap-safe-and-testable.md` and `0133-canonicalize-nats-endpoint-configuration.md` must be `DONE`.
- `0208-consolidate-project-dockerfiles.md` and `0214-centralize-release-version-and-build-identity.md` must be `DONE`.

## Implementation notes

The canonical model need not erase platform-specific constructs. Own shared semantics once, then keep Compose/Kubernetes-only fields inside typed platform projections or overlays.

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
