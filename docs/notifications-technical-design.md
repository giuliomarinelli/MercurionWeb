# Notifications & realtime synchronization — Technical design

**Status:** implementation design for development alpha  
**Reference branch:** `feature/6abfc9a4c1919d7ad547b3e9-notifications`  
**Reference Trello card:** `6abfc9a4c1919d7ad547b3e9`  
**Baseline at analysis start:** `develop` and the feature branch were identical at commit `ce0d842e7a0a8e9c62acb444a1ca244fbd4b8277`.  
**Date:** 2026-10-02

---

## 1. Purpose

This document turns the approved functional analysis for Mercurion in-app notifications and same-user cross-session realtime behavior into an implementation design.

The alpha is intentionally correctness-first:

- PostgreSQL is the authoritative notification state.
- Socket.IO is a low-latency wake-up path, not a state store.
- Redis is transport infrastructure, not notification persistence.
- REST is the recovery/reconciliation protocol.
- Polling reuses the same REST recovery protocol when realtime is degraded.
- UI polish is secondary to deterministic state behavior.
- OTPs, MFA challenges, account activation links, password reset links and equivalent secrets are never copied into the in-app notification center.

This design does not introduce TypeORM migrations. The repository already documents that the PostgreSQL schema is externally managed in `docs/database-schema.md`. Database evolution for this feature is therefore schema-first: PostgreSQL DDL is reviewed independently, then TypeORM entity metadata is made to match it.

---

## 2. Existing repository boundaries

The design reuses the following existing boundaries instead of introducing parallel infrastructure.

### Backend

- `MercurionWebNode/src/app_modules/notification/notification.module.ts`
- `MercurionWebNode/src/app_modules/notification/services/in-app-notification.service.ts`
- `MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox.service.ts`
- `MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox-dispatcher.service.ts`
- `MercurionWebNode/src/persistence/outbox/*`
- `MercurionWebNode/src/persistence/transaction-context.ts`
- `MercurionWebNode/src/app_modules/socket-io/socket.io.gateway.ts`
- `MercurionWebNode/src/app_modules/socket-io/guards/ws.guard.ts`

The current Socket.IO gateway already places authenticated connections into:

- `ws_user:<userId>`
- `ws_session:<sessionId>`

and already installs the Socket.IO Redis adapter. Therefore notification fan-out must use the Socket.IO server/rooms and must not add a second Redis Pub/Sub fan-out layer.

### Shared transport contracts

- `packages/rest-contracts/src/*`
- `packages/socket-contracts/src/index.ts`

The repository contract policy requires public REST and Socket.IO payloads to be defined through these canonical packages.

### Frontend

- `MercurionWebNg/src/app/services/in-app-notification.service.ts`
- `MercurionWebNg/src/app/services/socket-io/realtime-socket.service.ts`
- `MercurionWebNg/src/app/services/session-sync.transport.service.ts`
- `MercurionWebNg/src/app/components/common/notification-button/notification-button.component.ts`
- `MercurionWebNg/src/app/services/toast.service.ts`
- `MercurionWebNg/src/app/components/common/toast/toast.component.ts`
- `MercurionWebNg/src/app/route-manifest.ts`
- `MercurionWebNg/src/app/app.routes.ts`

The existing `SessionSync*` services remain authentication/session lifecycle infrastructure. General notification state or arbitrary application-resource synchronization must not be folded into that auth protocol.

---

## 3. Domain invariants

### 3.1 Durable notification state

A user notification is a durable PostgreSQL record.

Its state has three independent dimensions:

- **seen**: whether Mercurion has presented it to the user in a notification surface;
- **read**: whether the user has explicitly consumed/opened it;
- **dismissed**: whether it has been removed from the active notification center.

Canonical state interpretation:

```text
unseen      := seen_at IS NULL
seen        := seen_at IS NOT NULL

unread      := read_at IS NULL
read        := read_at IS NOT NULL

active      := dismissed_at IS NULL
dismissed   := dismissed_at IS NOT NULL
```

A notification can therefore be seen but unread.

### 3.2 Deletion semantics

UI "delete" is a soft dismissal.

The alpha does not expose a physical-delete operation for individual notification rows.

### 3.3 Message snapshot semantics

`title`, `summary` and `body` are persisted snapshots.

Historic notifications must not silently change because a template or translation changes later.

### 3.4 Semantic types

Notification types describe domain events, not delivery templates.

Examples:

- `security.password_changed`
- `account.email_changed`
- `account.phone_changed`
- `support.reply_received`

Do not use email template names as notification types.

### 3.5 Sensitive flows excluded

The following are transport/challenge messages, not notification-center entries:

- account activation links;
- email verification OTPs;
- phone verification OTPs;
- forgotten-password/reset links;
- MFA login codes;
- MFA enable/disable codes;
- recovery secrets.

