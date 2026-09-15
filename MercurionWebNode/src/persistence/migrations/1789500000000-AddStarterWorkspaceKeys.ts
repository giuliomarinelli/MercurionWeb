import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStarterWorkspaceKeys1789500000000 implements MigrationInterface {
  name = 'AddStarterWorkspaceKeys1789500000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "molecule_collections" ADD "system_key" character varying`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items" ADD "system_key" character varying`)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_molecule_collections_user_system_key" ON "molecule_collections" ("user_id", "system_key")`)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_molecule_collection_items_user_system_key" ON "molecule_collection_items" ("user_id", "system_key")`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."uq_molecule_collection_items_user_system_key"`)
    await queryRunner.query(`DROP INDEX "public"."uq_molecule_collections_user_system_key"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items" DROP COLUMN "system_key"`)
    await queryRunner.query(`ALTER TABLE "molecule_collections" DROP COLUMN "system_key"`)
  }
}
