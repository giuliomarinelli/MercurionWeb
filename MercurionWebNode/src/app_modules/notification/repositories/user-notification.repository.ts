import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'node:crypto'
import { EntityManager, Repository } from 'typeorm'

import { UserNotificationDraft } from '../models/in-app-notification-catalog'
import { UserNotification } from '../models/entities/user-notification.entity'

export interface NotificationListBoundary {
  createdAt: string
  id: UUID
}

export interface NotificationRecoverySnapshot {
  snapshotRevision: string
  snapshotAtMs: string
  unreadCount: number
  unseenCount: number
  rows: UserNotification[]
  hasMore: boolean
}

interface RecoveryRawRow {
  snapshotRevision: string
  snapshotAtMs: string
  unreadCount: number | string
  unseenCount: number | string
  id: string | null
  recipientUserId: string | null
  type: string | null
  version: number | string | null
  category: string | null
  title: string | null
  summary: string | null
  body: string | null
  payload: Record<string, unknown> | null
  resourceType: string | null
  resourceId: string | null
  createdAt: string | null
  updatedAt: string | null
  seenAt: string | null
  readAt: string | null
  dismissedAt: string | null
  revision: string | null
  createdRevision: string | null
  dedupeKey: string | null
}

@Injectable()
export class UserNotificationRepository {
  constructor(
    @InjectRepository(UserNotification)
    private readonly repository: Repository<UserNotification>
  ) {}

  async insert(
    manager: EntityManager,
    draft: UserNotificationDraft
  ): Promise<UserNotification> {
    const id = uuidv7() as UUID
    const inserted = await manager.query(
      [
        'INSERT INTO user_notifications (',
        '  id, recipient_user_id, type, version, category, title, summary, body,',
        '  payload, resource_type, resource_id, dedupe_key',
        ') VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12)',
        'ON CONFLICT (dedupe_key) DO NOTHING',
        'RETURNING id'
      ].join('\n'),
      [
        id,
        draft.recipientUserId,
        draft.type,
        draft.version,
        draft.category,
        draft.title,
        draft.summary,
        draft.body,
        JSON.stringify(draft.payload),
        draft.resourceType,
        draft.resourceId,
        draft.dedupeKey
      ]
    ) as Array<{ id: UUID }>

    const notificationRepository = manager.getRepository(UserNotification)
    if (inserted[0]?.id) {
      return notificationRepository.findOneByOrFail({ id: inserted[0].id })
    }

    return notificationRepository.findOneByOrFail({
      dedupeKey: draft.dedupeKey
    })
  }

  async getRecoverySnapshot(
    userId: UUID,
    afterRevision?: string,
    limit = 50
  ): Promise<NotificationRecoverySnapshot> {
    if (afterRevision === undefined) {
      const [row] = await this.repository.query(
        [
          'SELECT',
          "  COALESCE(MAX(revision), 0)::text AS \"snapshotRevision\",",
          "  FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint::text AS \"snapshotAtMs\",",
          '  COUNT(*) FILTER (WHERE dismissed_at IS NULL AND read_at IS NULL)::int AS "unreadCount",',
          '  COUNT(*) FILTER (WHERE dismissed_at IS NULL AND seen_at IS NULL)::int AS "unseenCount"',
          'FROM user_notifications',
          'WHERE recipient_user_id = $1'
        ].join('\n'),
        [userId]
      ) as Array<Pick<
        RecoveryRawRow,
        'snapshotRevision' | 'snapshotAtMs' | 'unreadCount' | 'unseenCount'
      >>

      return {
        snapshotRevision: row?.snapshotRevision ?? '0',
        snapshotAtMs: row?.snapshotAtMs ?? String(Date.now()),
        unreadCount: Number(row?.unreadCount ?? 0),
        unseenCount: Number(row?.unseenCount ?? 0),
        rows: [],
        hasMore: false
      }
    }

    const rawRows = await this.repository.query(
      [
        'WITH snapshot AS (',
        '  SELECT',
        '    COALESCE(MAX(revision), 0)::bigint AS snapshot_revision,',
        '    FLOOR(EXTRACT(EPOCH FROM statement_timestamp()) * 1000)::bigint AS snapshot_at,',
        '    COUNT(*) FILTER (WHERE dismissed_at IS NULL AND read_at IS NULL)::int AS unread_count,',
        '    COUNT(*) FILTER (WHERE dismissed_at IS NULL AND seen_at IS NULL)::int AS unseen_count',
        '  FROM user_notifications',
        '  WHERE recipient_user_id = $1',
        '), changes AS (',
        '  SELECT n.*',
        '  FROM user_notifications n',
        '  CROSS JOIN snapshot s',
        '  WHERE n.recipient_user_id = $1',
        '    AND n.revision > $2::bigint',
        '    AND n.revision <= s.snapshot_revision',
        '  ORDER BY n.revision ASC',
        '  LIMIT $3',
        ')',
        'SELECT',
        '  s.snapshot_revision::text AS "snapshotRevision",',
        '  s.snapshot_at::text AS "snapshotAtMs",',
        '  s.unread_count AS "unreadCount",',
        '  s.unseen_count AS "unseenCount",',
        '  c.id AS "id",',
        '  c.recipient_user_id AS "recipientUserId",',
        '  c.type AS "type",',
        '  c.version AS "version",',
        '  c.category AS "category",',
        '  c.title AS "title",',
        '  c.summary AS "summary",',
        '  c.body AS "body",',
        '  c.payload AS "payload",',
        '  c.resource_type AS "resourceType",',
        '  c.resource_id AS "resourceId",',
        '  c.created_at::text AS "createdAt",',
        '  c.updated_at::text AS "updatedAt",',
        '  c.seen_at::text AS "seenAt",',
        '  c.read_at::text AS "readAt",',
        '  c.dismissed_at::text AS "dismissedAt",',
        '  c.revision::text AS "revision",',
        '  c.created_revision::text AS "createdRevision",',
        '  c.dedupe_key AS "dedupeKey"',
        'FROM snapshot s',
        'LEFT JOIN changes c ON TRUE',
        'ORDER BY c.revision ASC NULLS LAST'
      ].join('\n'),
      [userId, afterRevision, limit + 1]
    ) as RecoveryRawRow[]

    const metadata = rawRows[0]
    const notifications = rawRows
      .filter((row): row is RecoveryRawRow & { id: string } => row.id !== null)
      .map(row => this.fromRecoveryRow(row))

    return {
      snapshotRevision: metadata?.snapshotRevision ?? afterRevision,
      snapshotAtMs: metadata?.snapshotAtMs ?? String(Date.now()),
      unreadCount: Number(metadata?.unreadCount ?? 0),
      unseenCount: Number(metadata?.unseenCount ?? 0),
      rows: notifications.slice(0, limit),
      hasMore: notifications.length > limit
    }
  }

