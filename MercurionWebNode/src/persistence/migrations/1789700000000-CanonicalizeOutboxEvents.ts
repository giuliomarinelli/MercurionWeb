import { MigrationInterface, QueryRunner } from 'typeorm'

export class CanonicalizeOutboxEvents1789700000000 implements MigrationInterface {
  name = 'CanonicalizeOutboxEvents1789700000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    const hasLegacyTable = await queryRunner.hasTable('notification_outbox_events')
    const hasCanonicalTable = await queryRunner.hasTable('outbox_events')

    if (hasLegacyTable && !hasCanonicalTable) {
      await queryRunner.renameTable('notification_outbox_events', 'outbox_events')
    }

    if (await queryRunner.hasTable('outbox_events')) {
      await queryRunner.query(`
        ALTER INDEX IF EXISTS "notification_outbox_pending_idx"
        RENAME TO "outbox_pending_idx"
      `)
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "outbox_dispatch_idx"
        ON "outbox_events" ("status", "available_at", "claimed_at")
      `)
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "outbox_dispatch_idx"`)
    if (await queryRunner.hasTable('outbox_events')) {
      await queryRunner.renameTable('outbox_events', 'notification_outbox_events')
      await queryRunner.query(`
        ALTER INDEX IF EXISTS "outbox_pending_idx"
        RENAME TO "notification_outbox_pending_idx"
      `)
    }
  }
}
