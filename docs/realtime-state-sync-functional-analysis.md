# Realtime state synchronization — Functional analysis

**Status:** pre-implementation functional analysis  
**Reference branch:** `feature/6abfc9a4c1919d7ad547b3e9-notifications`  
**Reference Trello card:** `6abfc9a4c1919d7ad547b3e9`  
**Date:** 2026-10-03

---

## 1. Goal

Mercurion already has durable in-app notifications. This document covers the other realtime plane:

> when authoritative application state changes in one client, other active clients that are currently displaying the affected read model should be told that their local state is stale and should refetch it.

The realtime message is **not authoritative state**. It is a best-effort invalidation hint.

The producer does not care whether another client is currently on the relevant page. It emits after the mutation commits. If an interested consumer is mounted, that consumer reacts. Otherwise the event is allowed to disappear.

---

## 2. Core semantics

### 2.1 Source of truth

PostgreSQL / the normal REST or GraphQL query remains authoritative.

Socket.IO never becomes a second data API.

A realtime event means:

> one or more read models may now be stale.

It does not mean:

> apply this object patch as authoritative state.

### 2.2 Delivery guarantee

State invalidations are:

- ephemeral;
- best effort;
- fire-and-forget;
- not persisted in the transactional outbox;
- not acknowledged by application-level ACKs;
- safe to lose.

If the event is missed, opening/reloading the page still reads the current authoritative state.

### 2.3 Commit ordering

Invalidation must happen only after the domain transaction has committed.

Conceptually:

```text
domain mutation
    ↓
DB COMMIT
    ↓
afterTransactionCommit(...)
    ↓
best-effort realtime invalidation
```

Do not emit before commit.

### 2.4 Origin client exclusion

State-sync events are different from notifications: the client that produced the mutation must not receive the remote invalidation.

The routing model is:

```text
ws_user:<userId>
EXCEPT
ws_client:<clientInstanceId>
```

The client-instance identity is application-instance scoped, not session scoped.

Mercurion uses a dedicated in-memory `clientInstanceId` generated once per Angular application instance. The same value is used by HTTP/GraphQL requests and by the Socket.IO handshake, so it remains stable across Socket.IO reconnects.

It is intentionally **not persisted in sessionStorage**. Browser tab duplication can clone sessionStorage in some environments; reusing a persisted `tabId` could therefore cause two tabs to share one exclusion room and both miss an invalidation. A full page reload creates a new client instance, which is acceptable because the previous socket instance is being replaced and the page will load authoritative state again.

Existing rooms retain their current responsibilities:

```text
ws_user:<userId>             all realtime clients belonging to the user
ws_session:<sessionId>       authentication/session lifecycle
ws_client:<clientInstanceId> one concrete application instance/tab
```

`sessionId` must not be used for origin exclusion because multiple tabs can share one authenticated session and the sibling tabs must still receive the invalidation.

### 2.5 Local client behavior

The origin client remains responsible for updating itself from the mutation result and/or publishing the existing local `DomainInvalidationService` event.

Therefore:

```text
origin client:
mutation response -> local state/local DomainInvalidationService

other clients:
Socket.IO invalidation -> DomainInvalidationService -> refetch
```

The remote event should eventually feed the same Angular semantic invalidation layer rather than create a parallel refresh mechanism.

---

## 3. Recipient model

Most mutations affect only resources owned by one authenticated user. Their recipient set is:

```text
affected user = owner
origin client = excluded
all other clients of owner = recipients
```

Help/ticket mutations are different because they affect multiple users.

For ticket state:

- the ticket owner is affected;
- all users currently authorized to handle support tickets are affected;
- `HandleTickets` is the relevant support authorization for state sync;
- `ViewUsers` is presentation visibility and is **not** required merely to receive a ticket invalidation.

The support-notification rule added previously remains separate: the persistent notification sent to support was intentionally constrained to `ViewUsers + HandleTickets`. Realtime state sync follows the actual Help authorization model and therefore uses `HandleTickets`.

When the actor belongs to the recipient set, only that actor's origin `clientInstanceId` is excluded. Their other devices/tabs still receive the invalidation.

---

## 4. Recommended target invalidation vocabulary

The current Angular `DomainInvalidationService` is already the right consumer seam, but its current union grew from local UI use cases and contains some producer/consumer-specific names such as:

- `dashboard/profile-changed`;
- `molecule/collections-bound`;
- `molecule-collection/molecules-added`;
- ticket `scope: User | Support`.