Successful security state changes may create informational notifications, but their secrets must not.

---

## 4. PostgreSQL design

### 4.1 Why a DB-owned revision exists

Recovery must not depend only on `updated_at`.

Two updates can share the same millisecond, and the same row can be updated more than once before a client recovers. A timestamp-only cursor can therefore create ambiguous ordering.

The notification table uses a database-owned monotonically increasing `revision`. Every insert or update receives a new revision from a PostgreSQL sequence.

A separate `created_revision` records the revision assigned on insert and never changes.

This allows the recovery protocol to answer both questions deterministically:

1. which notification rows changed after cursor N;
2. whether a returned row was created after cursor N or merely updated.

### 4.2 Proposed table

Canonical table name:

```text
user_notifications
```

Proposed columns:

| Column | PostgreSQL type | Null | Purpose |
|---|---|---:|---|
| `id` | `uuid` | no | Notification identifier |
| `recipient_user_id` | `uuid` | no | Owning user |
| `type` | `varchar(120)` | no | Semantic notification type |
| `version` | `integer` | no | Semantic payload version |
| `category` | `varchar(60)` | no | Presentation/policy category |
| `title` | `varchar(180)` | no | Persisted display title |
| `summary` | `varchar(400)` | no | Compact preview |
| `body` | `text` | no | Full persisted message |
| `payload` | `jsonb` | no | Machine-readable semantic metadata |
| `resource_type` | `varchar(100)` | yes | Optional frontend-resolvable target type |
| `resource_id` | `varchar(180)` | yes | Optional generic resource identifier |
| `created_at` | `bigint` | no | UTC epoch ms |
| `updated_at` | `bigint` | no | UTC epoch ms |
| `seen_at` | `bigint` | yes | UTC epoch ms |
| `read_at` | `bigint` | yes | UTC epoch ms |
| `dismissed_at` | `bigint` | yes | UTC epoch ms |
| `revision` | `bigint` | no | Latest global notification mutation revision |
| `created_revision` | `bigint` | no | Insert revision |
| `dedupe_key` | `varchar(255)` | no | Stable idempotency key |

`resource_id` is intentionally not a UUID column. Mercurion resource identifiers are not guaranteed to all use the same physical identifier type.

### 4.3 Proposed DDL shape

The final deployment SQL should be reviewed separately, but the intended schema is:

```sql
CREATE SEQUENCE user_notifications_revision_seq AS BIGINT;

CREATE TABLE user_notifications (
    id UUID PRIMARY KEY DEFAULT uuidv7(),
    recipient_user_id UUID NOT NULL,

    type VARCHAR(120) NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    category VARCHAR(60) NOT NULL,

    title VARCHAR(180) NOT NULL,
    summary VARCHAR(400) NOT NULL,
    body TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,

    resource_type VARCHAR(100),
    resource_id VARCHAR(180),

    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,

    seen_at BIGINT,
    read_at BIGINT,
    dismissed_at BIGINT,

    revision BIGINT NOT NULL,
    created_revision BIGINT NOT NULL,

    dedupe_key VARCHAR(255) NOT NULL,

    CONSTRAINT fk_user_notifications_recipient
        FOREIGN KEY (recipient_user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT uq_user_notifications_dedupe
        UNIQUE (dedupe_key)
);

CREATE INDEX idx_user_notifications_recovery
    ON user_notifications (recipient_user_id, revision);

CREATE INDEX idx_user_notifications_active_recent
    ON user_notifications (recipient_user_id, created_at DESC, id DESC)
    WHERE dismissed_at IS NULL;

CREATE INDEX idx_user_notifications_active_unread
    ON user_notifications (recipient_user_id, created_at DESC, id DESC)
    WHERE dismissed_at IS NULL
      AND read_at IS NULL;

CREATE INDEX idx_user_notifications_active_unseen
    ON user_notifications (recipient_user_id, created_at DESC, id DESC)
    WHERE dismissed_at IS NULL
      AND seen_at IS NULL;
```

A `BEFORE INSERT OR UPDATE` trigger should:

- assign `revision = nextval('user_notifications_revision_seq')`;
- set `created_revision = revision` on insert only;
- set `created_at` on insert;
- set `updated_at` on every insert/update.

The trigger is preferred over application-owned revision assignment because the schema is shared by more than one producer and PostgreSQL is the source of ordering truth.

### 4.4 TypeORM entity

Create:

```text
MercurionWebNode/src/app_modules/notification/models/entities/user-notification.entity.ts
```

The entity mirrors the schema and does not attempt schema creation or migration.

Do not add `@BeforeInsert` revision logic. Revision ownership belongs to PostgreSQL.

Register the entity in `NotificationModule` through `TypeOrmModule.forFeature(...)`.

