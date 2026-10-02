import type { UtcInstant } from './temporal'

export type NotificationSyncCursor = string
export type NotificationListCursor = string
export type NotificationListState = 'all' | 'unread'

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

export type NotificationChangeKind = 'created' | 'updated' | 'dismissed'

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
  nextCursor: NotificationListCursor | null
}

export interface SetNotificationReadRequest {
  read: boolean
}

export interface NotificationBulkThroughRequest {
  throughCursor: NotificationSyncCursor
}
