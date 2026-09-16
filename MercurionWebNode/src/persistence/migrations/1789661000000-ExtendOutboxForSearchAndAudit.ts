import { MigrationInterface, QueryRunner } from 'typeorm'

export class ExtendOutboxForSearchAndAudit1789661000000 implements MigrationInterface {
  name = 'ExtendOutboxForSearchAndAudit1789661000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_outbox_events"
      ADD COLUMN "correlation_id" uuid,
      ADD COLUMN "causation_id" uuid,
      ADD COLUMN "occurred_at" bigint NOT NULL DEFAULT 0
    `)
    await queryRunner.query(`
      UPDATE "notification_outbox_events"
      SET "occurred_at" = "created_at"
      WHERE "occurred_at" = 0
    `)
    await queryRunner.query(`
      ALTER TABLE "notification_outbox_events"
      ALTER COLUMN "occurred_at" DROP DEFAULT
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_outbox_events"
      DROP COLUMN "occurred_at",
      DROP COLUMN "causation_id",
      DROP COLUMN "correlation_id"
    `)
  }
}
