import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStorageOperations1789660000000 implements MigrationInterface {
  name = 'AddStorageOperations1789660000000'

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "storage_operations" (
        "id" uuid NOT NULL,
        "document_id" uuid,
        "type" character varying(30) NOT NULL,
        "object_key" character varying(1024) NOT NULL,
        "status" character varying(30) NOT NULL,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" bigint NOT NULL,
        "created_at" bigint NOT NULL,
        "completed_at" bigint,
        "last_error" text,
        "dedupe_key" character varying(255) NOT NULL,
        CONSTRAINT "PK_storage_operations_id" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_da97655d6791e511d80fc4a400"
      ON "storage_operations" ("dedupe_key")
    `)
    await queryRunner.query(`
      CREATE INDEX "storage_operations_due_idx"
      ON "storage_operations" ("status", "next_attempt_at")
    `)
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."storage_operations_due_idx"`)
    await queryRunner.query(`DROP INDEX "public"."IDX_da97655d6791e511d80fc4a400"`)
    await queryRunner.query(`DROP TABLE "storage_operations"`)
  }
}
