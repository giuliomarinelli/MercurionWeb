# 0136 - Make proxy, CORS and rate-limit trust policy environment explicit

- [ ] DONE
- [x] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
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
`feature/BE-022` at base SHA `9a1a7a8d97535c184df7471bab004934250e5624`.
The working tree was clean, the branch identity matched the requested Source,
and no remote `feature/BE-022` ref existed before this diagnostic commit.
### Preflight
Passed unchanged-task preflight:

- `git status --porcelain=v1` was empty;
- `git rev-parse HEAD` matched the supplied base SHA;
- dependencies `0130`, `0132`, and `0134` were checked `DONE`;
- no task-owned Nest, Angular, Tox21, Jest, or workspace watcher was active;
- exact-base GitHub Actions CI run
  [34705560688](https://github.com/giuliomarinelli/MercurionWeb/actions/runs/34705560688)
  for `9a1a7a8d97535c184df7471bab004934250e5624` completed successfully;
- local `commit.gpgSign` was `false`.
### Preflight remediation
None.
### Summary
Blocked before implementation because the production trusted-proxy chain and
production/staging origin contract are not recoverable from approved repository
configuration. The task explicitly forbids guessing these security boundaries.
`docker_sl/nginx_dev/nginx.prod.conf` documents that production is behind
Cloudflare and forwards `X-Real-IP`/`X-Forwarded-For`, but declares neither
Cloudflare source CIDRs nor an approved proxy hop count/trust boundary.
`k8s/beta/nginx-edge-config.yaml` likewise forwards those headers without a
Cloudflare real-IP/trusted-source policy. The only checked-in environment
example is the development configuration with `APP_CORS_ORIGINS=[]`; no
staging/production origin allowlist or authoritative production environment
policy is present. Implementing `trustProxy`, origin validation, or effective
client-IP handling would therefore require inventing undocumented production
security policy.
### Task-specific validation performed
Not run; no implementation was made.
### Full pre-merge CI-parity validation
Not run; local `npm ci` and `npm run ci:check` were intentionally not run.
### Browser validation performed
Not applicable; the stop condition was established before implementation and
browser validation.
### Commits
Pending diagnostic commit.
### Merge / CI
Not applicable.
### Rollback
Not applicable.
### Blocker / human decision required
Human/security authority must provide and approve the production/staging
trusted-proxy boundary (Cloudflare CIDRs and/or exact hop policy) and canonical
allowed origins, including whether the beta Kubernetes edge is an approved
proxy boundary. No code change is safe until that contract is documented.
