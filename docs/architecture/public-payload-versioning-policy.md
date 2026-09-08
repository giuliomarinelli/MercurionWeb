# Public payload contract versioning policy

Status: approved for SYS-022 on 2026-09-08 by Giulio Marinelli.

This policy governs public wire contracts exposed by MercurionWeb over REST,
GraphQL, and Socket.IO. A contract major is a positive integer describing wire
compatibility; it is independent of npm, release, and build versions. The
canonical machine-readable metadata is exported by
`@mercurion/rest-contracts`; the Socket.IO registry extends that metadata for
its events. No endpoint-by-endpoint version catalogue is maintained.

## Current compatibility

The current major is `1` and the supported inclusive contiguous range is
`{ minimum: 1, maximum: 1 }`. A client selects one major. The server accepts it
only when it belongs to that range. HTTP method, path, query, request and
response body, status, error envelope, event payload, acknowledgement, and
observable semantics all participate in compatibility.

REST keeps the existing `/api/...` paths, which permanently mean major 1 while
that major is supported. A future breaking boundary introduces `/api/v2/...`
only where needed and leaves `/api/...` unchanged. GraphQL remains
`/api/graphql`; the Angular Apollo link sends the canonical
`x-mercurion-contract-major` header. Socket.IO sends numeric `contractMajor` in
the handshake auth object, alongside the existing token.

During rollout, absent REST, GraphQL, or Socket.IO version declarations select
major 1, are classified as `legacy-unversioned`, and produce a safe diagnostic
warning. Invalid present values (non-positive, non-integer, ambiguous, or
repeated) produce `CONTRACT_VERSION_INVALID`. A valid major outside the range
produces `CONTRACT_VERSION_UNSUPPORTED`. REST uses HTTP 400 and the canonical
error envelope; GraphQL uses a GraphQL error with the same code in
`extensions.code`; Socket.IO uses `connect_error` with its `data` envelope and
disconnects.

Responses disclose `currentMajor` and `supportedMajorRange` through the
canonical response headers where the transport permits it. Version errors
include the selected major when available and never include credentials,
tokens, or application data.

## Rollout for already-distributed clients

Rollout is phased and fail-safe; publishing a new build alone never advances a
phase.

1. **Compatibility phase.** Existing `/api/...` URL-and-method pairs continue
   to select major 1. Missing GraphQL headers and Socket.IO handshake fields
   temporarily fall back to major 1 and emit a `299` diagnostic warning. New
   maintained Angular builds must declare major 1 in the Apollo header and
   Socket.IO handshake immediately.
2. **Observation phase.** Operators measure only the transport, selected major,
   known consumer identifier where already available, and warning count. They
   do not log tokens or payloads. The known-consumer register and migration
   documentation are updated from that evidence; an unknown or still-unversioned
   consumer prevents enforcement from advancing.
3. **Migration-complete decision.** Every known maintained client must declare a
   supported major, representative compatibility and negative tests must be
   green, and its owner must acknowledge the migration. Giulio Marinelli or an
   explicitly recorded delegate then approves a version-controlled enforcement
   change. CI success or elapsed time is not approval.
4. **Required-declaration phase.** After that approval, a missing GraphQL header
   or Socket.IO handshake field returns `CONTRACT_VERSION_REQUIRED` through the
   transport-specific error mechanism. The historical REST `/api/...`
   URL-and-method contract remains an explicit major-1 selection while major 1
   is supported; it is never reinterpreted as the current major.

The enforcement change must be independently reversible to the compatibility
phase without changing any payload schema or reinterpreting a REST path. A
rollback restores fallback-plus-warning while consumer evidence is corrected.

## Consumers and disclosure obligations

The repository currently confirms the maintained Angular application as the
only application consumer. No separately owned external consumer is documented.
This absence is not evidence that none exists: discovery of one adds it to the
known-consumer register and blocks removal or required-declaration enforcement
until its owner and guarantees are recorded.

Canonical machine-readable metadata is exported from
`@mercurion/rest-contracts` and extended by `@mercurion/socket-contracts`.
HTTP responses disclose the current major and supported inclusive range through
the canonical response-header names. Documentation and tests consume those same
exports; they must not maintain another numeric version table.

## Evolution and removal

Additive endpoints, operations, events, optional request fields, ignorable
response fields, GraphQL fields, and `@deprecated` metadata are compatible only
when their semantics remain compatible. Removing or renaming a public element,
changing its type, format, meaning, validation, status, error code/envelope,
acknowledgement, or closed enum set is breaking. A structural addition is not
automatically compatible if it changes supported consumer semantics.

Deprecation metadata belongs beside the canonical transport contract and
contains `deprecatedInMajor`, `reason`, `deprecatedAt` (ISO 8601 UTC), optional
`replacement`, `removeNoEarlierThanMajor`, and `approvalAuthority`.
REST and GraphQL return a `299` warning containing the selected deprecated major
and safe reason. Socket.IO accepts the connection and records the equivalent
server diagnostic warning; unsupported majors remain connection errors rather
than deprecation warnings.

Major N remains supported for the entire life of N+1 and cannot be removed
before N+2 is introduced. Removal additionally requires consumer verification,
a documented and tested migration path, and explicit versioned repository
approval by Giulio Marinelli or an explicitly recorded delegate. Time elapsed
or a new build does not authorize removal.

## Future breaking change procedure

1. Obtain explicit human approval and identify the affected transport boundary.
2. Add a new major and canonical metadata while retaining the old major.
3. Expose REST changes in a parallel `/api/vN/...` path; keep `/api/...` as
   major 1. Keep GraphQL at `/api/graphql` and evolve its schema with additive
   fields, `@deprecated`, and the approved removal window. Extend the existing
   Socket.IO registry with the new major and handshake validation.
4. Add migration documentation, representative compatibility and negative
   tests, and consumer verification before rollout.
5. Deprecate the old major with all required metadata; do not silently alter
   its payloads.
6. Remove the old major only after the N+2 rule and explicit approval are met.
   Required declarations may be enabled only through the separately approved
   rollout phase above; the historical `/api/...` path is not reinterpreted as
   another major.