---

## 5. Backend domain model

### 5.1 Notification catalog

Create an internal semantic catalog, for example:

```text
MercurionWebNode/src/app_modules/notification/models/in-app-notification-catalog.ts
```

Responsibilities:

- declare supported semantic notification types;
- declare version per type;
- map a domain event/context to persisted `title`, `summary`, `body`, category and payload;
- declare whether a notification can have a resource target;
- keep secrets out of persisted content.

The catalog is an application/domain concern and is not the same thing as the email template registry.

Initial alpha types:

```text
security.password_changed
support.reply_received
```

Recommended next types after the alpha:

```text
account.email_changed
account.phone_changed
account.phone_deleted
support.ticket_opened
```

### 5.2 Repository

Create:

```text
MercurionWebNode/src/app_modules/notification/repositories/user-notification.repository.ts
```

Responsibilities:

- insert with dedupe protection;
- load one notification for a recipient;
- list active notifications by descending `created_at, id`;
- count active unread;
- count active unseen;
- read changes by `revision > cursor`;
- mark one read/unread;
- mark active notifications read through a recovery cursor;
- mark unseen notifications seen through a recovery cursor;
- dismiss one;
- dismiss active notifications through a recovery cursor.

Every mutation must scope by `recipient_user_id`. A notification ID alone never authorizes access.

### 5.3 InAppNotificationService

Populate the existing:

```text
MercurionWebNode/src/app_modules/notification/services/in-app-notification.service.ts
```

Suggested public application API:

```ts
create(context, input): Promise<UserNotification>

recover(userId, cursor?, limit?): Promise<NotificationRecoveryResponse>

list(userId, query): Promise<NotificationPageResponse>

get(userId, notificationId): Promise<NotificationDTO>

setRead(userId, notificationId, read): Promise<void>

markAllReadThrough(userId, cursor): Promise<void>

markSeenThrough(userId, cursor): Promise<void>

dismiss(userId, notificationId): Promise<void>

dismissAllThrough(userId, cursor): Promise<void>
```

Creation must support the current transaction context. The durable notification row and its realtime-outbox intent must be written in the same transaction as the domain state change whenever the originating use case already has a transaction.

### 5.4 Dedupe

A notification producer supplies a stable semantic dedupe key.

Examples:

```text
security.password_changed:<security-audit-event-id>
support.reply_received:<help-message-id>:<recipient-user-id>
```

Do not derive dedupe only from current time.

Repeated delivery/retry of the same domain event must resolve to one notification row.

---

## 6. Notification realtime delivery

### 6.1 RealtimePublisher

Create a small adapter, for example:

```text
MercurionWebNode/src/app_modules/socket-io/realtime-publisher.service.ts
```

Responsibilities:

```ts
emitToUser(userId, eventName, payload): void
emitToSession(sessionId, eventName, payload): void
```

The publisher uses the Socket.IO server already owned by the gateway.

It must not publish the same event into a custom Redis Pub/Sub channel. The existing Socket.IO Redis adapter already provides cross-node fan-out.

The gateway should expose/set the initialized typed Socket.IO server into this adapter during `afterInit`, instead of notification-domain services directly depending on the gateway class.

### 6.2 Durable wake-up through the transactional outbox

Any durable notification state mutation that must wake other clients should enqueue one versioned outbox intent in the same transaction.

Recommended internal outbox event:

```text
NotificationStateChanged
```

Payload can remain deliberately small:

```ts
{
  recipientUserId: string
}
```

Optional diagnostic fields may include the notification ID and mutation kind, but clients must not rely on those fields as authoritative state.

The outbox consumer invokes:

```text
RealtimePublisher.emitToUser(...)
```

The socket event is therefore retryable at the server-side outbox boundary. Duplicate socket wake-ups are harmless because the client reconciles from PostgreSQL.

### 6.3 Socket.IO public contract

Extend `packages/socket-contracts/src/index.ts`.

Recommended event:

```text
sv.pub.notification_changed
```

Payload:

```ts
export interface SocketNotificationChangedPayload {
  readonly kind: 'notification-state-changed'
}
```

The event means only:

> authoritative notification state for the authenticated user may have changed; run recovery.

It does not carry authoritative notification content.

This event must be registered in `socketEventRegistry`; literal boundary strings elsewhere will fail the existing socket-event policy.

---

## 7. REST contracts

### 7.1 Canonical package

Create:

```text
packages/rest-contracts/src/notifications.ts
```

and export it from:

```text
packages/rest-contracts/src/index.ts
```

Avoid exposing notification `type` and `category` as closed public enums unless the project is prepared to treat every added value as a public-contract compatibility change.

For the wire contract, keep them as strings and provide tolerant frontend fallbacks.

### 7.2 DTOs

Recommended shapes:

