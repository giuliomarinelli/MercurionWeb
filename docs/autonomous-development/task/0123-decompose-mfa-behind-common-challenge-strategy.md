# 0123 - Decompose MFA behind a common challenge strategy contract

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace the 858-line `MfaService` with separate challenge issuance, delivery, verification, enable/disable and backup-code services coordinated through a typed MFA strategy contract shared by supported MFA methods.

Source: `BE-009` in Series `0001`.

## Context

`MfaService` currently injects repository/DataSource, password/security/User, SMS/Mail, Config, JwtTools, Session, Redis, audit and logging dependencies, while owning attempt/send/backup-code policies and multiple MFA contexts. The Series records 31 methods and 13 dependencies. `0122` creates typed authentication handlers; this task supplies them with a narrow MFA application/domain API. Atomic attempt/rate-limit policy is later centralized by `DATA-007`, so current limits must be preserved behind a replaceable policy seam rather than reimplemented inconsistently.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/auth/services/mfa.service.ts`
- MFA DTOs/enums/interfaces under `auth/Models/`
- backup-code entity/repository usage
- notification SMS/Mail ports
- JWT/session/user/security ports
- MFA/authentication specs

## In scope

- Define one common MFA strategy/challenge contract for supported methods (email OTP, SMS OTP, authenticator/TOTP and backup-code paths where applicable).
- Split challenge issuance from delivery and verification.
- Separate enrollment/enable, disable/inactivation and backup-code management from login challenge verification.
- Keep persistence of backup codes behind an MFA-owned repository/port rather than exposing TypeORM to callers.
- Preserve current attempt/send/lock thresholds behind a single policy interface that `DATA-007` can replace atomically later.
- Provide typed challenge identifiers/context/results instead of transport-specific exceptions as control flow where feasible within current error contract.
- Remove the monolithic service after callers migrate.

## Out of scope

- Do not change MFA factors offered to users or challenge security requirements.
- Do not change OTP algorithms, token TTLs, backup-code format or encryption policy unless required by an already approved security contract.
- Do not implement the final Redis atomic rate-limit engine owned by `DATA-007`.
- Do not move mail/SMS delivery to outbox yet.

## Decisions already made

- MFA methods implement a common application strategy contract but keep factor-specific validation/delivery details isolated.
- Challenge issuance, delivery and verification are different responsibilities.
- Enrollment/inactivation and backup-code lifecycle are separate from login challenge verification.
- Authentication flows consume an MFA port; they do not know repositories or notification implementation details.

## Requirements

1. Inventory every public MFA method and caller, mapping it to challenge, delivery, verification, enrollment, inactivation or backup-code responsibility.
2. Define discriminated challenge/input/result types that make strategy/context exhaustive.
3. Extract factor-specific strategies/adapters and shared policy primitives without duplicating lock/send logic.
4. Move backup-code persistence behind an explicit repository port.
5. Ensure each strategy can be unit-tested with fake delivery/persistence/token dependencies.
6. Preserve current rate-limit/lock semantics and audit events.
7. Migrate auth/account callers and remove `MfaService` when no production reference remains.

## Acceptance criteria

- [ ] No 800-line multi-responsibility MFA service remains.
- [ ] Challenge issuance, delivery, verification, enable/disable and backup-code ownership are distinct.
- [ ] Supported MFA methods conform to one typed strategy/challenge contract.
- [ ] Authentication/account handlers depend on a narrow MFA API.
- [ ] Existing MFA security outcomes, attempt limits and factor behaviour remain compatible.
- [ ] Table-driven tests cover every factor/context and error branch.

## Validation

Run MFA strategy/backup-code/auth handler tests, relevant auth E2E flows, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable as a required gate.

## Stop conditions

Mark `BLOCKED` if an MFA factor has undocumented issuance/verification semantics whose preservation cannot be established safely from code/tests/current contracts.

## Dependencies

- `0122-split-authentication-flows-into-typed-command-handlers.md` must be `DONE`.
- Repository boundaries from `0120` must be `DONE`.

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