For cross-client synchronization the stable semantic should describe **which read model became stale**, not which UI action produced it.

A minimal target vocabulary is:

```ts
type DomainInvalidation =
  | { domain: 'molecule'; action: 'changed'; resourceId?: string }
  | { domain: 'molecule-collection'; action: 'changed'; resourceId?: string }
  | { domain: 'profile'; action: 'changed' }
  | { domain: 'account-security'; action: 'changed' }
  | { domain: 'sessions'; action: 'changed' }
  | { domain: 'ticket'; action: 'changed'; resourceId?: string }
  | { domain: 'history'; action: 'changed' }
```

A missing `resourceId` means a domain-level invalidation when the mutation affects an unknown/large set of aggregates.

The implementation may preserve current local action names temporarily, but the wire contract should avoid encoding Angular-specific refresh language.

---

# 5. Active application inventory

Only currently reachable application read models are in the immediate implementation scope.

The active Angular router currently exposes:

- dashboard/profile;
- molecule detail;
- molecule editor;
- all user molecules;
- molecule collections list;
- molecule collection detail;
- settings;
- help;
- notifications;
- feedback;
- auth/account flows.

Lab notebook and synthesis backend domains exist but are not currently active routes. They are recorded later as deferred domains.

Notifications are excluded from this document because their durable recovery/reconciliation system is already implemented separately.

---

# 6. Molecule domain

## 6.1 Molecule lifecycle

### Create molecule item

Backend mutation:

```text
createMoleculeItem
```

Also occurs indirectly when custom/ChEMBL molecules are added through collection workflows.

Publish:

```text
molecule changed <new molecule id>
```

Affected consumers:

- `/molecules` all-my-molecules list;
- dashboard metrics/composition;
- any read model that enumerates the user's molecule inventory.

If creation simultaneously binds the molecule to a collection, also invalidate that collection.

### Update molecule

Backend mutation:

```text
updateMoleculeItem
```

Frontend variants currently include:

- label;
- notes;
- custom molecule name;
- canonical SMILES / molecular properties;
- molecule editor save.

Publish:

```text
molecule changed <molecule id>
```

Affected consumers:

- open molecule detail for the same ID;
- all-my-molecules list;
- collection details currently rendering that molecule;
- dashboard if its molecule-derived metrics/read models can change.

A collection-detail consumer can ignore the event when the changed molecule is not present in its currently loaded item set.

### Delete molecule

Backend mutation:

```text
deleteMoleculeItem
```

Publish:

```text
molecule changed <molecule id>
molecule-collection changed <affected collection id(s)> OR domain-wide collection invalidation
```

Why both:

- the molecule disappears from the user's molecule inventory/detail;
- deleting the molecule can remove collection joins and therefore changes collection item counts/content.

If collecting the exact affected collection IDs before delete is cheap, prefer targeted collection invalidations. Otherwise a single domain-wide collection invalidation is acceptable for this rare mutation.

Affected consumers:

- molecule detail;
- all-my-molecules;
- collection details;
- collections list if it displays item counts;
- dashboard.

### Mark molecule as touched

Backend mutation:

```text
markMoleculeCollectionItemAsTouched
```

This is implicit activity/history tracking rather than an explicit user data edit.

**Decision for v1:** do not emit cross-client state sync for every touch. It would produce noisy realtime traffic from navigation/read activity.

History consequences are covered separately.

---

# 7. Molecule collection domain

## 7.1 Collection lifecycle

### Create one collection

```text
createMoleculeCollection
```

Publish:

```text
molecule-collection changed <new collection id>
```

Consumers:

- collections list;
- dashboard collection counts.

### Create many collections

```text
createManyMoleculeCollections
```

The public mutation currently returns only a boolean.

Publish:

```text
molecule-collection changed
```

Consumers:

- collections list;
- dashboard.

### Duplicate collection

```text
duplicateCollection
```

Publish:

```text
molecule-collection changed <new collection id>
```

The source collection itself has not changed.

Consumers:

- collections list;
- dashboard.

### Rename/update collection

```text
updateMoleculeCollection
```

Publish:

```text
molecule-collection changed <collection id>
```

Consumers:

- matching collection detail/title;
- collections list;
- dashboard only if it includes metadata derived from collections.

### Delete collection

```text
deleteMoleculeCollection
```

Publish:

