import { MigrationInterface, QueryRunner } from 'typeorm'

export class CanonicalizeHelpPublicIdSources1789580000000 implements MigrationInterface {
  name = 'CanonicalizeHelpPublicIdSources1789580000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tickets" ADD CONSTRAINT "ck_tickets_public_id_positive" CHECK ("public_id" > 0)`,
    )
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" ADD CONSTRAINT "ck_ticket_messages_public_id_positive" CHECK ("public_id" > 0)`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ticket_messages" DROP CONSTRAINT "ck_ticket_messages_public_id_positive"`,
    )
    await queryRunner.query(
      `ALTER TABLE "tickets" DROP CONSTRAINT "ck_tickets_public_id_positive"`,
    )
  }
}