  findOwned(userId: UUID, notificationId: UUID): Promise<UserNotification | null> {
    return this.repository.findOneBy({
      id: notificationId,
      recipientUserId: userId
    })
  }

  async listActive(
    userId: UUID,
    options: {
      limit: number
      unreadOnly: boolean
      boundary?: NotificationListBoundary
    }
  ): Promise<{ rows: UserNotification[]; hasMore: boolean }> {
    const qb = this.repository
      .createQueryBuilder('notification')
      .where('notification.recipientUserId = :userId', { userId })
      .andWhere('notification.dismissedAt IS NULL')

    if (options.unreadOnly) {
      qb.andWhere('notification.readAt IS NULL')
    }

    if (options.boundary) {
      qb.andWhere(
        '(notification.createdAt < :createdAt OR ' +
          '(notification.createdAt = :createdAt AND notification.id < :id))',
        {
          createdAt: options.boundary.createdAt,
          id: options.boundary.id
        }
      )
    }

    const rows = await qb
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .take(options.limit + 1)
      .getMany()

    return {
      rows: rows.slice(0, options.limit),
      hasMore: rows.length > options.limit
    }
  }

  async setRead(
    manager: EntityManager,
    userId: UUID,
    notificationId: UUID,
    read: boolean,
    now = Date.now()
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(UserNotification)
      .set({ readAt: read ? String(now) : null })
      .where('"id" = :notificationId', { notificationId })
      .andWhere('"recipient_user_id" = :userId', { userId })
      .andWhere('"dismissed_at" IS NULL')
      .execute()

    return (result.affected ?? 0) > 0
  }

  async markAllReadThrough(
    manager: EntityManager,
    userId: UUID,
    throughRevision: string,
    now = Date.now()
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .update(UserNotification)
      .set({ readAt: String(now) })
      .where('"recipient_user_id" = :userId', { userId })
      .andWhere('"dismissed_at" IS NULL')
      .andWhere('"read_at" IS NULL')
      .andWhere('"created_revision" <= :throughRevision', { throughRevision })
      .execute()

    return result.affected ?? 0
  }

  async markSeenThrough(
    manager: EntityManager,
    userId: UUID,
    throughRevision: string,
    now = Date.now()
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .update(UserNotification)
      .set({ seenAt: String(now) })
      .where('"recipient_user_id" = :userId', { userId })
      .andWhere('"dismissed_at" IS NULL')
      .andWhere('"seen_at" IS NULL')
      .andWhere('"created_revision" <= :throughRevision', { throughRevision })
      .execute()

    return result.affected ?? 0
  }

  async dismiss(
    manager: EntityManager,
    userId: UUID,
    notificationId: UUID,
    now = Date.now()
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(UserNotification)
      .set({ dismissedAt: String(now) })
      .where('"id" = :notificationId', { notificationId })
      .andWhere('"recipient_user_id" = :userId', { userId })
      .andWhere('"dismissed_at" IS NULL')
      .execute()

    return (result.affected ?? 0) > 0
  }

  async dismissAllThrough(
    manager: EntityManager,
    userId: UUID,
    throughRevision: string,
    now = Date.now()
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder()
      .update(UserNotification)
      .set({ dismissedAt: String(now) })
      .where('"recipient_user_id" = :userId', { userId })
      .andWhere('"dismissed_at" IS NULL')
      .andWhere('"created_revision" <= :throughRevision', { throughRevision })
      .execute()

    return result.affected ?? 0
  }

  private fromRecoveryRow(row: RecoveryRawRow & { id: string }): UserNotification {
    return this.repository.create({
      id: row.id as UUID,
      recipientUserId: row.recipientUserId as UUID,
      type: row.type as string,
      version: Number(row.version),
      category: row.category as string,
      title: row.title as string,
      summary: row.summary as string,
      body: row.body as string,
      payload: row.payload ?? {},
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      createdAt: row.createdAt as string,
      updatedAt: row.updatedAt as string,
      seenAt: row.seenAt,
      readAt: row.readAt,
      dismissedAt: row.dismissedAt,
      revision: row.revision as string,
      createdRevision: row.createdRevision as string,
      dedupeKey: row.dedupeKey as string
    })
  }
}
