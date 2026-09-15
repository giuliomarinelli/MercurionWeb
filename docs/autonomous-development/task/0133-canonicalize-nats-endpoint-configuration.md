# 0133 - Canonicalize the NATS endpoint configuration

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Make every Nest NATS client and microservice derive its effective server endpoint from one validated configuration value with no local fallback port or independently reconstructed URL.

Source: `BE-019` in Series `0001`.

## Context

The current configuration defaults `App.natsPort` to `4223`, `main.ts` repeats the same fallback, while `MercurionAIModule` independently falls back to `4222`. Local Docker intentionally maps host `4223` to container `4222`, whereas Kubernetes exposes NATS on service port `4222`; those deployment differences are legitimate, but application code must consume one environment-specific endpoint instead of choosing its own default.

## Relevant files and modules

- `MercurionWebNode/src/config/`
- `MercurionWebNode/src/main.ts`
- `MercurionWebNode/src/app_modules/mercurion-ai/mercurion-ai.module.ts`
- NATS client/module tests
- `MercurionWebNode/env/.env.example`
- Docker/Kubernetes NATS configuration

## In scope

- Define one canonical validated NATS endpoint representation, preferably a URL or typed endpoint object.
- Make bootstrap and every `ClientsModule`/`ClientProxy` registration consume it.
- Remove hard-coded `4222`/`4223` fallback choices from consumers.
- Validate protocol, host and port and reject malformed/partial endpoint configuration.
- Test development/test/staging/production resolution without assuming all environments use the same externally visible port.

## Out of scope

- Do not change Docker/Kubernetes topology merely to make all numeric ports identical.
- Do not redesign NATS subjects/payloads; `0146` owns the typed protocol registry.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Deployment configuration chooses the endpoint; application consumers do not.
- All clients in one application context observe the same effective endpoint.
- An invalid endpoint fails configuration validation rather than falling back silently.

## Requirements

1. Add the canonical endpoint to the config schema established by `0130` and derive it exactly once.
2. Remove direct host/port string assembly and numeric fallbacks from `main.ts` and `MercurionAIModule`.
3. Ensure logs/readiness expose the resolved endpoint without leaking credentials if future NATS auth is added.
4. Add unit tests proving all NATS registrations receive the identical resolved server URL.
5. Add configuration fixtures representing local host-port mapping and in-cluster service-port usage.

## Acceptance criteria

- [ ] No production NATS consumer contains a local default port.
- [ ] Bootstrap and MercurionAI use the same validated endpoint value.
- [ ] Local and Kubernetes configurations can legitimately resolve to different ports through config only.
- [ ] Invalid/missing required endpoint data fails closed.
- [ ] Existing NATS connectivity remains compatible.

## Validation

Run config/NATS module tests, Nest build, full Nest unit/E2E tests and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if an active deployment has an undocumented endpoint topology that cannot be represented without an infrastructure decision.

## Dependencies

- `0130-define-every-nest-configuration-property-once.md` and `0132-fail-closed-on-unknown-app-env-values.md` should be `DONE`.

## Execution notes

### Feature branch
`feature/BE-019`, created from and ancestrally based on
`23779c4cbddc7feaf173e909cd8481581f4c1237`.
### Preflight
Passed before implementation:

- the working tree was clean on `feature/BE-019` at the supplied base SHA;
  `git merge-base --is-ancestor
  23779c4cbddc7feaf173e909cd8481581f4c1237 HEAD` exited `0`, and the
  base-to-HEAD divergence was `0 0`;
- process inventory found no active Angular, Nest, Tox21, Jest watcher, or
  other workspace-consuming process; only the coordinator, its inspection
  shell, VS Code, and the idle Chrome DevTools MCP processes matched the broad
  command-line filter;
- dependencies `0130` and `0132` were confirmed `DONE`;
- exact base-SHA GitHub Actions run
  [34701165993](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34701165993)
  completed successfully with `Quality (ubuntu-latest)`,
  `Quality (windows-latest)`, and `Required gate` green;
- unchanged focused configuration/bootstrap/NATS Jest suites passed:
  `4` suites / `26` tests;
- unchanged Nest TypeScript typecheck passed.
### Preflight remediation
_None._
### Summary
Added a typed canonical `App.natsUrl` configuration value derived once from
the existing deployment-owned `APP_NATS_HOST` and `APP_NATS_PORT` inputs.
The schema now requires a protocol-qualified, port-free `nats://` or `tls://`
host and a port in the valid TCP range. Missing, partial, credential-bearing,
path-bearing, malformed, or out-of-range values fail configuration validation.

Bootstrap and `MercurionAIModule` now use one shared NATS transport-options
factory that reads only `App.natsUrl`; their independent host/port assembly and
`4222`/`4223` consumer fallbacks were removed. Startup logging renders the
resolved endpoint through a credential-redacting formatter.

The existing deployment topology was preserved: local Docker continues to map
host port `4223` to container port `4222`, while the Kubernetes NATS service
continues to expose in-cluster port `4222`. The application selects those
differences only through validated environment configuration; no Docker or
Kubernetes topology was changed.
### Task-specific validation performed
Passed:

- final focused configuration/bootstrap/NATS Jest run:
  `4` suites / `42` tests;
- complete Nest Jest suite: `142` suites / `412` tests;
- complete Nest E2E suite: `1` suite / `1` test;
- `npm run typecheck --workspace mercurion_web_node`;
- `npm run lint --workspace mercurion_web_node` (`0` errors; `48` existing
  warnings);
- `npm run build --workspace mercurion_web_node`;
- `npm run ci:nest:architecture`;
- the git-ignored development environment validated through the canonical
  schema without printing values;
- repository searches confirmed no production `App.natsHost`/
  `App.natsPort` consumer and no production `4222`/`4223` fallback remains;
- `git diff --check`.

Tests cover development, test, staging, and production endpoint resolution,
including the documented local Docker `4223` mapping and Kubernetes `4222`
service port; malformed and partial endpoint data; identical bootstrap and
MercurionAI transport URLs; and credential-safe endpoint logging.
### Full pre-merge CI-parity validation
Local `npm ci` and `npm run ci:check` were intentionally not run per autonomous
policy. Complete clean-install Windows/Linux validation and the stable
`Required gate` remain coordinator-owned on the exact pushed feature SHA.
### Browser validation performed
_Not applicable._
### Commits
- `51e21e8d` - `refactor(config): canonicalize NATS endpoint`
- Task outcome and execution record: this commit.
### Merge / CI
Feature branch is ready for exact-SHA pre-merge GitHub Actions validation;
merge remains coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
