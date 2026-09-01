# 0014 - Canonicalize fingerprint contract

- [ ] DONE
- [ ] BLOCKED

## Objective

Define browser fingerprint/session-device payloads once in a canonical serializable contract and remove the duplicated Angular/Nest type definitions, with backward/forward compatibility tests.

Source: `SYS-014` in Series `0001`.

## Context

Angular defines fingerprint/session-device structures in `Models/auth/fingerprint.models.ts`; Nest independently defines `ISessionDeviceInfo` in `app_modules/auth/Models/interfaces/i-session.interface.ts` and fingerprint DTOs used at authentication boundaries. The same conceptual payload therefore has multiple handwritten representations.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/auth/fingerprint.models.ts`
- `MercurionWebNg/src/app/Models/auth/fingerprint-raw.models.ts`
- `MercurionWebNg/src/app/services/fingerprint.service.ts`
- `MercurionWebNg/src/app/Models/auth/login.models.ts`
- `MercurionWebNode/src/app_modules/auth/Models/interfaces/i-session.interface.ts`
- `MercurionWebNode/src/app_modules/auth/Models/DTO/fingerprints.dtos.ts`
- `MercurionWebNode/src/app_modules/auth/controllers/authentication.controller.ts`
- `MercurionWebNode/src/app_modules/auth/services/authentication.service.ts`
- canonical contract mechanism

## In scope

- Inventory fingerprint/device information actually serialized across the HTTP boundary.
- Define one canonical versioned serializable schema/type.
- Preserve server-side validation at the boundary.
- Update Angular collection/serialization and Nest consumption to derive from the canonical contract.
- Add compatibility fixtures/tests for previous/current payloads and controlled forward-compatible optional fields.

## Out of scope

- Changing the fingerprinting algorithm/library or security policy.
- Redesigning device trust/MFA decisions.
- Persisted session-storage migration unrelated to the wire payload unless required for compatibility.

## Decisions already made

- Only serializable wire data belongs in the canonical contract.
- Framework/runtime objects do not cross the contract boundary.
- Existing security-sensitive validation must not be weakened.

## Requirements

1. Compare Angular and Nest fingerprint/device shapes field by field.
2. Define a canonical schema/type with explicit optionality and field semantics.
3. Generate/share both consumer types from that source.
4. Keep or generate Nest runtime validation for untrusted browser input.
5. Remove duplicated handwritten wire interfaces.
6. Add fixture-based backward compatibility tests for currently accepted payloads.
7. Add forward compatibility coverage proving optional unknown/new fields follow the chosen documented policy.

## Acceptance criteria

- [ ] One canonical serializable fingerprint/device contract is consumed by both projects.
- [ ] No manually duplicated `ISessionDeviceInfo` contract remains across Angular and Nest.
- [ ] Authentication still validates the payload before trusting it.
- [ ] Backward and forward compatibility tests exist and pass.
- [ ] Angular/Nest builds and auth tests pass.
- [ ] Existing security behaviour not targeted by this task remains compatible.

## Validation

Run relevant auth/fingerprint tests and builds in both projects.

## Browser validation

Using Chrome DevTools MCP through `http://localhost:8888`, exercise a development-safe login/registration step that produces fingerprint/device data if suitable test credentials are intentionally available. Inspect only the local request and confirm the canonical payload shape is accepted. Do not use production credentials.

If such credentials/state are unavailable, automated contract fixtures are sufficient and the browser portion should be recorded as unavailable rather than fabricated.

## Stop conditions

Block if changing the contract would invalidate already persisted session/device records and the migration/compatibility policy is not documented.

## Dependencies

- An approved canonical cross-project contract mechanism from `0001`/related tasks.

## Implementation notes

Keep raw library-specific fingerprint structures separate from the stable public/session contract when they are not transmitted unchanged.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not started / not applicable if fixtures fully establish the boundary contract._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