```text
molecule-collection changed <collection id>
molecule changed
```

The second invalidation matters because a molecule detail can expose the collections to which the molecule belongs.

Consumers:

- deleted collection detail should refetch and transition to not-found/navigation fallback;
- collections list;
- open molecule details that show membership;
- dashboard.

### Mark collection as touched

```text
markMoleculeCollectionAsTouched
```

Like molecule touch, this is implicit activity tracking.

**Decision for v1:** no cross-client state-sync event merely because the resource was viewed/touched.

---

# 8. Molecule ↔ collection membership

Membership mutations change two read models: the collection's contents and the molecule's collection membership.

## Bind one molecule to many collections

```text
bindManyCollectionsToMolecule
```

Publish:

```text
molecule changed <molecule id>
molecule-collection changed <collection id(s)>
```

When `selectAll` makes the final affected collection set large/implicit, a single domain-wide collection invalidation is preferable to an event storm.

## Add many existing molecules to one collection

```text
addManyMoleculesToCollection
```

Publish:

```text
molecule-collection changed <collection id>
molecule changed <item id(s)> OR molecule domain-wide when selectAll/large set
```

## Remove one molecule from a collection

```text
removeMoleculeFromCollection
removeCustomMoleculeFromCollection
removeChemblMoleculeFromCollection
```

Publish:

```text
molecule-collection changed <collection id>
molecule changed <molecule id>
```

If `deleteCollectionIfEmpty` actually deletes the collection, the same collection invalidation is sufficient: consumers refetch and discover its absence.

## Add custom molecule directly to collection

```text
addCustomMoleculeToCollection
```

Publish:

```text
molecule changed <created/resolved molecule id>
molecule-collection changed <collection id>
```

## Add ChEMBL molecule directly to collection

```text
addChemblMoleculeToCollection
addManyChemblItemsToCollection
```

Publish:

```text
molecule changed <created/resolved molecule id(s)> or domain-wide molecule invalidation
molecule-collection changed <collection id>
```

---

# 9. Molecule consumers

## AllMyMoleculesPage

Current state:

- already consumes one local `molecule-collection/molecules-added` invalidation;
- does not comprehensively consume molecule create/update/delete.

Target:

```text
molecule changed
    -> reset/refetch list
```

## MoleculeDetail

Target:

```text
molecule changed with matching resourceId
    -> refetch detail

molecule changed without resourceId
    -> refetch current detail
```

For a remote delete, show an explicit explanatory message before navigating away rather than allowing the view to appear/disappear without context.

## MoleculeEditor

The editor is intentionally **not** an automatic refetch consumer for remote molecule changes.

A remote refetch while the user has an unsaved draft could silently overwrite local work. Until an explicit conflict/stale-editor UX is implemented, the safe rule is:

```text
remote molecule change while editing
    -> do not replace the editor draft automatically
```

A later UX pass should surface a contextual “modified in another session” state with an explicit reload/reconcile action. This is a conflict-awareness concern, not collaborative editing.

## MyMoleculeCollectionsPage

Current state:

- reacts to collection created/deleted and molecule-added local events;
- rename/update and several membership variants are not covered uniformly.

Target:

```text
molecule-collection changed
    -> refetch/reset collection list
```

## MoleculeCollectionDetail

Current state:

- reacts to some `molecules-added/items-changed` invalidations.

Target:

```text
molecule-collection changed matching current collection
    -> refetch collection metadata + items as required

molecule changed matching one of currently displayed items
    -> refetch collection items
```

A domain-wide collection invalidation also refreshes the current collection.

## Dashboard

Dashboard profile projection contains molecule/collection-derived counts and activity.

Target consumers:

```text
molecule changed
molecule-collection changed
history changed
profile changed
    -> reload dashboard projection
```

This avoids a producer-specific `dashboard/profile-changed` event.

---

# 10. Profile and account data

## Profile registry

Mutation:

```text
updateProfileRegistry
```

Publish:

```text
profile changed
```

Consumers:

- settings account/profile panels;
- dashboard.

## Email change

Only the successful confirmation step mutates authoritative contact data:

```text
changeEmail_secondStep
```

The first-step OTP request does not produce state sync.

Publish:

```text
profile changed
```

## Phone add/change

Only the successful confirmation step:

```text
changePhoneNumber_secondStep
```

Publish:

```text
profile changed
```

## Phone deletion

Only the successful confirmation step:

```text
deletePhoneNumber_secondStep
```