```ts
export type NotificationSyncCursor = string

export interface UserNotificationDTO {
  id: string
  type: string
  version: number
  category: string

  title: string
  summary: string
  body: string
  payload: Record<string, unknown>

  resourceType: string | null
  resourceId: string | null

  createdAt: UtcInstant
  updatedAt: UtcInstant
  seenAt: UtcInstant | null
  readAt: UtcInstant | null
  dismissedAt: UtcInstant | null
}

export type NotificationChangeKind =
  | 'created'
  | 'updated'
  | 'dismissed'

export interface NotificationChangeDTO {
  kind: NotificationChangeKind
  notification: UserNotificationDTO
}

export interface NotificationRecoveryResponse {
  cursor: NotificationSyncCursor
  snapshotAt: UtcInstant
  unreadCount: number
  unseenCount: number
  changes: NotificationChangeDTO[]
  hasMore: boolean
}

export interface NotificationPageResponse {
  items: UserNotificationDTO[]
  nextCursor: string | null
}

export interface SetNotificationReadRequest {
  read: boolean
}

export interface NotificationBulkThroughRequest {
  throughCursor: NotificationSyncCursor
}
```

The sync cursor is intentionally opaque on the wire even if alpha internally encodes one PostgreSQL revision.

### 7.3 Recovery semantics

Endpoint:

```text
GET /api/notifications/recovery
GET /api/notifications/recovery?cursor=<opaque>
```

No cursor means **establish a baseline**, not "download all historic changes".

Initial response:

- calculate the current notification revision high-watermark;
- return authoritative unread/unseen counts;
- return `changes: []`;
- return the cursor for that high-watermark.

Subsequent recovery:

- decode the cursor to revision N;
- query rows for the recipient where `revision > N`;
- order by `revision ASC`;
- return a bounded batch;
- return a cursor representing the highest returned revision;
- set `hasMore` when more rows exist.

If there are no changes, return the current cursor unchanged and current authoritative counts.

For a row returned after cursor N:

- if `dismissed_at IS NOT NULL`, classify `dismissed`;
- else if `created_revision > N`, classify `created`;
- otherwise classify `updated`.

A client may receive only the final current state of a row when several intermediate updates occurred while it was offline. This is intentional: recovery reconstructs current authoritative state, not an event history.

### 7.4 Listing and detail

Recommended routes:

```text
GET /api/notifications
GET /api/notifications/:notificationId
```

List query parameters:

```text
cursor=<pagination cursor>
limit=<bounded page size>
state=all|unread
```

Default behavior:

- only `dismissed_at IS NULL`;
- newest first;
- cursor pagination over `created_at DESC, id DESC`;
- no offset pagination.

The detail endpoint must return 404 for a notification not owned by the authenticated user.

### 7.5 Mutations

Recommended routes:

```text
PATCH  /api/notifications/:notificationId/read
PATCH  /api/notifications/read-all
PATCH  /api/notifications/seen-all
DELETE /api/notifications/:notificationId
DELETE /api/notifications
```

Bodies:

```text
PATCH /:id/read
{ "read": true | false }

PATCH /read-all
{ "throughCursor": "..." }

PATCH /seen-all
{ "throughCursor": "..." }

DELETE /
{ "throughCursor": "..." }
```

Bulk operations use the recovery high-watermark supplied by the client. This prevents a "mark all" click from racing and accidentally modifying a notification created after the user's visible snapshot.

Mutation responses may be `204 No Content`. The Angular client performs recovery from its previous cursor after a successful mutation.

Do not advance the client's global recovery cursor from a mutation response unless that response also contains every notification change through that cursor; otherwise concurrent changes could be skipped.

### 7.6 Controller

Create:

```text
MercurionWebNode/src/app_modules/notification/controllers/in-app-notification.controller.ts
```

Controller prefix:

```ts
@Controller('notifications')
```

All routes are authenticated.

Controller responsibilities are limited to:

- authenticated user extraction;
- parameter/body validation;
- REST DTO mapping;
- HTTP status semantics.

Domain and persistence logic stays in `InAppNotificationService` / repository.

---

## 8. Transaction patterns

### 8.1 Notification created by an existing transactional domain command

Preferred flow:

```text
UnitOfWork transaction
  ├─ mutate domain state
  ├─ insert user_notifications row
  ├─ append existing email/SMS outbox effect when applicable
  └─ append NotificationStateChanged outbox effect
COMMIT
  └─ outbox dispatcher
      └─ RealtimePublisher
          └─ ws_user:<userId>
```

If the transaction rolls back, neither the user-visible notification nor the realtime wake-up intent exists.

### 8.2 Read/seen/dismiss mutation

```text
transaction
  ├─ update user_notifications state
  └─ append one NotificationStateChanged outbox event
COMMIT
```

