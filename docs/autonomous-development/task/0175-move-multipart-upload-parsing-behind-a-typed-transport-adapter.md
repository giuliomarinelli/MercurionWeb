# 0175 - Move multipart upload parsing behind a typed transport adapter

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove raw Fastify/formidable multipart parsing from `DocumentController` and expose a typed, validated upload command whose file stream and metadata have explicit MIME, size and field constraints before reaching the application service.

Source: `DATA-026` in Series `0001`.

## Context

`DocumentController.upload()` currently instantiates Formidable, parses `req.raw`, manually extracts fields/files, validates MIME and size, reads the temporary file completely into a Buffer, normalizes note/isPublic/scope/action, sends HTTP responses directly and unlinks the temp file. Transport parsing, validation, buffering, application command construction and response handling therefore live in one controller method.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/dropbox-object-store/controllers/document.controller.ts`
- document DTOs/enums
- Fastify multipart/bootstrap configuration
- upload validation pipes/interceptors/adapters
- `DropboxObjectStoreService` / document application service
- REST contract tests from `0021`

## In scope

- Introduce a transport-specific multipart adapter/pipe/interceptor for Fastify.
- Define a typed upload DTO/command containing sanitized metadata plus a bounded file stream/file descriptor.
- Centralize allowed MIME types, maximum file size, required file count and metadata limits.
- Reject invalid fields/files using canonical typed HTTP/application errors.
- Stream or otherwise bound file handling so the controller no longer reads arbitrary uploads fully into memory.
- Guarantee temporary resource cleanup on success, validation failure, cancellation and application failure.
- Reduce the controller to transport orchestration and response mapping.
- Add multipart contract/integration tests including malformed and oversized bodies.

## Out of scope

- Do not redesign object-storage/domain boundaries; `0176` owns the storage port and document command split.
- Do not change the approved product MIME/size policy unless the current values are unsafe or contradictory and require a documented decision.
- Do not expose provider-specific Dropbox fields at the HTTP boundary.

## Decisions already made

- Controllers do not parse raw multipart parts manually.
- File-size limits are enforced while receiving/streaming, not only after an entire file has been buffered.
- Upload metadata is validated into a typed command before application logic runs.

## Requirements

1. Capture the current accepted fields (`file`, `note`, `isPublic`, `scope`, `action`) and preserve their intentional semantics.
2. Configure one Fastify-compatible multipart boundary with a single file, 10 MiB current limit unless deliberately changed, and the approved MIME allowlist.
3. Normalize booleans/enums/optional text through DTO validation rather than ad-hoc controller branches.
4. Make file content available as a stream or bounded temporary-file abstraction with an explicit cleanup owner.
5. Ensure aborted connections and parser errors release all temp resources.
6. Return canonical 4xx errors for client validation and preserve typed 5xx/provider errors from the application layer.
7. Add tests for missing file, multiple files, unsupported MIME, over-limit payload, malformed fields, successful upload and cleanup after failure.

## Acceptance criteria

- [ ] `DocumentController` no longer imports/instantiates Formidable or parses `FastifyRequest.raw`.
- [ ] Upload metadata reaches application logic as a validated typed object.
- [ ] File size/MIME/count limits are enforced at the transport boundary.
- [ ] Upload handling does not require unbounded full-file buffering.
- [ ] Temp files/streams are deterministically cleaned on every exit path.
- [ ] REST contract tests cover the multipart boundary.

## Validation

Run document-controller multipart integration tests with Fastify, memory/resource cleanup tests, Nest lint/typecheck/build/tests, REST contract suite and the repository-wide CI-parity gate.

## Browser validation

If document upload is reachable in the current UI, validate a supported upload and a rejected unsupported/oversized fixture through `http://localhost:8888`; otherwise transport integration tests are sufficient.

## Stop conditions

Mark `BLOCKED` if the currently installed Fastify/Nest multipart integration cannot enforce streaming limits without a dependency change that conflicts with repository policy, or if MIME/size product limits require a human decision.

## Dependencies

- `0144` external HTTP adapter is not required for multipart parsing but should remain the canonical outbound HTTP boundary.
- `0021` REST contract suite should be `DONE`.

## Implementation notes

Do not trust only the client-provided MIME string for security-sensitive processing. Preserve extension/content validation at the downstream consumer boundary where needed; this task defines transport admission, not forensic file-type detection.

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