Publish:

```text
profile changed
```

## Password change/reset

Password itself is not displayed as a read model.

The durable security notification already covers the user-visible event.

**Decision:** no generic state invalidation solely because the password hash changed, unless the existing auth/session policy also changes/revokes sessions. Session lifecycle remains owned by the auth/session realtime path.

---

# 11. Account security state

Settings security currently displays:

- whether MFA is enabled;
- enabled MFA strategies;
- active sessions.

## MFA enable

Only successful second-step completion:

```text
enableMfa_secondStep
```

Publish:

```text
account-security changed
```

## MFA disable

Only successful second-step completion:

```text
disableMfa_secondStep
```

Publish:

```text
account-security changed
```

## Backup-code regeneration

```text
regenerateBackupCodes
```

Publish:

```text
account-security changed
```

## Session activation / login

Any successful transition that activates a new authenticated session changes the active-session read model, including credential login, MFA completion, SSO and local-dummy authentication.

Publish:

```text
sessions changed
```

to the user's already-connected clients. The newly authenticating client is not yet a member of the private user room in the common case, and its request still carries the originating client-instance id.

## Normal logout

Removing the current session also changes the active-session read model.

Publish:

```text
sessions changed
```

to the user's other clients. The logging-out client is excluded through its `ws_client:<clientInstanceId>` room and then proceeds through the normal auth/session teardown.

## Revoke one session

```text
logoutFromSession / RevokeSessionHandler
```

Two different realtime effects exist:

1. the revoked target session continues to be handled by the existing session-expiration/invalidation mechanism;
2. other still-active clients showing the active-session list should refetch it.

Publish:

```text
sessions changed
```

to the user's non-origin clients.

## Revoke all sessions

```text
logoutFromAllSessions
```

Existing auth/session invalidation is authoritative because all sessions are being terminated.

A separate state-sync event is not required for clients that are about to become anonymous.

---

# 12. Settings consumers

## SettingsAccountFacade

Current state:

- loads account/profile/provider once;
- does not react to remote `profile` invalidations.

Target:

```text
profile changed
    -> reload profile/account projection
```

## SettingsSecurityFacade

Current state:

- loads MFA state/strategies/sessions once;
- does not react to remote changes.

Target:

```text
account-security changed
sessions changed
    -> reload security projection
```

The local origin client can keep its current direct updates because it will not receive its own remote event.

---

# 13. Help / ticket domain

Ticket state is multi-user.

Every authoritative ticket mutation should produce:

```text
ticket changed <ticket id>
```

The event payload itself does not need `scope: User | Support`. The recipient routing determines who receives it, and the mounted consumer knows whether it is showing owner or support data.

## Create ticket

```text
createTicket
```

Affected users:

- owner: all other clients;
- all support users with `HandleTickets`: all clients.

## User adds message

```text
addUserMessage
```

Affected users:

- owner other clients;
- all `HandleTickets` support users.

## Support adds message

```text
addSupportMessage
```

Affected users:

- ticket owner;
- all `HandleTickets` support users.

For the acting support user, exclude only the originating `clientInstanceId`; their other clients still receive it.

## Close ticket

```text
closeMyTicket
closeTicketAsSupport
```

Same affected-user set.

## Reopen ticket

```text
reopenTicketAsSupport
```

Same affected-user set.

## Help consumers

### HelpPage

Current local invalidation behavior already reloads ticket lists on ticket changes.

Remote bridge should publish the same semantic event into `DomainInvalidationService`.

### TicketDetailFacade

Current state publishes local invalidation after some own commands but does not consume remote ticket invalidations.

Target:

```text
ticket changed matching current ticketId
    -> reload detail/thread
```

Coalesce rapid repeats to avoid duplicate fetch storms.

---

# 14. History domain

## Delete history

Explicit mutation:

```text
DELETE /history
HistoryService.deleteHistory
```

Publish:

```text
history changed
```

Consumers:

- mounted History component;
- dashboard recent-activity/profile projection.

## Touch/history writes generated by navigation

Molecule/collection `markAsTouched` calls can mutate history simply because the user viewed a resource.

These technically make another client's history stale, but broadcasting every navigation/touch would be noisy.

**v1 decision:** do not propagate passive touch events.

This can be revisited if live cross-device recent-history updates become a product requirement.

---

# 15. Feedback

Current active `/feedback` page only submits a new feedback item and displays a local acknowledgement; it does not render a shared feedback list.

