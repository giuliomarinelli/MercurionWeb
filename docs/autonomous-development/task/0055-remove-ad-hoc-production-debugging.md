# 0055 - Remove ad-hoc production debugging

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove production `debugger` statements and ad-hoc `console.*` diagnostics, routing intentionally retained diagnostics through a typed logger with explicit level/environment policy and sensitive-data redaction.

Source: `FE-033` in Series `0001`.

## Context

The audit found production debug output and a concrete `debugger` in `molecule-collection-item.service.ts` inside GraphQL error handling. Ad-hoc console diagnostics are not a stable observability contract and can expose tokens, payloads or internal errors in browser output while making production logging impossible to govern centrally.

## Relevant files and modules

- `MercurionWebNg/src/app/services/graphql/molecule-collection-item.service.ts`
- all production Angular occurrences of `console.*` and `debugger`
- application configuration from `0025`
- existing toast/error handling and any current logging abstraction
- lint/static CI configuration

## In scope

- Inventory production `debugger` and console calls and classify remove vs retained diagnostic intent.
- Remove debugging statements with no product/observability purpose.
- Introduce or normalize a small typed client logger only where structured diagnostics are genuinely required.
- Define environment/level gating and sensitive-field redaction.
- Add lint/static gates rejecting `debugger` and ad-hoc production console calls outside the logger implementation/explicit test tooling.
- Add logger/redaction tests.

## Out of scope

- Backend logging architecture.
- Full telemetry/APM vendor integration.
- Sending browser logs to a remote collector unless already required by repository architecture.
- Replacing user-facing toast/error presentation with logging.

## Decisions already made

- Production application code contains no `debugger`.
- Feature/domain code does not call `console.*` directly for diagnostics.
- Retained diagnostics use levels and redact tokens, credentials, authorization headers, sensitive account data and other security-sensitive payloads.
- Logging failures never break user flows.

## Requirements

1. Search production Angular source for `debugger` and every console method.
2. Remove one-off development diagnostics, including the molecule-item service debugger.
3. For diagnostics that are intentionally valuable, route structured metadata through one logger interface.
4. Define enabled levels per environment/config without treating browser configuration as secret.
5. Add redaction/safe-serialization for common sensitive keys and avoid logging raw HTTP/auth/session payloads.
6. Ensure errors preserve correlation/stable error code where available without exposing private server details.
7. Add ESLint/static rules that fail CI on production `debugger` or direct console usage outside approved logging infrastructure.
8. Add tests proving disabled levels do not emit and redaction removes sensitive fields.

## Acceptance criteria

- [x] Production Angular source contains no `debugger` statement.
- [x] No ad-hoc production `console.*` call remains outside approved logger infrastructure.
- [x] Retained diagnostics are leveled and redact sensitive values.
- [x] Static CI validation blocks reintroduction.
- [x] Existing error flows remain functionally compatible.
- [x] Angular tests/build and canonical CI gates pass.

## Validation

Run repository searches/static lint for `debugger` and console usage, focused logger/redaction tests, then canonical CI-parity validation. Inspect the production build/source mapping policy only as needed to confirm debug statements are absent.

## Browser validation

Through `http://localhost:8888`, exercise one safe error path and verify the browser console contains only the logger output permitted for the current development configuration, with no token/credential/full sensitive payload. Confirm normal error UI still works.

## Stop conditions

Mark `BLOCKED` if a direct console call is relied upon by an undocumented external test/monitoring harness and removal would break that contract. Record the caller and migrate it to an explicit interface rather than preserving hidden dependency indefinitely.

## Dependencies

- `0025-centralize-angular-runtime-build-config.md`

## Implementation notes

Keep the logger small. This task is primarily about removing uncontrolled diagnostics and establishing a safe boundary, not building a complete observability platform.

## Execution notes

### Feature branch
`feature/FE-033`

### Preflight
Passed cleanly (`npm ci` and `npm run ci:check` at base SHA `4e78fc2264d64f55b834c62cbd75f54a397d904a`).

### Preflight remediation
None.

### Summary
Introduced typed `LoggerService` with environment level gating (`debug`, `info`, `warn`, `error`, `off`) and recursive sensitive field redaction (tokens, passwords, secrets, sessions, credentials, JWTs, Bearer headers). Removed all direct console statements and ad-hoc debug output across production Angular code. Added ESLint rules (`no-debugger`, `no-console`) and static policy check script (`check-angular-console-debugger-policy.mjs`) with negative test suite.

### Task-specific validation performed
- Ran console/debugger static policy check script and negative test suite (`node scripts/check-angular-console-debugger-policy.mjs && node scripts/test-angular-console-debugger-policy-negative.mjs`).
- Focused `LoggerService` unit tests (`logger.service.spec.ts`) for level gating, sensitive key redaction, JWT/Bearer redaction, circular object reference handling, error property preservation, and fault tolerance.
- Angular unit test suite (`npm run ci:test:angular` - 250/250 SUCCESS).
- Angular linting (`npm run ci:lint:angular`).
- Workspace typechecking (`npm run ci:typecheck`).

### Full pre-merge CI-parity validation
Passed cleanly (`npm ci` and `npm run ci:check` exited with status 0).

### Browser validation performed
Exercised routes on `http://localhost:8888` (`/password-recovery`, `/login`) using Chrome DevTools MCP. Verified browser console messages contain only permitted vite/websocket status, normal error UI functions correctly, and no tokens or sensitive payloads are leaked.

### Commits
_Pending commit creation._

### Merge / CI
Managed by coordinator.

### Rollback
Not applicable.

### Blocker / human decision required
None.