Bulk mutations append one wake-up event per affected user, not one socket event per modified row.

### 8.3 Initial alpha producers

#### Password changed

Integration point:

```text
MercurionWebNode/src/app_modules/auth/application/account-flow-kernel.ts
```

The existing password-change flow already performs the password mutation, security audit and password-changed email outbox append in one unit of work.

Add the durable in-app notification inside that same transaction.

Do not create a password-reset-link notification. Create the notification only after the password state has actually changed.

#### Support replied

Integration point:

```text
MercurionWebNode/src/app_modules/help/services/help.service.ts
```

The help subsystem already writes notification-related outbox events transactionally. Add the durable user notification where the support reply becomes authoritative.

Recommended resource target:

```text
resource_type = 'help_ticket'
resource_id   = <ticket identifier>
```

---

## 9. Angular state ownership

### 9.1 InAppNotificationService becomes the notification runtime facade

Populate the existing:

```text
MercurionWebNg/src/app/services/in-app-notification.service.ts
```

It becomes the application owner for:

- current unread count;
- current unseen count;
- current recovery cursor;
- notification runtime lifecycle;
- socket wake-up subscription;
- fallback polling;
- reconciliation serialization/coalescing;
- REST mutations;
- recent typed recovery changes used by presentation surfaces.

Suggested readonly signals:

```ts
unreadCount
unseenCount
syncState
syncCursor
lastRecovery
```

Suggested state:

```ts
type NotificationSyncState =
  | 'inactive'
  | 'baselining'
  | 'ready'
  | 'recovering'
  | 'degraded'
  | 'stopped'
```

Do not introduce anonymous numeric "refresh ticks". The repository architecture policy already treats anonymous tick-based refresh as technical debt. Expose semantic state/results.

### 9.2 REST transport service

Create a thin transport service, for example:

```text
MercurionWebNg/src/app/services/notification-api.service.ts
```

Responsibilities only:

- call notification REST routes;
- use canonical `@mercurion/rest-contracts` request/response types;
- no UI state;
- no toast logic;
- no socket logic.

This keeps the orchestration service testable without mixing HTTP syntax into state transitions.

### 9.3 Initialization ordering

A notification runtime is active only for an authenticated user.

Recommended boot sequence:

1. subscribe to the notification socket event before establishing the REST baseline;
2. establish the initial REST baseline;
3. if a socket event arrived while baseline recovery was in flight, immediately run another recovery;
4. enter ready state.

This closes the gap between "baseline read" and "socket listening".

On logout/session invalidation:

- cancel polling;
- unsubscribe notification event listeners;
- clear cursor;
- clear unread/unseen counts;
- clear notification-specific cached state.

### 9.4 Recovery coalescing

Only one recovery request may be active at a time.

If another wake-up arrives during recovery:

- set a semantic `recoveryRequested` flag;
- finish the current recovery;
- immediately run one more recovery;
- coalesce any number of intermediate wake-ups.

Never start one HTTP recovery request per socket event concurrently.

### 9.5 Applying recovery changes

For every response:

1. apply `unreadCount` and `unseenCount` as authoritative values;
2. apply changes in server order;
3. remove dismissed items from any in-memory active list;
4. update loaded/cached items by ID;
5. advance the cursor only after successfully applying the entire batch;
6. if `hasMore`, immediately fetch the next batch;
7. emit one semantic recovery result when the full catch-up cycle finishes.

### 9.6 Toast rule

A live toast is shown only for a recovery change classified as `created` that:

- was discovered after the initial baseline;
- is not already dismissed;
- has not already been presented as a live toast in this runtime.

Do not show one toast per old unseen notification on application startup.

The startup experience uses the catch-up bubble/count instead.

---

## 10. Socket health and polling fallback

The current `RealtimeSocketService` manually owns reconnection and exposes a typed connection state.

Before notification fallback depends on it, verify/fix the existing transition from session-init acknowledgement to the `private` state. The state machine already defines a `private-authenticated` transition; the inspected runtime path must actually dispatch it after a successful session-init acknowledgement.

Notification fallback policy:

### Private/healthy socket

- no periodic fallback polling;
- socket wake-ups trigger recovery.

### Reconnecting/degraded socket

- immediately run recovery;
- start a fallback polling loop;
- alpha interval: 25 seconds;
- use the exact same recovery method and cursor.

### Private connection restored

- immediately run recovery;
- only after that recovery completes, stop fallback polling.

This ordering avoids a gap where polling is stopped before socket reconnection state has been reconciled.

The polling timer belongs to the notification runtime, not to `RealtimeSocketService`.

---

## 11. Toast component extension

Current toast state supports only:

```ts
id
message
variant
durationMs
createdAt
```

Extend the UI-only model with an optional action:

```ts
export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastMessage {
  ...
  action?: ToastAction
}
```

Update:

- `MercurionWebNg/src/app/Models/toast.models.ts`
- `MercurionWebNg/src/app/services/toast.service.ts`
- `MercurionWebNg/src/app/components/common/toast/toast.component.ts`

The toast remains generic. It must not import notification DTOs or notification services.

When a notification toast is clicked:

1. close the toast;
2. route to the notification center with the selected notification ID;
3. the notification center loads the authoritative detail;
4. opening the detail marks it read.

---

## 12. Notification center UI

### 12.1 Route

Add to `RouteId` and `routeManifest`:

```text
notifications
```

Path:

```text
/notifications
```

Policy:

```text
authenticated + standard shell
```

Add the lazy page route in `app.routes.ts`.

The header notification button should navigate to this route.

### 12.2 Page

Create:

```text
MercurionWebNg/src/app/pages/notifications/notifications.page.component.ts
```

Alpha responsibilities:

- load paginated active notifications;
- newest first;
- filter all/unread;
- mark one read/unread;
- mark all visible-snapshot notifications read;
- dismiss one;
- dismiss all through visible sync cursor;
- open detail;
- consume `?notification=<id>` query parameter so realtime toast actions can deep-link to one notification.

### 12.3 Components

Recommended split:

```text
components/notifications/notification-list.component.ts
components/notifications/notification-list-item.component.ts
components/notifications/notification-detail.component.ts
components/notifications/notification-catch-up.component.ts
```

The alpha may keep styling intentionally simple, but component boundaries should already match their final responsibilities.

### 12.4 Catch-up bubble

The header currently renders `NotificationButtonComponent` for authenticated users.

Add a small anchored `NotificationCatchUpComponent` near the bell.

Behavior:

- visible after initial baseline when `unseenCount > 0`;
- text can be count-only in alpha;
- clicking it navigates to `/notifications`;
- once the bubble has actually been presented, call `markSeenThrough(currentBaselineCursor)`.

The request uses the baseline cursor so a notification created after the bubble appeared cannot be accidentally marked seen.

The badge on the bell continues to use `unreadCount`, not `unseenCount`.

---

## 13. Notification target/navigation resolution

Do not persist Angular URLs in PostgreSQL.

Persist semantic resource data:

```text
resource_type
resource_id
payload
```

Frontend navigation resolution belongs in one place, for example:

```text
MercurionWebNg/src/app/services/notification-navigation.service.ts
```

Responsibilities:

- map known notification/resource types to `routeManifest`;
- provide a safe fallback to notification detail;
- never trust a persisted arbitrary URL.

Example:

```text
support.reply_received + help_ticket
  -> /help or future ticket-specific route
```

A security notification without a resource target can remain entirely inside the notification detail view.

---

## 14. General same-user state synchronization

This card establishes infrastructure that later supports general cross-session state invalidation, but arbitrary resource synchronization is a distinct semantic plane.

Do not model a resource invalidation as a user notification.

Future event shape may be:

```ts
resource.changed {
  resourceType
  resourceId
  operation
  occurredAt
}
```

A consuming feature should refetch its authoritative REST/GraphQL state when relevant.

Do not send entire authoritative domain objects through Socket.IO as a general synchronization strategy.

For the notifications card, implement only the generic `RealtimePublisher` primitive and notification wake-up event. General `resource.changed` rollout can be a separate follow-up once one concrete feature is selected.

---

## 15. REST and socket CI implications

Adding the notification REST consumer/controller changes repository-generated architecture inventories.

After implementation, regenerate and review:

```bash
node scripts/check-rest-route-ownership.mjs --write
node scripts/check-rest-compatibility.mjs --write
```

Then verify their normal non-write checks.

The exact resulting files include:

```text
docs/architecture/rest-route-ownership.json
docs/architecture/rest-contract-compatibility.json
```

Socket.IO changes must remain entirely registry-driven because:

```text
packages/socket-contracts/scripts/socket-event-policy.mjs
```

rejects undeclared event names and duplicated string literals at Socket.IO boundaries.

The public payload versioning policy in `docs/architecture/public-payload-versioning-policy.md` applies to notification REST and socket contracts.

---

## 16. Testing strategy

### 16.1 Backend unit tests

#### Repository

Test:

- dedupe uniqueness;
- recipient isolation;
- unread/unseen counts exclude dismissed rows;
- single read/unread;
- bulk read through cursor;
- seen through cursor;
- single dismiss;
- bulk dismiss through cursor;
- recovery ordering;
- recovery does not skip same-millisecond updates because it uses revision;
- created vs updated classification using `created_revision`.

#### Service

Test:

- notification creation builds catalog snapshot;
- secret-bearing challenge types cannot be created through the in-app catalog;
- mutation writes realtime outbox intent;
- a failed transaction leaves neither notification nor wake-up intent.

