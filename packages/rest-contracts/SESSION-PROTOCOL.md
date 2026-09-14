# Session protocol

`src/session-protocol.ts` is the single framework-neutral source of truth for
browser and server session semantics.

## Current transport inventory

| Transport | Inputs | Canonical output |
| --- | --- | --- |
| REST/cookies | signed `__node_session_id`, device cookie, access token | HTTP application-error code maps through `sessionInvalidationCauseForApplicationError` |
| Socket.IO handshake | cookie pair and `ws_accessToken` | `so.pub.session_init` acknowledgement for `authenticated`; typed invalidation payload for an invalid session |
| Socket.IO keyspace notification | Redis session expiration/deletion | `sv.pub.session_expired` with `state: "invalid"` and a typed cause |

Cookies and tokens are credentials, not proof of validity. Nest remains the
authority that validates them.

## State machine

The finite validity states are `public`, `authenticating`, `authenticated`, and
`invalid`. Connection state (`connected`, `disconnected`, or
`reconnect-required`) is deliberately independent: a public Socket.IO
connection does not make a session authenticated.

* Initial load is `public`; persisted browser markers begin
  `begin-authentication` and require server validation.
* Successful REST login/refresh or authenticated Socket.IO initialization uses
  `authentication-succeeded`/`credentials-refreshed` and reaches
  `authenticated`.
* Expiration, revocation, invalid signatures, invalid credentials, and invalid
  server session records enter `invalid` with the matching typed cause.
* `reconnect-required` preserves validity while requesting a new transport
  connection; an authenticated reconnect re-runs the server handshake.
* Logout always transitions to `public` and reconnects the socket without
  credentials.

No transport is permitted to infer a terminal validity transition from a
message string.
