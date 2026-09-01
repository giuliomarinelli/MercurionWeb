# 0176 - Separate the object-storage port from document commands

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Refactor Dropbox document handling so provider-specific object storage is hidden behind a typed port, while document upload/download/delete/profile-image commands own authorization, metadata and persistence orchestration through explicit input objects.

Source: `DATA-027` in Series `0001`.

## Context

`DropboxObjectStoreService.uploadFile()` currently accepts roughly ten positional arguments and combines filename sanitization, OAuth token lookup, Dropbox HTTP calls, DocumentEntity creation, database transaction logic, avatar replacement and cleanup. Download/delete likewise combine provider calls with authorization and persistence decisions. This makes Dropbox the application service instead of an infrastructure adapter.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/dropbox-object-store/services/dropbox-object-store.service.ts`
- `DocumentController`
- Document/User entities and repositories
- OAuth2 client/token services
- external HTTP adapter from `0144`
- upload command/transport adapter from `0175`

## In scope

- Define an `ObjectStore`-style application port with typed put/get/delete primitives and provider-neutral object identifiers/metadata.
- Implement Dropbox as an infrastructure adapter using the canonical outbound HTTP client.
- Introduce explicit document command input objects instead of positional argument lists.
- Move owner/public/scope/action authorization and DocumentEntity orchestration into a document application service.
- Keep profile-image replacement as an explicit use case rather than an `action` branch buried in provider code.
- Ensure provider responses are validated and translated into provider-neutral errors/results.
- Add unit contract tests for the storage port and application-command tests using a fake adapter.

## Out of scope

- Do not finalize compensation/reconciliation for cross-system failure here; `0177` owns it.
- Do not implement a second storage provider unless useful as a test fake.
- Do not leak Dropbox paths/tokens into transport DTOs.

## Decisions already made

- Object storage is infrastructure behind an application port.
- Document authorization/persistence belongs to document use cases, not the provider adapter.
- Commands use typed object inputs; a growing positional signature is not acceptable.

## Requirements

1. Inventory current Dropbox responsibilities and classify them as provider I/O, document domain/application logic or transport logic.
2. Define provider-neutral object reference, upload input/result and delete/download operations.
3. Implement Dropbox calls through the shared outbound HTTP adapter from `0144`, including timeout/error normalization.
4. Create a document command service that validates ownership/visibility/scope and persists metadata through the Unit of Work.
5. Model profile-image replacement as a dedicated command that can later participate in compensation/reconciliation.
6. Ensure download authorization occurs before object retrieval and uses owner/public policy consistently.
7. Migrate callers and tests away from the ten-parameter `uploadFile()` API.

## Acceptance criteria

- [ ] Application/document code depends on an object-storage port, not Axios/Dropbox endpoints.
- [ ] Dropbox adapter contains no user/avatar database orchestration.
- [ ] Document commands receive typed input objects and enforce authorization centrally.
- [ ] Provider-specific tokens/paths do not leak into public DTOs.
- [ ] Port and command layers are independently testable.

## Validation

Run object-store adapter contract tests, document application-service tests, upload/download/delete integration tests with provider calls stubbed, Nest lint/typecheck/build/tests and CI parity.

## Browser validation

If documents/avatar update are reachable, validate upload/download/avatar replacement through `http://localhost:8888` using the normal local integration setup.

## Stop conditions

Mark `BLOCKED` if existing public contracts intentionally expose Dropbox-specific identifiers that cannot be removed/versioned without a product/API decision.

## Dependencies

- `0175-move-multipart-upload-parsing-behind-a-typed-transport-adapter.md` should be `DONE`.
- `0144` shared external HTTP adapter and `0152` Unit of Work must be `DONE`.

## Implementation notes

Keep the port deliberately small. It should express object-storage capabilities, not mirror the entire Dropbox API or encode Mercurion document fields.

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
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._