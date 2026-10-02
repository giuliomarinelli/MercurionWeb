import { Injectable } from '@nestjs/common'
import { UUID } from 'node:crypto'
import {
  NotificationChangeDTO,
  NotificationListState,
  NotificationPageResponse,
  NotificationRecoveryResponse,
  UserNotificationDTO,
  utcInstantFromEpochMs
} from '@mercurion/rest-contracts'

import {
  CreateInAppNotificationInput,
  buildInAppNotification
} from '../models/in-app-notification-catalog'
import { UserNotification } from '../models/entities/user-notification.entity'
import {
  NotificationListBoundary,
  UserNotificationRepository
} from '../repositories/user-notification.repository'
import {
  TransactionContext,
  UnitOfWork
} from '../../../persistence/transaction-context'

const DEFAULT_RECOVERY_LIMIT = 50
const MAX_RECOVERY_LIMIT = 100
const DEFAULT_PAGE_LIMIT = 25
const MAX_PAGE_LIMIT = 50
const SYNC_CURSOR_PREFIX = 'n1.'
const LIST_CURSOR_PREFIX = 'np1.'
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface ListCursorPayload {
  createdAt: string
  id: UUID
}

@Injectable()
export class InAppNotificationService {
  constructor(
    private readonly notifications: UserNotificationRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  async create(
    input: CreateInAppNotificationInput,
    context?: TransactionContext
  ): Promise<UserNotificationDTO> {
    const draft = buildInAppNotification(input)
    const notification = await this.unitOfWork.run(
      async (_transactionContext, manager) =>
        this.notifications.insert(manager, draft),
      context
    )
    return this.toDto(notification)
  }

  async recover(
    userId: UUID,
    cursor?: string,
    limit = DEFAULT_RECOVERY_LIMIT
  ): Promise<NotificationRecoveryResponse> {
    const boundedLimit = this.normalizeLimit(
      limit,
      DEFAULT_RECOVERY_LIMIT,
      MAX_RECOVERY_LIMIT
    )

    if (!cursor) {
      const snapshot = await this.notifications.getRecoverySnapshot(userId)
      return {
        cursor: this.encodeSyncCursor(snapshot.snapshotRevision),
        snapshotAt: utcInstantFromEpochMs(Number(snapshot.snapshotAtMs)),
        unreadCount: snapshot.unreadCount,
        unseenCount: snapshot.unseenCount,
        changes: [],
        hasMore: false
      }
    }

    const afterRevision = this.decodeSyncCursor(cursor)
    const snapshot = await this.notifications.getRecoverySnapshot(
      userId,
      afterRevision,
      boundedLimit
    )

    const changes: NotificationChangeDTO[] = snapshot.rows.map(notification => ({
      kind: this.changeKind(notification, afterRevision),
      notification: this.toDto(notification)
    }))

    const lastRevision = snapshot.rows.at(-1)?.revision
    const nextRevision = snapshot.hasMore && lastRevision
      ? lastRevision
      : snapshot.snapshotRevision

    return {
      cursor: this.encodeSyncCursor(nextRevision),
      snapshotAt: utcInstantFromEpochMs(Number(snapshot.snapshotAtMs)),
      unreadCount: snapshot.unreadCount,
      unseenCount: snapshot.unseenCount,
      changes,
      hasMore: snapshot.hasMore
    }
  }

  async list(
    userId: UUID,
    options: {
      cursor?: string
      limit?: number
      state?: NotificationListState
    } = {}
  ): Promise<NotificationPageResponse> {
    const limit = this.normalizeLimit(
      options.limit,
      DEFAULT_PAGE_LIMIT,
      MAX_PAGE_LIMIT
    )
    const boundary = options.cursor
      ? this.decodeListCursor(options.cursor)
      : undefined

    const page = await this.notifications.listActive(userId, {
      limit,
      unreadOnly: options.state === 'unread',
      boundary
    })

    const last = page.rows.at(-1)
    return {
      items: page.rows.map(notification => this.toDto(notification)),
      nextCursor: page.hasMore && last
        ? this.encodeListCursor({
            createdAt: last.createdAt,
            id: last.id
          })
        : null
    }
  }

  async get(
    userId: UUID,
    notificationId: UUID
  ): Promise<UserNotificationDTO | null> {
    const notification = await this.notifications.findOwned(
      userId,
      notificationId
    )
    return notification ? this.toDto(notification) : null
  }

  setRead(
    userId: UUID,
    notificationId: UUID,
    read: boolean
  ): Promise<boolean> {
    return this.unitOfWork.run(async (_context, manager) =>
      this.notifications.setRead(manager, userId, notificationId, read)
    )
  }

  markAllReadThrough(userId: UUID, cursor: string): Promise<number> {
    const throughRevision = this.decodeSyncCursor(cursor)
    return this.unitOfWork.run(async (_context, manager) =>
      this.notifications.markAllReadThrough(
        manager,
        userId,
        throughRevision
      )
    )
  }

  markSeenThrough(userId: UUID, cursor: string): Promise<number> {
    const throughRevision = this.decodeSyncCursor(cursor)
    return this.unitOfWork.run(async (_context, manager) =>
      this.notifications.markSeenThrough(
        manager,
        userId,
        throughRevision
      )
    )
  }

  dismiss(userId: UUID, notificationId: UUID): Promise<boolean> {
    return this.unitOfWork.run(async (_context, manager) =>
      this.notifications.dismiss(manager, userId, notificationId)
    )
  }

  dismissAllThrough(userId: UUID, cursor: string): Promise<number> {
    const throughRevision = this.decodeSyncCursor(cursor)
    return this.unitOfWork.run(async (_context, manager) =>
      this.notifications.dismissAllThrough(
        manager,
        userId,
        throughRevision
      )
    )
  }

  private toDto(notification: UserNotification): UserNotificationDTO {
    return {
      id: notification.id,
      type: notification.type,
      version: notification.version,
      category: notification.category,
      title: notification.title,
      summary: notification.summary,
      body: notification.body,
      payload: notification.payload,
      resourceType: notification.resourceType,
      resourceId: notification.resourceId,
      createdAt: utcInstantFromEpochMs(Number(notification.createdAt)),
      updatedAt: utcInstantFromEpochMs(Number(notification.updatedAt)),
      seenAt: notification.seenAt === null
        ? null
        : utcInstantFromEpochMs(Number(notification.seenAt)),
      readAt: notification.readAt === null
        ? null
        : utcInstantFromEpochMs(Number(notification.readAt)),
      dismissedAt: notification.dismissedAt === null
        ? null
        : utcInstantFromEpochMs(Number(notification.dismissedAt))
    }
  }

  private changeKind(
    notification: UserNotification,
    afterRevision: string
  ): NotificationChangeDTO['kind'] {
    if (notification.dismissedAt !== null) {
      return 'dismissed'
    }
    return BigInt(notification.createdRevision) > BigInt(afterRevision)
      ? 'created'
      : 'updated'
  }

  private encodeSyncCursor(revision: string): string {
    return SYNC_CURSOR_PREFIX +
      Buffer.from(revision, 'utf8').toString('base64url')
  }

  private decodeSyncCursor(cursor: string): string {
    if (!cursor.startsWith(SYNC_CURSOR_PREFIX)) {
      throw new RangeError('Invalid notification sync cursor')
    }

    const encoded = cursor.slice(SYNC_CURSOR_PREFIX.length)
    let revision: string
    try {
      revision = Buffer.from(encoded, 'base64url').toString('utf8')
    } catch {
      throw new RangeError('Invalid notification sync cursor')
    }

    if (!/^\d+$/.test(revision)) {
      throw new RangeError('Invalid notification sync cursor')
    }

    return BigInt(revision).toString()
  }

  private encodeListCursor(boundary: NotificationListBoundary): string {
    const payload: ListCursorPayload = {
      createdAt: boundary.createdAt,
      id: boundary.id
    }
    return LIST_CURSOR_PREFIX +
      Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  }

  private decodeListCursor(cursor: string): NotificationListBoundary {
    if (!cursor.startsWith(LIST_CURSOR_PREFIX)) {
      throw new RangeError('Invalid notification list cursor')
    }

    let parsed: unknown
    try {
      const decoded = Buffer.from(
        cursor.slice(LIST_CURSOR_PREFIX.length),
        'base64url'
      ).toString('utf8')
      parsed = JSON.parse(decoded)
    } catch {
      throw new RangeError('Invalid notification list cursor')
    }

    if (!this.isListCursorPayload(parsed)) {
      throw new RangeError('Invalid notification list cursor')
    }

    return parsed
  }

  private isListCursorPayload(value: unknown): value is ListCursorPayload {
    if (typeof value !== 'object' || value === null) {
      return false
    }

    const candidate = value as Record<string, unknown>
    return typeof candidate.createdAt === 'string' &&
      /^\d+$/.test(candidate.createdAt) &&
      typeof candidate.id === 'string' &&
      UUID_PATTERN.test(candidate.id)
  }

  private normalizeLimit(
    value: number | undefined,
    fallback: number,
    maximum: number
  ): number {
    if (value === undefined) {
      return fallback
    }
    if (!Number.isInteger(value) || value < 1) {
      throw new RangeError('Notification limit must be a positive integer')
    }
    return Math.min(value, maximum)
  }
}
