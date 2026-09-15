import { MigrationInterface, QueryRunner } from 'typeorm'

export class EnforceIntegrityConstraints1789486400000 implements MigrationInterface {
  name = 'EnforceIntegrityConstraints1789486400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "molecule_collections" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid`)

    await queryRunner.query(`
      DELETE FROM "molecule_collection_items_join" AS j
      USING "molecule_collections" AS c, "molecule_collection_items" AS i
      WHERE c."id" = j."collection_id"
        AND i."id" = j."item_id"
        AND c."user_id" <> i."user_id"
    `)
    await queryRunner.query(`
      UPDATE "molecule_collection_items_join" AS j
      SET "user_id" = c."user_id"
      FROM "molecule_collections" AS c, "molecule_collection_items" AS i
      WHERE c."id" = j."collection_id"
        AND i."id" = j."item_id"
        AND c."user_id" = i."user_id"
        AND j."user_id" <> c."user_id"
    `)

    await queryRunner.query(`CREATE UNIQUE INDEX "uq_auth_identities_provider_subject" ON "auth_identities" ("provider", "provider_subject")`)
    await queryRunner.query(`CREATE INDEX "idx_auth_identities_user_provider" ON "auth_identities" ("user_id", "provider")`)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_molecule_collections_id_user" ON "molecule_collections" ("id", "user_id")`)
    await queryRunner.query(`CREATE INDEX "idx_molecule_collections_user_name" ON "molecule_collections" ("user_id", "name")`)
    await queryRunner.query(`CREATE INDEX "idx_molecule_collections_user_touched" ON "molecule_collections" ("user_id", "touched_at")`)
    await queryRunner.query(`CREATE UNIQUE INDEX "uq_molecule_collection_items_id_user" ON "molecule_collection_items" ("id", "user_id")`)
    await queryRunner.query(`CREATE INDEX "idx_molecule_collection_items_user_touched" ON "molecule_collection_items" ("user_id", "touched_at")`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" ADD CONSTRAINT "uq_molecule_collection_join_owner" UNIQUE ("user_id", "collection_id", "item_id")`)
    await queryRunner.query(`CREATE INDEX "idx_molecule_collection_join_owner_item" ON "molecule_collection_items_join" ("user_id", "item_id", "collection_id")`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "FK_f279211bb5d094e50296876fb15"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "FK_f10f716577fc9a7a25af6806df4"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" ADD CONSTRAINT "fk_molecule_join_owned_collection" FOREIGN KEY ("collection_id", "user_id") REFERENCES "molecule_collections"("id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" ADD CONSTRAINT "fk_molecule_join_owned_item" FOREIGN KEY ("item_id", "user_id") REFERENCES "molecule_collection_items"("id", "user_id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "synth_steps" ADD CONSTRAINT "ck_synth_step_order_non_negative" CHECK ("step_order" >= 0)`)
    await queryRunner.query(`ALTER TABLE "synth_step_items" ADD CONSTRAINT "ck_synth_step_item_order_non_negative" CHECK ("item_order" >= 0)`)
    await queryRunner.query(`ALTER TABLE "synth_step_items" ADD CONSTRAINT "ck_synth_step_item_position" CHECK ("position" IN ('BeforeArrow', 'OnArrow', 'AfterArrow'))`)
    await queryRunner.query(`ALTER TABLE "synth_step_items" ADD CONSTRAINT "ck_synth_step_item_kind" CHECK ("kind" IN ('Reactant', 'Reagent', 'Solvent', 'Condition', 'Catalyst', 'Product', 'Byproduct', 'Other'))`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "synth_step_items" DROP CONSTRAINT "ck_synth_step_item_kind"`)
    await queryRunner.query(`ALTER TABLE "synth_step_items" DROP CONSTRAINT "ck_synth_step_item_position"`)
    await queryRunner.query(`ALTER TABLE "synth_step_items" DROP CONSTRAINT "ck_synth_step_item_order_non_negative"`)
    await queryRunner.query(`ALTER TABLE "synth_steps" DROP CONSTRAINT "ck_synth_step_order_non_negative"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "fk_molecule_join_owned_item"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "fk_molecule_join_owned_collection"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" ADD CONSTRAINT "FK_f279211bb5d094e50296876fb15" FOREIGN KEY ("collection_id") REFERENCES "molecule_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" ADD CONSTRAINT "FK_f10f716577fc9a7a25af6806df4" FOREIGN KEY ("item_id") REFERENCES "molecule_collection_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`DROP INDEX "public"."idx_molecule_collection_join_owner_item"`)
    await queryRunner.query(`ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "uq_molecule_collection_join_owner"`)
    await queryRunner.query(`DROP INDEX "public"."idx_molecule_collection_items_user_touched"`)
    await queryRunner.query(`DROP INDEX "public"."uq_molecule_collection_items_id_user"`)
    await queryRunner.query(`DROP INDEX "public"."idx_molecule_collections_user_touched"`)
    await queryRunner.query(`DROP INDEX "public"."idx_molecule_collections_user_name"`)
    await queryRunner.query(`DROP INDEX "public"."uq_molecule_collections_id_user"`)
    await queryRunner.query(`DROP INDEX "public"."idx_auth_identities_user_provider"`)
    await queryRunner.query(`DROP INDEX "public"."uq_auth_identities_provider_subject"`)
    await queryRunner.query(`ALTER TABLE "molecule_collections" ALTER COLUMN "user_id" TYPE character varying USING "user_id"::text`)
  }
}
