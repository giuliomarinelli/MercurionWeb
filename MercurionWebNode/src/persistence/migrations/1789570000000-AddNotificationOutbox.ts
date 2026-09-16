import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddNotificationOutbox1789570000000 implements MigrationInterface {
  name = 'AddNotificationOutbox1789570000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_outbox_events" (
        "id" uuid NOT NULL,
        "aggregate_id" uuid NOT NULL,
        "event_type" character varying(120) NOT NULL,
        "version" integer NOT NULL,
        "payload" jsonb NOT NULL,
        "status" character varying(30) NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "available_at" bigint NOT NULL,
        "created_at" bigint NOT NULL,
        "claimed_at" bigint,
        "claimed_by" character varying(120),
        "processed_at" bigint,
        "last_error" text,
        "dedupe_key" character varying(255) NOT NULL,
        CONSTRAINT "PK_notification_outbox_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_notification_outbox_events_dedupe_key" UNIQUE ("dedupe_key")
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "notification_outbox_pending_idx"
      ON "notification_outbox_events" ("status", "available_at")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."notification_outbox_pending_idx"`)
    await queryRunner.query(`DROP TABLE "notification_outbox_events"`)
  }
}
