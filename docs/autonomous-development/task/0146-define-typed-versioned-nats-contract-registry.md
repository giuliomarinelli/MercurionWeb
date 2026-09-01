# 0146 - Define a typed versioned NATS contract registry

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Replace locally constructed NATS subject strings and request/response assumptions with one versioned contract registry describing subject, request schema, response schema, timeout and error contract for every MercurionAI/RDKit RPC operation.

Source: `BE-032` in Series `0001`.

## Context

`MercurionAIService` currently constructs `inference.tox21.smiles` with environment prefixing and hard-codes a 3000 ms timeout. `RDKitService` independently constructs three `rdkit_api.*` subjects and repeats payload-size/timeout/error mapping. The NATS peer `../MercurionTox21` is a read-only runtime dependency for MercurionWeb autonomous sessions, so the contract must be language-neutral/compatibility-testable rather than requiring edits to that sibling repository.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/mercurion-ai/`
- MercurionAI/RDKit request/response DTOs
- canonical NATS endpoint config from `0133`
- `../MercurionTox21` protocol implementation (read-only inspection/compatibility testing only)
- NATS contract/integration tests

## In scope

- Define one typed registry for every WebNode scientific NATS RPC operation.
- Store base subject/version, request/response schema, timeout policy key and stable error contract together.
- Centralize environment namespace/prefix derivation.
- Prefer language-neutral wire schema artifacts (for example JSON Schema) when sharing a TypeScript type directly with the Python peer is impossible.
- Validate actual requests/responses against the contract at boundaries/tests as appropriate.
- Add compatibility tests that inspect/exercise the read-only Tox21 peer without modifying it.

## Out of scope

- Do not modify `../MercurionTox21`.
- Do not change scientific semantics or model outputs.
- Do not invent a new NATS subject version and silently break the deployed consumer.
- Do not implement circuit/backpressure policy here; `0147` owns scientific runtime policy.

## Decisions already made

- Subject/request/response/error/timeout metadata have one source of truth.
- Wire contracts are versioned explicitly and language-neutral where the peer uses another language.
- Environment prefixing is a registry/config concern, not repeated service logic.
- Compatibility with the existing Tox21 peer must be proven before changing a subject/wire shape.

## Requirements

1. Inventory the current inference and RDKit subjects plus exact request/response/error shapes on both WebNode and the read-only peer.
2. Define a registry entry per operation with stable identifier and wire-contract version.
3. Generate/derive TypeScript request/response typing from the canonical contract where feasible; avoid duplicated handwritten shape declarations.
4. Migrate `MercurionAIService` and `RDKitService` to resolve subjects/contracts from the registry.
5. Add schema/contract tests for valid and malformed request/response payloads and subject construction in each environment.
6. Add a compatibility test against the current Tox21 implementation/fixture so drift is detected without editing the sibling repository.
7. Register NATS contract validation in canonical `ci:check` when deterministic in CI.

## Acceptance criteria

- [ ] No scientific service constructs NATS subjects locally.
- [ ] Every RPC operation has one versioned request/response/error contract.
- [ ] Environment namespace handling is centralized.
- [ ] WebNode and the current Tox21 peer are proven wire-compatible through language-neutral contract tests/fixtures.
- [ ] Contract drift fails CI before deployment.

## Validation

Run NATS registry/schema tests, MercurionAI/RDKit unit tests, available Tox21 compatibility/integration tests, full Nest tests/E2E, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the deployed/read-only Tox21 wire behaviour cannot be determined or contradicts the Series contract and changing the peer would be required. Do not edit the sibling repository from this task.

## Dependencies

- `0133-canonicalize-nats-endpoint-configuration.md` and `0141-enable-full-typescript-strictness-in-nest.md` should be `DONE`.

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