Therefore:

```text
createFeedback
```

does not currently need cross-client state synchronization.

Backend moderation/delete APIs exist, but there is no currently active moderation route/read model in the Angular router.

**Decision:** defer feedback invalidation until a moderation UI is active.

---

# 16. Admin / system settings

`changeLogLevels` changes runtime/logging configuration but there is no currently active user read model that needs to live-refetch from it.

**Decision:** no state-sync event in this phase.

---

# 17. Notifications

Persistent notification state is intentionally excluded from this state-sync protocol.

Notifications already use:

- PostgreSQL authoritative state;
- transactional outbox;
- Socket.IO wake-up;
- REST recovery cursor;
- degraded polling/reconnect reconciliation.

Do not route notification state through the ephemeral domain-invalidation protocol.

---

# 18. Lab notebook — deferred inventory

The backend already exposes mutations for:

- lab notebook create/update/delete;
- chapter create/update/delete/move/reorder;
- section create/update/delete/move/reorder;
- page create/update/delete/move/reorder.

The current Angular router does not expose the notebook page.

When activated, the recommended read model is the **root notebook aggregate**:

```text
notebook changed <notebook id>
```

Child chapter/section/page mutations should invalidate the owning notebook rather than create separate realtime domains for every table/entity.

No implementation in the current phase.

---

# 19. Synthesis — deferred inventory

Backend mutations exist for:

- synthetic route create/update/delete;
- synthetic step create/update/delete;
- step-item add/update/remove;
- synthesis-pool configuration.

There is no active synthesis route in the current Angular router.

When activated, prefer:

```text
synthesis changed <route/synthesis id>
```

and let the mounted synthesis read model refetch the aggregate.

No implementation in the current phase.

---

# 20. Mutations intentionally excluded from v1 propagation

The following should **not** create ephemeral state-sync events in the first implementation:

- OTP/challenge request first steps;
- login/auth handshakes;
- token refresh;
- password change merely for displaying a password state;
- revoke-all where auth/session invalidation already removes every active client;
- molecule/collection passive `markAsTouched`;
- feedback submission with no shared read model;
- logging-level change with no active settings read model;
- notifications, because they have their own durable synchronization protocol;
- backend-only/inactive notebook and synthesis domains.

---

# 21. Mutation → invalidation matrix

| Mutation family | Realtime invalidation | Affected users |
|---|---|---|
| create molecule | `molecule changed <id>` | owner |
| update molecule metadata/structure | `molecule changed <id>` | owner |
| delete molecule | `molecule changed <id>` + collection invalidation | owner |
| create collection | `molecule-collection changed <id>` | owner |
| create many collections | domain-wide `molecule-collection changed` | owner |
| duplicate collection | `molecule-collection changed <newId>` | owner |
| rename collection | `molecule-collection changed <id>` | owner |
| delete collection | collection invalidation + molecule-membership invalidation | owner |
| bind molecule to collections | molecule + affected collection invalidations | owner |
| add molecules to collection | collection + affected molecule invalidations | owner |
| remove molecule from collection | collection + molecule invalidation | owner |
| profile registry update | `profile changed` | owner |
| email confirmed change | `profile changed` | owner |
| phone confirmed add/change | `profile changed` | owner |
| phone confirmed deletion | `profile changed` | owner |
| MFA enabled/disabled | `account-security changed` | owner |
| backup codes regenerated | `account-security changed` | owner |
| session activated/login | `sessions changed` | owner; existing clients receive |
| normal logout | `sessions changed` | owner, excluding origin |
| one session revoked | `sessions changed` | owner, excluding origin; target session separately invalidated |
| create ticket | `ticket changed <id>` | owner + HandleTickets users |
| user ticket reply | `ticket changed <id>` | owner + HandleTickets users |
| support ticket reply | `ticket changed <id>` | owner + HandleTickets users |
| ticket close/reopen | `ticket changed <id>` | owner + HandleTickets users |
| history cleared | `history changed` | owner |

---

# 22. Consumer → invalidation matrix

| Mounted consumer | Events that should trigger refetch |
|---|---|
| AllMyMolecules | any relevant `molecule changed` |
| MoleculeDetail | matching `molecule changed`, or domain-wide molecule invalidation |
| MyMoleculeCollections | any `molecule-collection changed` |
| MoleculeCollectionDetail | matching/domain-wide collection change; molecule change for a currently displayed item |
| Dashboard | profile, molecule, molecule-collection, history |
| SettingsAccount | profile |
| SettingsSecurity | account-security, sessions |
| HelpPage | ticket |
| TicketDetail | matching ticket |
| History component | history |

