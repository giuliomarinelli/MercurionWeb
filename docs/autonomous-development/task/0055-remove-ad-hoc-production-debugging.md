# 0055 - Remove ad-hoc production debugging

- [ ] DONE
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

- [ ] Production Angular source contains no `debugger` statement.
- [ ] No ad-hoc production `console.*` call remains outside approved logger infrastructure.
- [ ] Retained diagnostics are leveled and redact sensitive values.
- [ ] Static CI validation blocks reintroduction.
- [ ] Existing error flows remain functionally compatible.
- [ ] Angular tests/build and canonical CI gates pass.

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