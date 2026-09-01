# 0133 - Canonicalize the NATS endpoint configuration

- [ ] DONE
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