---

# 23. Reconnect behavior

State invalidations are not replayed.

When a private socket reconnects after a transport gap:

```text
private connection restored
    ↓
publish local "reconcile active read models" signal
    ↓
mounted realtime-aware consumers refetch once
```

This is intentionally different from notification recovery.

No server event history/cursor is required.

A reconnect reconciliation may be represented as a local-only event rather than part of the Socket.IO wire contract.

---

# 24. Coalescing

The correctness requirement is:

> after one or more relevant invalidations, the mounted consumer eventually displays the current authoritative state.

It is **not**:

> one realtime event must produce exactly one HTTP/GraphQL request.

Consumers should be allowed to coalesce/debounce rapid repeated invalidations for the same read model.

---

# 25. Local and remote event convergence

The existing `DomainInvalidationService` should remain the Angular semantic boundary.

Target flow:

```text
LOCAL MUTATION
successful response
    ↓
DomainInvalidationService.publish(...)

REMOTE MUTATION
Socket.IO state invalidation
    ↓
Realtime state-sync bridge
    ↓
DomainInvalidationService.publish(...)
```

Mounted consumers therefore do not need to know whether an invalidation originated locally or from another device.

Because the backend excludes the origin `ws_client` room, a successful local mutation does not cause a duplicate remote echo to the originating tab.

---

# 26. Functional Definition of Done

The state-sync feature is functionally complete when:

- each in-scope authoritative mutation above emits the appropriate invalidation only after commit;
- the originating `clientInstanceId` is excluded;
- sibling tabs sharing the same session still receive the event;
- other devices/sessions belonging to the affected user receive the event;
- Help routes invalidations to all affected users, not only the actor;
- mounted consumers refetch only when the invalidation is relevant;
- irrelevant/unmounted consumers do nothing;
- no authoritative resource DTO travels through Socket.IO;
- no application ACK, event persistence or replay log is introduced;
- repeated invalidations are safe to coalesce;
- private socket reconnect causes active read models to reconcile once;
- the existing durable notification protocol remains separate;
- passive `markAsTouched` traffic is intentionally excluded from v1;
- notebook/synthesis remain documented but deferred until their read models are active.


---

# 27. First implementation status

Implemented on the reference branch:

- dedicated in-memory `clientInstanceId` shared by HTTP/GraphQL and Socket.IO for one Angular application runtime;
- `X-Mercurion-Client-Instance` request header and backend request-context propagation;
- authenticated `ws_client:<clientInstanceId>` room membership;
- typed `sv.pub.state_changed` Socket.IO contract with domain/change/resource metadata only;
- user-room broadcasting with `EXCEPT ws_client:<originClientInstanceId>`;
- best-effort `RealtimeStateSyncService` that never turns a successful mutation into a failure because Socket.IO delivery failed;
- post-commit publication for explicit transactional flows;
- Angular realtime bridge into `DomainInvalidationService`;
- reconnect reconciliation for mounted realtime-aware read models;
- transient global `Sincronizzato` badge for remote state activity;
- explicit explanatory UX before redirect when an open molecule or collection is deleted remotely;
- molecule CRUD/content invalidations;
- collection CRUD and molecule/collection membership invalidations;
- profile/contact invalidations;
- MFA/security invalidations;
- active-session invalidations centralized at the session lifecycle boundary;
- ticket invalidations routed to the owner plus all users with `HandleTickets`;
- explicit history-clear invalidation;
- active consumers for molecule lists/details, collection lists/details, dashboard, settings account/security, Help lists, ticket detail and history.

Deliberately deferred:

- visual diff/highlight of individual list rows/cards;
- per-consumer placement/styling refinements for the `Sincronizzato` badge;
- stale/conflict banner and explicit reload workflow inside MoleculeEditor;
- collaborative editing or merge semantics;
- passive `markAsTouched` propagation;
- notebook/synthesis realtime until those read models are active;
- optimization of support-recipient lookup if the `HandleTickets` population becomes large.

Validation note:

- source and contract hardening tests were added where practical;
- no GitHub Actions run was available for the branch at the time of implementation;
- full npm/typecheck/build/browser validation still has to be executed in a checked-out development workspace.