#### Controller

Test:

- auth required;
- validation;
- owner isolation returns 404/appropriate canonical error;
- REST DTO compatibility.

#### Realtime/outbox consumer

Test:

- one outbox event emits to `ws_user:<recipientUserId>`;
- duplicate outbox delivery is harmless;
- it uses the registry event, not a literal event string.

### 16.2 Frontend unit tests

#### InAppNotificationService

Test:

- baseline initialization;
- socket event triggers recovery;
- multiple socket events coalesce;
- cursor advances only after full successful batch application;
- `hasMore` drains all pages;
- degraded socket starts polling;
- restored private socket performs recovery before polling stops;
- logout clears state and timers;
- initial baseline does not produce live toasts;
- post-baseline created change produces one toast;
- update/dismiss changes do not produce a "new notification" toast.

#### NotificationButtonComponent

Preserve and extend unread badge tests.

#### Toast

Test optional action rendering and invocation.

#### Notification page

Test:

- all/unread filtering;
- detail via query parameter;
- read/unread;
- mark all read;
- dismiss one/all;
- pagination.

### 16.3 End-to-end/manual alpha scenarios

Mandatory scenarios:

1. Browser A and Browser B logged in as the same user.
2. Password changed in A.
3. Durable notification exists in PostgreSQL.
4. B receives realtime wake-up and recovers notification.
5. B badge increments.
6. B receives one clickable toast.
7. Opening the toast opens notification detail and marks it read.
8. A receives the read-state wake-up and reconciles.
9. Disable/break Socket.IO while keeping REST available.
10. Create another notification.
11. Degraded polling recovers it.
12. Restore Socket.IO.
13. Reconnect recovery runs before polling is stopped.
14. Create a notification while both browsers are closed.
15. Open one browser.
16. Initial baseline shows a catch-up bubble/unseen count but no storm of historical toasts.
17. Presenting the bubble marks only notifications through the baseline cursor as seen.
18. A notification created after the bubble baseline remains unseen.

---

## 17. File-level implementation map

### New backend files

```text
MercurionWebNode/src/app_modules/notification/models/entities/user-notification.entity.ts
MercurionWebNode/src/app_modules/notification/models/in-app-notification-catalog.ts
MercurionWebNode/src/app_modules/notification/repositories/user-notification.repository.ts
MercurionWebNode/src/app_modules/notification/controllers/in-app-notification.controller.ts
MercurionWebNode/src/app_modules/socket-io/realtime-publisher.service.ts
```

A dedicated realtime outbox consumer may be created if keeping it separate from the current dispatcher registration improves ownership.

### Backend files to modify

```text
MercurionWebNode/src/app_modules/notification/notification.module.ts
MercurionWebNode/src/app_modules/notification/services/in-app-notification.service.ts
MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox.service.ts
MercurionWebNode/src/app_modules/notification/services/outbox/notification-outbox-dispatcher.service.ts
MercurionWebNode/src/app_modules/socket-io/socket.io.gateway.ts
MercurionWebNode/src/app_modules/auth/application/account-flow-kernel.ts
MercurionWebNode/src/app_modules/help/services/help.service.ts
```

### Shared-contract files

```text
packages/rest-contracts/src/notifications.ts
packages/rest-contracts/src/index.ts
packages/socket-contracts/src/index.ts
```

### New frontend files

```text
MercurionWebNg/src/app/services/notification-api.service.ts
MercurionWebNg/src/app/services/notification-navigation.service.ts
MercurionWebNg/src/app/pages/notifications/notifications.page.component.ts
MercurionWebNg/src/app/components/notifications/notification-list.component.ts
MercurionWebNg/src/app/components/notifications/notification-list-item.component.ts
MercurionWebNg/src/app/components/notifications/notification-detail.component.ts
MercurionWebNg/src/app/components/notifications/notification-catch-up.component.ts
```

### Frontend files to modify

```text
MercurionWebNg/src/app/services/in-app-notification.service.ts
MercurionWebNg/src/app/services/socket-io/realtime-socket.service.ts
MercurionWebNg/src/app/Models/notification.models.ts
MercurionWebNg/src/app/Models/toast.models.ts
MercurionWebNg/src/app/services/toast.service.ts
MercurionWebNg/src/app/components/common/toast/toast.component.ts
MercurionWebNg/src/app/components/common/notification-button/notification-button.component.ts
MercurionWebNg/src/app/components/common/header/header.component.ts
MercurionWebNg/src/app/route-manifest.ts
MercurionWebNg/src/app/app.routes.ts
```

Add/update adjacent spec files for every changed ownership boundary.

---

## 18. Recommended implementation order

### Phase 1 — contracts and persistence

