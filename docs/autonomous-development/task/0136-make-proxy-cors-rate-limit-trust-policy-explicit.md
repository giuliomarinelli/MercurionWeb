# 0136 - Make proxy, CORS and rate-limit trust policy environment explicit

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
## Objective

Replace unconditional/fail-open transport trust settings with one validated environment policy for trusted proxies, accepted origins and rate-limit infrastructure failure behaviour.

Source: `BE-022` in Series `0001`.

## Context

The current Fastify adapter is created with `trustProxy: true`; bootstrap derives client IP from Cloudflare/request headers and `req.ip`; Redis-backed rate limiting uses `skipOnError: true`. CORS/trusted-origin behaviour is configured separately from these controls. Those choices directly affect IP-based security and abuse controls and must not be implicit or globally permissive.

## Relevant files and modules

- bootstrap/security configurators from `0134`
- `MercurionWebNode/src/main.ts`
- `MercurionWebNode/src/config/rate-limit.config.ts`
- canonical config schema
- nginx/Cloudflare-facing deployment configuration
- transport/security integration tests

## In scope

- Define a typed per-environment transport trust policy for proxy trust, allowed origins and rate-limit failure mode.
- Replace blanket `trustProxy: true` with an explicit Fastify-compatible trusted proxy/hop policy.
- Ensure only trusted proxy chains can influence the effective client IP/security identity.
- Centralize CORS/origin allowlist resolution and validate it at bootstrap.
- Make rate-limit backend failure policy explicit; staging/production must not silently inherit a fail-open default.
- Test spoofed forwarding/Cloudflare headers, trusted/untrusted proxy paths and Redis rate-limit failure.

## Out of scope

- Do not invent production proxy CIDRs/hop counts if they are not recoverable from approved deployment configuration.
- Do not bypass same-origin nginx topology used by local browser testing.
- Do not redesign application-level auth/session policies.
- Do not weaken security controls solely to keep a test green.

## Decisions already made

- Trust is environment configuration, never an unconditional boolean convenience.
- Client-controlled forwarding headers are not authoritative outside an approved proxy chain.
- Origin policy and rate-limit failure mode fail closed where the environment policy requires protection.
- Development/test exceptions, if needed, are explicit and cannot leak into staging/production.

## Requirements

1. Add validated transport-security configuration with explicit values for every supported environment.
2. Configure Fastify `trustProxy` from that policy and prove spoofed forwarded IP data from an untrusted peer is ignored.
3. Define canonical allowed origins and reject invalid/wildcard production combinations unless explicitly approved.
4. Replace the hard-coded `skipOnError: true` with the validated policy and test Redis failure semantics.
5. Ensure the request-context hook consumes the trusted effective IP rather than recreating proxy trust independently.
6. Add table-driven tests across development/test/staging/production plus negative misconfiguration fixtures.
7. Register deterministic security-policy tests in `ci:check` where appropriate.

## Acceptance criteria

- [ ] Production/staging do not use unconditional `trustProxy: true`.
- [ ] Untrusted requests cannot forge the effective client IP through forwarding headers.
- [ ] CORS/origin policy has one validated owner.
- [ ] Rate-limit storage failure follows an explicit environment policy, not a hidden default.
- [ ] Development/test allowances are isolated from production configuration.

## Validation

Run transport/security unit and integration tests, bootstrap tests, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Through `http://localhost:8888`, smoke-test representative same-origin requests and inspect response/network behaviour if local policy changes affect the reverse-proxy path.

## Stop conditions

Mark `BLOCKED` if the production trusted-proxy chain/origin contract is genuinely undocumented and cannot be derived from repository/deployment configuration; do not guess a security boundary.

## Dependencies

- `0130-define-every-nest-configuration-property-once.md`, `0132-fail-closed-on-unknown-app-env-values.md` and `0134-decompose-nest-bootstrap-into-configurators.md` must be `DONE`.

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
_Not applicable / not started._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0130` (BE-016, SKIPPED_DEPENDENCY), `0132` (BE-018, SKIPPED_DEPENDENCY), `0134` (BE-020, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0115 BE-001 SKIPPED_DEPENDENCY -> 0117 BE-003 SKIPPED_DEPENDENCY -> 0130 BE-016 SKIPPED_DEPENDENCY -> 0136 BE-022 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
