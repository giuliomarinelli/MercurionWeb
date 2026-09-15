import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddAuthIdempotency1789560000000 implements MigrationInterface {
  name = 'AddAuthIdempotency1789560000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "registration_identity" character varying(320)
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_users_registration_identity"
      ON "users" ("registration_identity")
      WHERE "registration_identity" IS NOT NULL
    `)
    await queryRunner.query(`
      CREATE TABLE "account_activation_receipts" (
        "jti" character varying(255) NOT NULL,
        "user_id" uuid NOT NULL,
        "email" character varying(320) NOT NULL,
        "recovery_code" text NOT NULL,
        "created_at" bigint NOT NULL,
        CONSTRAINT "PK_account_activation_receipts_jti" PRIMARY KEY ("jti")
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "idx_account_activation_receipts_user"
      ON "account_activation_receipts" ("user_id")
    `)
    await queryRunner.query(`
      ALTER TABLE "account_activation_receipts"
      ADD CONSTRAINT "fk_account_activation_receipts_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "account_activation_receipts" DROP CONSTRAINT "fk_account_activation_receipts_user"`)
    await queryRunner.query(`DROP INDEX "public"."idx_account_activation_receipts_user"`)
    await queryRunner.query(`DROP TABLE "account_activation_receipts"`)
    await queryRunner.query(`DROP INDEX "public"."uq_users_registration_identity"`)
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "registration_identity"`)
  }
}