1. Define REST notification contracts.
2. Define socket wake-up contract.
3. Create/review PostgreSQL DDL.
4. Add TypeORM entity.
5. Add repository.
6. Populate backend `InAppNotificationService`.

Exit condition: persistence CRUD/recovery tests are green without any UI.

### Phase 2 — realtime backend

1. Introduce `RealtimePublisher`.
2. Add notification-state outbox event.
3. Register its dispatcher consumer.
4. Emit the typed socket wake-up to the user room.

Exit condition: a committed notification mutation eventually produces a typed user-room wake-up.

### Phase 3 — REST controller

1. Recovery.
2. List/detail.
3. Read/unread.
4. seen-all through cursor.
5. dismiss/dismiss-all.

Exit condition: REST integration tests cover the full notification lifecycle.

### Phase 4 — Angular runtime

1. Verify/fix realtime `private` state transition.
2. Add `NotificationApiService`.
3. Replace placeholder `InAppNotificationService` with the reconciliation state machine.
4. Add degraded polling.
5. Add toast action support.

Exit condition: frontend tests prove baseline, wake-up, recovery and fallback behavior.

### Phase 5 — UI shell and center

1. Make bell navigate.
2. Add catch-up bubble.
3. Add notifications route/page.
4. Add list/item/detail.
5. Add read/dismiss actions.

Exit condition: complete but minimally polished alpha UX.

### Phase 6 — first production-like notification producers

1. `security.password_changed`.
2. `support.reply_received`.

Exit condition: both scenarios work end to end in two simultaneous browsers and under forced socket degradation.

### Phase 7 — CI inventory and full validation

1. Regenerate REST ownership inventory.
2. Regenerate REST compatibility inventory.
3. Run socket contract policy.
4. Run focused backend/frontend tests.
5. Run project CI gates.
6. Perform manual dual-browser alpha validation.

---

## 19. Alpha Definition of Done

The alpha is done when:

- PostgreSQL is the only authoritative notification state;
- the schema exists independently of TypeORM migrations;
- insert/update revision ordering is deterministic;
- recovery is cursor-based and cannot miss same-time updates;
- unread, unseen and dismissed semantics are distinct and correct;
- notification creation is transactionally coherent with the originating domain change;
- realtime wake-ups are sent through the existing Socket.IO Redis adapter path;
- realtime delivery is backed by the transactional outbox;
- socket loss automatically enables REST polling;
- reconnect performs reconciliation before fallback polling stops;
- the bell badge reflects authoritative unread count;
- application startup can show a catch-up bubble for unseen notifications;
- live new notifications produce one clickable toast;
- `/notifications` supports list, detail, read/unread, mark-all-read, single dismissal and dismiss-all;
- password-changed and support-replied work end to end;
- two active clients converge after a mutation;
- CI architecture/contract inventories are regenerated and green.

Visual polish is explicitly not part of the alpha Definition of Done beyond usable, accessible component structure.

---

## 20. Deferred work

Not part of this alpha:

- per-user notification channel preferences;
- mandatory-vs-optional preference policy UI;
- Web Push/browser push;
- email/SMS preference editing;
- physical purge/retention policy for dismissed notifications;
- arbitrary cross-session `resource.changed` rollout;
- collaborative realtime object patches;
- notification grouping/threading beyond presentation-only date grouping;
- localization architecture for persisted historic message snapshots.

These can be added without changing the core authority/recovery model defined here.


---

## 21. Implementation status

Updated 2026-10-02 on `feature/6abfc9a4c1919d7ad547b3e9-notifications`.

Implemented in the current branch:

- canonical REST notification contracts;
- typed Socket.IO notification wake-up contract;
- PostgreSQL schema/trigger documentation;
- TypeORM `UserNotification` entity;
- notification catalog;
- notification repository with revision-based recovery;
- backend `InAppNotificationService`;
- authenticated REST controller;
- transactional outbox wake-up event;
- `RealtimePublisherService` using the existing Socket.IO Redis adapter path;
- Angular REST transport and notification reconciliation runtime;
- degraded polling fallback and reconnect reconciliation;
- actionable generic toast support;
- authenticated `/notifications` route;
- notification list, list item, detail and catch-up components;
- header bell navigation and unseen catch-up bubble;
- live notification toast deep-linking;
- password-change notification producer, including successful password-reset completion;
- support-reply notification producer.

Still pending before alpha Definition of Done:

- focused component/page tests for the notification center UI;
- additional producer-level assertions for password/support transactional integration;
- generated REST route ownership inventory refresh;
- generated REST compatibility inventory refresh;
- full repository CI execution;
- dual-browser manual validation against an environment where
  `user_notifications` schema has been applied;
- visual polish after behavioral validation.

The generated architecture inventories must be refreshed using their repository-owned
`--write` commands rather than edited manually.
