# OAuth provider credential policy

## Ownership and key source

OAuth provider credentials are owned by the OAuth credential boundary in
`MercurionWebNode`. Durable refresh tokens are never returned by that boundary.
The boundary derives a purpose-specific 256-bit key from the deployment-owned
`APP_AES_SECRET` with HKDF-SHA256. The derived key is not persisted and is not
shared with other encryption purposes.

Encrypted values use an authenticated `oauth2:v1` envelope. Provider and owner
scope are AES-GCM additional authenticated data, so a database value cannot be
moved to another provider or owner and still decrypt successfully. Existing
plaintext rows are accepted only by the migration path and are rewritten as a
v1 envelope on their first successful owner-scoped read.

## Rotation and recovery

Envelope versions are immutable. A future key rotation introduces a new
version that writes only the new key while temporarily retaining read support
for the immediately previous version. Existing rows are re-encrypted through
the credential boundary, audited by envelope version, and the old key is
retired only after no old envelopes remain and the deployment rollback window
has expired. Keys are supplied and recovered through the deployment secret
store; they must never be committed, logged, copied into task metadata or
reconstructed from database contents.

Loss of every key capable of reading an extant envelope is not recoverable from
the application database. The safe recovery action is to delete the affected
local credential and require the owner to reconnect the provider. Restoring a
deployment secret from its authorized secret-store backup is an operational
action outside application runtime.

## Token lifecycle

- Credential identity is the normalized provider plus either an authenticated
  owner UUID or the explicit application-wide scope.
- Access tokens are cached only under the canonical owner/provider Redis key
  and never beyond the positive provider-reported expiry.
- A rotated refresh token is durably encrypted before its associated access
  token is published to Redis.
- Disconnect attempts provider revocation when the provider configuration
  declares it, then deletes Redis and database state idempotently even if the
  remote revocation fails.
- Token values, provider response bodies and Authorization headers are never
  interpolated into application logs or public error messages.

