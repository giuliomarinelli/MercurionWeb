import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1789400000000 implements MigrationInterface {
    name = 'InitialSchema1789400000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);
        await queryRunner.query(`
            CREATE TABLE "backup_codes" (
                "id" uuid NOT NULL,
                "hash" character varying NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "created_at" bigint NOT NULL,
                "used_at" bigint,
                "user_id" uuid NOT NULL,
                CONSTRAINT "PK_34ab957382dbc57e8fb53f1638f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "documents" (
                "id" character varying NOT NULL,
                "user_id" uuid NOT NULL,
                "storage_type" character varying(32) NOT NULL,
                "storage_path" character varying(1024) NOT NULL,
                "original_name" character varying(255) NOT NULL,
                "size" bigint NOT NULL,
                "mime_type" character varying(128) NOT NULL,
                "note" text,
                "is_public" boolean NOT NULL DEFAULT false,
                "created_at" bigint,
                "updated_at" bigint,
                "scope" character varying NOT NULL,
                "is_active" boolean NOT NULL,
                CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c7481daf5059307842edef74d7" ON "documents" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5cdbec673a4054c3ca905a35db" ON "documents" ("storage_type")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_6553e60c1da09ba0ef70530775" ON "documents" ("user_id", "storage_type", "storage_path")
        `);
        await queryRunner.query(`
            CREATE TABLE "auth_identities" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "provider" text NOT NULL,
                "provider_subject" text NOT NULL,
                "email" character varying(255),
                "email_verified" boolean NOT NULL DEFAULT false,
                "created_at" bigint NOT NULL,
                "updated_at" bigint NOT NULL,
                CONSTRAINT "PK_63a29aebcddd09448dbeee4666b" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "users" (
                "id" uuid NOT NULL,
                "email" character varying,
                "unconfirmed_email" character varying,
                "complete_phone_number" character varying,
                "phone_number_prefix_length" bigint NOT NULL DEFAULT '0',
                "unconfirmed_phone_number" character varying,
                "unconfirmed_phone_number_prefix_length" bigint,
                "password_hash" character varying(100),
                "first_name" character varying NOT NULL DEFAULT '',
                "last_name" character varying NOT NULL DEFAULT '',
                "gender" character varying NOT NULL DEFAULT 'Undefined',
                "job" character varying,
                "initials" character varying(2) NOT NULL DEFAULT '',
                "is_verified" boolean NOT NULL DEFAULT false,
                "scopes" jsonb NOT NULL DEFAULT '[]',
                "mfa_strategies" text NOT NULL DEFAULT '[]',
                "created_at" bigint NOT NULL,
                "updated_at" bigint NOT NULL,
                "otp_secret" character varying NOT NULL DEFAULT '',
                "app_totp_secret" character varying,
                "old_password_hashes" jsonb NOT NULL DEFAULT '[]',
                "avatar_id" character varying,
                "backup_codes_given" boolean NOT NULL DEFAULT false,
                "account_recovery_code_hash" character varying,
                "locked" boolean NOT NULL DEFAULT false,
                "recovery_mode" boolean NOT NULL DEFAULT false,
                "sso" boolean NOT NULL DEFAULT false,
                CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
                CONSTRAINT "REL_c3401836efedec3bec459c8f81" UNIQUE ("avatar_id"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "molecule_collections" (
                "id" uuid NOT NULL,
                "name" character varying NOT NULL,
                "user_id" character varying NOT NULL,
                "created_at" bigint NOT NULL,
                "updated_at" bigint NOT NULL,
                "touched_at" bigint NOT NULL,
                CONSTRAINT "PK_27bbec66b841320242f7d57942c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4e1e9276fa80af9ecf92ed8c94" ON "molecule_collections" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "molecule_collection_items_join" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "collection_id" uuid NOT NULL,
                "item_id" uuid NOT NULL,
                CONSTRAINT "PK_f813facf69ec6784b3f9ad09b74" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d6aa78263e12110a73a2b8d065" ON "molecule_collection_items_join" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "molecule_collection_items" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "label" character varying,
                "notes" text,
                "type" character varying NOT NULL,
                "created_at" bigint NOT NULL,
                "updated_at" bigint NOT NULL,
                "touched_at" bigint NOT NULL,
                "alias" character varying,
                "canonical_smiles" text,
                "mol_formula" text,
                "name" text,
                "properties_json" text,
                "chembl_molregno" bigint,
                "name_en" character varying,
                CONSTRAINT "PK_835bd803ff647d860837b33a621" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d826b643be6d30fe7cedc429c2" ON "molecule_collection_items" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_5a6b7c28f3a5fb883bbc0564c3" ON "molecule_collection_items" ("chembl_molregno")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ef55ec3050b3790b34bbd62545" ON "molecule_collection_items" ("type")
        `);
        await queryRunner.query(`
            CREATE TABLE "synthesis_pool_molecules" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "synthesis_id" uuid NOT NULL,
                "molecule_id" uuid NOT NULL,
                CONSTRAINT "uq_synthesis_pool_molecule" UNIQUE ("synthesis_id", "molecule_id"),
                CONSTRAINT "PK_c98fa00d0908a322da317598a5e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2238b5e135a1a22cc2a2882349" ON "synthesis_pool_molecules" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6a40e9066804dca20e5dc4ddf7" ON "synthesis_pool_molecules" ("synthesis_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_db59c035fa2eeb342481bcefd2" ON "synthesis_pool_molecules" ("molecule_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "synth_step_items" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "step_id" uuid NOT NULL,
                "pool_molecule_id" uuid,
                "text" text,
                "kind" character varying NOT NULL,
                "position" character varying NOT NULL,
                "item_order" integer NOT NULL,
                CONSTRAINT "uq_synth_step_item_position_order" UNIQUE ("step_id", "position", "item_order"),
                CONSTRAINT "PK_5965acf36b6587faded6a147c86" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_850187886599a2ca7e13402642" ON "synth_step_items" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d8d3bae04b9de245c6cca77fd6" ON "synth_step_items" ("step_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cdcb3470974a67b8935b4cc528" ON "synth_step_items" ("pool_molecule_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "synth_steps" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "synth_id" uuid NOT NULL,
                "step_order" integer NOT NULL,
                "description" text,
                "reaction_type" character varying,
                CONSTRAINT "uq_synth_step_order" UNIQUE ("synth_id", "step_order"),
                CONSTRAINT "PK_4b8fe8e68d19d1ec8a5e946c708" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_1b74d0b172890060fc0ee20d46" ON "synth_steps" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8d60498f6612e6bcddf1105e75" ON "synth_steps" ("synth_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "synthesis_pool_collections" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "synthesis_id" uuid NOT NULL,
                "collection_id" uuid NOT NULL,
                CONSTRAINT "uq_synthesis_pool_collection" UNIQUE ("synthesis_id", "collection_id"),
                CONSTRAINT "PK_33e7b8d7e41935e7ac11c8a6f16" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d0cad25d12d7d89a801c080270" ON "synthesis_pool_collections" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8a07bb9845dafbd2002b7bc395" ON "synthesis_pool_collections" ("synthesis_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_c6219a8edcd021ac7779ae41d4" ON "synthesis_pool_collections" ("collection_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "synthesis" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "notes" text,
                CONSTRAINT "PK_262d7e38221e68b80de71ce3134" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_d53c3b54e0d80506f70f08df07" ON "synthesis" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."release_context" AS ENUM('beta', 'prod')
        `);
        await queryRunner.query(`
            CREATE TABLE "release_versions" (
                "id" uuid NOT NULL,
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "context" "public"."release_context" NOT NULL,
                "major" integer NOT NULL,
                "minor" integer NOT NULL,
                "patch" integer,
                "beta_iteration" integer,
                "version_string" character varying(64) NOT NULL,
                "version_sha256" character(64) NOT NULL,
                "source_ref" character varying(128) NOT NULL,
                "release_notes" jsonb,
                CONSTRAINT "PK_59591e5c96a2b9516c7814352a6" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "ux_release_versions_components" ON "release_versions" (
                "context",
                "major",
                "minor",
                "patch",
                "beta_iteration"
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "ux_release_versions_source_ref" ON "release_versions" ("source_ref")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "ux_release_versions_version_string" ON "release_versions" ("version_string")
        `);
        await queryRunner.query(`
            CREATE TABLE "oauth2_tokens" (
                "id" character varying NOT NULL,
                "provider" character varying(32) NOT NULL,
                "user_id" uuid,
                "refresh_token" text NOT NULL,
                "scope" character varying(255),
                "created_at" bigint,
                "updated_at" bigint,
                CONSTRAINT "PK_32570683e5d515faea659c3dbab" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_68e27096706c07e32b5ece1b38" ON "oauth2_tokens" ("provider", "user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "lab_notebook_links" (
                "id" uuid NOT NULL,
                "note_id" uuid,
                "item_id" uuid,
                CONSTRAINT "PK_647d20a5cd382d003c1d916e0b1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "lab_notebook_pages" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "content" text NOT NULL DEFAULT '',
                "sanitized_text" text NOT NULL DEFAULT '',
                "created_at" bigint,
                "updated_at" bigint,
                "order" integer NOT NULL DEFAULT '0',
                "section_id" uuid,
                CONSTRAINT "PK_29c04ce496f8a266507bd91f60d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_4d6fe9009a94a3bc7da83db723" ON "lab_notebook_pages" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "lab_notebook_sections" (
                "id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "user_id" uuid NOT NULL,
                "chapter_id" uuid NOT NULL,
                "order" integer NOT NULL DEFAULT '0',
                "description" text,
                "created_at" bigint,
                "updated_at" bigint,
                CONSTRAINT "PK_0a0d8aa3d87cd177c9260af5803" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_6d9d185154641d6de697d310db" ON "lab_notebook_sections" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_2671feb75b575e5f2406ad2d95" ON "lab_notebook_sections" ("chapter_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "lab_notebook_chapters" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "notebook_id" uuid NOT NULL,
                "order" integer NOT NULL DEFAULT '0',
                "created_at" bigint,
                "updated_at" bigint,
                CONSTRAINT "PK_060677a7ff777737e06015316d4" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3297435d36c2cdf8998a6c3180" ON "lab_notebook_chapters" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_8e81e3d8701b625beac9b800f6" ON "lab_notebook_chapters" ("notebook_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "lab_notebooks" (
                "id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "title" character varying NOT NULL,
                "created_at" bigint,
                "updated_at" bigint,
                CONSTRAINT "PK_c382ebcc191b6383d293b1b8a3a" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_cfd51ef8d8859413ac38758fe6" ON "lab_notebooks" ("user_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "history" (
                "id" uuid NOT NULL,
                "item_entity" character varying NOT NULL,
                "touched_at" bigint NOT NULL,
                "item_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "flag_ids" text NOT NULL,
                CONSTRAINT "PK_9384942edf4804b38ca0ee51416" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "ticket_messages" (
                "id" uuid NOT NULL,
                "public_id" BIGSERIAL NOT NULL,
                "ticket_id" uuid NOT NULL,
                "author_type" character varying(30) NOT NULL,
                "author_id" uuid,
                "user_id" uuid NOT NULL,
                "content_delta" jsonb NOT NULL,
                "content_html" text NOT NULL,
                "created_at" bigint NOT NULL,
                CONSTRAINT "UQ_4640bd255fbffc2c891c4e4ca9e" UNIQUE ("public_id"),
                CONSTRAINT "PK_37beb692dedf7eccb4e519ccec1" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "messages_user_idx" ON "ticket_messages" ("user_id", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "messages_ticket_created_idx" ON "ticket_messages" ("ticket_id", "created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE "tickets" (
                "id" uuid NOT NULL,
                "public_id" BIGSERIAL NOT NULL,
                "user_id" uuid NOT NULL,
                "subject" character varying(255) NOT NULL,
                "status" character varying(30) NOT NULL DEFAULT 'Open',
                "last_message_at" bigint NOT NULL,
                "created_at" bigint NOT NULL,
                "updated_at" bigint NOT NULL,
                CONSTRAINT "UQ_68e6889e77f60cb118b5337229c" UNIQUE ("public_id"),
                CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "tickets_user_last_idx" ON "tickets" ("user_id", "last_message_at")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feedback_env_enum" AS ENUM('staging', 'prod')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feedback_source_enum" AS ENUM('manual_page', 'prompted')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feedback_kind_enum" AS ENUM('bug', 'ux', 'idea', 'question', 'other')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feedback_context_kind_enum" AS ENUM(
                'global',
                'navigation',
                'search',
                'prediction',
                'editor',
                'collection',
                'export',
                'auth',
                'performance',
                'error'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."feedback_status_enum" AS ENUM('new', 'triaged', 'resolved', 'spam')
        `);
        await queryRunner.query(`
            CREATE TABLE "feedback" (
                "id" uuid NOT NULL,
                "created_at_ms" bigint NOT NULL,
                "env" "public"."feedback_env_enum" NOT NULL,
                "source" "public"."feedback_source_enum" NOT NULL DEFAULT 'manual_page',
                "kind" "public"."feedback_kind_enum" NOT NULL DEFAULT 'other',
                "anon_author_key" text NOT NULL,
                "rating_utility" smallint,
                "rating_clarity" smallint,
                "rating_experience" smallint,
                "message" text,
                "context_kind" "public"."feedback_context_kind_enum" NOT NULL DEFAULT 'global',
                "context_ref" text,
                "context_meta" jsonb,
                "client_version" text,
                "status" "public"."feedback_status_enum" NOT NULL DEFAULT 'new',
                "internal_note" text,
                "tags" text array,
                CONSTRAINT "feedback_created_at_ms_positive" CHECK ("created_at_ms" > 0),
                CONSTRAINT "feedback_non_empty" CHECK (
                    "message" IS NOT NULL
                    OR "rating_utility" IS NOT NULL
                    OR "rating_clarity" IS NOT NULL
                    OR "rating_experience" IS NOT NULL
                ),
                CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_env_status_created_at_ms_idx" ON "feedback" ("env", "status", "created_at_ms")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_status_idx" ON "feedback" ("status")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_context_ref_idx" ON "feedback" ("context_ref")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_env_anon_author_created_at_ms_idx" ON "feedback" ("env", "anon_author_key", "created_at_ms")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_env_kind_created_at_ms_idx" ON "feedback" ("env", "kind", "created_at_ms")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_env_context_kind_created_at_ms_idx" ON "feedback" ("env", "context_kind", "created_at_ms")
        `);
        await queryRunner.query(`
            CREATE INDEX "feedback_env_created_at_ms_idx" ON "feedback" ("env", "created_at_ms")
        `);
        await queryRunner.query(`
            CREATE TABLE "molecule_embeddings" (
                "stable_uuid" uuid NOT NULL,
                "molregno" integer NOT NULL,
                "smiles" text NOT NULL,
                "embedding" vector,
                "embedding_model" text NOT NULL DEFAULT 'seyonec/ChemBERTa-zinc-base-v1',
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_9920b2884e55127d09c8806c911" PRIMARY KEY ("stable_uuid")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "countries" (
                "id" integer NOT NULL,
                "name" character varying(100) NOT NULL,
                "iso2" character(2),
                "emoji" character varying(191),
                "emoji_u" character varying(191),
                "latitude" numeric(10, 8),
                "longitude" numeric(11, 8),
                "phonecode" character varying(255),
                CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "backup_codes"
            ADD CONSTRAINT "FK_70066ea80d2f4b871beda32633b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identities"
            ADD CONSTRAINT "FK_c06a980d83c42611d27a294e55c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_c3401836efedec3bec459c8f818" FOREIGN KEY ("avatar_id") REFERENCES "documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "molecule_collection_items_join"
            ADD CONSTRAINT "FK_f279211bb5d094e50296876fb15" FOREIGN KEY ("collection_id") REFERENCES "molecule_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "molecule_collection_items_join"
            ADD CONSTRAINT "FK_f10f716577fc9a7a25af6806df4" FOREIGN KEY ("item_id") REFERENCES "molecule_collection_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_molecules"
            ADD CONSTRAINT "FK_6a40e9066804dca20e5dc4ddf72" FOREIGN KEY ("synthesis_id") REFERENCES "synthesis"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_molecules"
            ADD CONSTRAINT "FK_db59c035fa2eeb342481bcefd23" FOREIGN KEY ("molecule_id") REFERENCES "molecule_collection_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_step_items"
            ADD CONSTRAINT "FK_d8d3bae04b9de245c6cca77fd6b" FOREIGN KEY ("step_id") REFERENCES "synth_steps"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_step_items"
            ADD CONSTRAINT "FK_cdcb3470974a67b8935b4cc5282" FOREIGN KEY ("pool_molecule_id") REFERENCES "synthesis_pool_molecules"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_steps"
            ADD CONSTRAINT "FK_8d60498f6612e6bcddf1105e752" FOREIGN KEY ("synth_id") REFERENCES "synthesis"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_collections"
            ADD CONSTRAINT "FK_8a07bb9845dafbd2002b7bc395d" FOREIGN KEY ("synthesis_id") REFERENCES "synthesis"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_collections"
            ADD CONSTRAINT "FK_c6219a8edcd021ac7779ae41d41" FOREIGN KEY ("collection_id") REFERENCES "molecule_collections"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_links"
            ADD CONSTRAINT "FK_ec2bc0779966f459f4cacbca92d" FOREIGN KEY ("note_id") REFERENCES "lab_notebook_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_links"
            ADD CONSTRAINT "FK_7da6acd357df2ad2ef4feb3d827" FOREIGN KEY ("item_id") REFERENCES "molecule_collection_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_pages"
            ADD CONSTRAINT "FK_990d1e711970ff5fefee9adefae" FOREIGN KEY ("section_id") REFERENCES "lab_notebook_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_sections"
            ADD CONSTRAINT "FK_2671feb75b575e5f2406ad2d959" FOREIGN KEY ("chapter_id") REFERENCES "lab_notebook_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_chapters"
            ADD CONSTRAINT "FK_8e81e3d8701b625beac9b800f6b" FOREIGN KEY ("notebook_id") REFERENCES "lab_notebooks"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ticket_messages"
            ADD CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "ticket_messages" DROP CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb"
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_chapters" DROP CONSTRAINT "FK_8e81e3d8701b625beac9b800f6b"
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_sections" DROP CONSTRAINT "FK_2671feb75b575e5f2406ad2d959"
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_pages" DROP CONSTRAINT "FK_990d1e711970ff5fefee9adefae"
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_links" DROP CONSTRAINT "FK_7da6acd357df2ad2ef4feb3d827"
        `);
        await queryRunner.query(`
            ALTER TABLE "lab_notebook_links" DROP CONSTRAINT "FK_ec2bc0779966f459f4cacbca92d"
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_collections" DROP CONSTRAINT "FK_c6219a8edcd021ac7779ae41d41"
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_collections" DROP CONSTRAINT "FK_8a07bb9845dafbd2002b7bc395d"
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_steps" DROP CONSTRAINT "FK_8d60498f6612e6bcddf1105e752"
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_step_items" DROP CONSTRAINT "FK_cdcb3470974a67b8935b4cc5282"
        `);
        await queryRunner.query(`
            ALTER TABLE "synth_step_items" DROP CONSTRAINT "FK_d8d3bae04b9de245c6cca77fd6b"
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_molecules" DROP CONSTRAINT "FK_db59c035fa2eeb342481bcefd23"
        `);
        await queryRunner.query(`
            ALTER TABLE "synthesis_pool_molecules" DROP CONSTRAINT "FK_6a40e9066804dca20e5dc4ddf72"
        `);
        await queryRunner.query(`
            ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "FK_f10f716577fc9a7a25af6806df4"
        `);
        await queryRunner.query(`
            ALTER TABLE "molecule_collection_items_join" DROP CONSTRAINT "FK_f279211bb5d094e50296876fb15"
        `);
        await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT "FK_c3401836efedec3bec459c8f818"
        `);
        await queryRunner.query(`
            ALTER TABLE "auth_identities" DROP CONSTRAINT "FK_c06a980d83c42611d27a294e55c"
        `);
        await queryRunner.query(`
            ALTER TABLE "backup_codes" DROP CONSTRAINT "FK_70066ea80d2f4b871beda32633b"
        `);
        await queryRunner.query(`
            DROP TABLE "countries"
        `);
        await queryRunner.query(`
            DROP TABLE "molecule_embeddings"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_env_created_at_ms_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_env_context_kind_created_at_ms_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_env_kind_created_at_ms_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_env_anon_author_created_at_ms_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_context_ref_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_status_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."feedback_env_status_created_at_ms_idx"
        `);
        await queryRunner.query(`
            DROP TABLE "feedback"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feedback_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feedback_context_kind_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feedback_kind_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feedback_source_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."feedback_env_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."tickets_user_last_idx"
        `);
        await queryRunner.query(`
            DROP TABLE "tickets"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."messages_ticket_created_idx"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."messages_user_idx"
        `);
        await queryRunner.query(`
            DROP TABLE "ticket_messages"
        `);
        await queryRunner.query(`
            DROP TABLE "history"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cfd51ef8d8859413ac38758fe6"
        `);
        await queryRunner.query(`
            DROP TABLE "lab_notebooks"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8e81e3d8701b625beac9b800f6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3297435d36c2cdf8998a6c3180"
        `);
        await queryRunner.query(`
            DROP TABLE "lab_notebook_chapters"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2671feb75b575e5f2406ad2d95"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6d9d185154641d6de697d310db"
        `);
        await queryRunner.query(`
            DROP TABLE "lab_notebook_sections"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4d6fe9009a94a3bc7da83db723"
        `);
        await queryRunner.query(`
            DROP TABLE "lab_notebook_pages"
        `);
        await queryRunner.query(`
            DROP TABLE "lab_notebook_links"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_68e27096706c07e32b5ece1b38"
        `);
        await queryRunner.query(`
            DROP TABLE "oauth2_tokens"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ux_release_versions_version_string"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ux_release_versions_source_ref"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ux_release_versions_components"
        `);
        await queryRunner.query(`
            DROP TABLE "release_versions"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."release_context"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d53c3b54e0d80506f70f08df07"
        `);
        await queryRunner.query(`
            DROP TABLE "synthesis"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c6219a8edcd021ac7779ae41d4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8a07bb9845dafbd2002b7bc395"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d0cad25d12d7d89a801c080270"
        `);
        await queryRunner.query(`
            DROP TABLE "synthesis_pool_collections"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8d60498f6612e6bcddf1105e75"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1b74d0b172890060fc0ee20d46"
        `);
        await queryRunner.query(`
            DROP TABLE "synth_steps"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cdcb3470974a67b8935b4cc528"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d8d3bae04b9de245c6cca77fd6"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_850187886599a2ca7e13402642"
        `);
        await queryRunner.query(`
            DROP TABLE "synth_step_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_db59c035fa2eeb342481bcefd2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6a40e9066804dca20e5dc4ddf7"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2238b5e135a1a22cc2a2882349"
        `);
        await queryRunner.query(`
            DROP TABLE "synthesis_pool_molecules"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ef55ec3050b3790b34bbd62545"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5a6b7c28f3a5fb883bbc0564c3"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d826b643be6d30fe7cedc429c2"
        `);
        await queryRunner.query(`
            DROP TABLE "molecule_collection_items"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_d6aa78263e12110a73a2b8d065"
        `);
        await queryRunner.query(`
            DROP TABLE "molecule_collection_items_join"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4e1e9276fa80af9ecf92ed8c94"
        `);
        await queryRunner.query(`
            DROP TABLE "molecule_collections"
        `);
        await queryRunner.query(`
            DROP TABLE "users"
        `);
        await queryRunner.query(`
            DROP TABLE "auth_identities"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6553e60c1da09ba0ef70530775"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5cdbec673a4054c3ca905a35db"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_c7481daf5059307842edef74d7"
        `);
        await queryRunner.query(`
            DROP TABLE "documents"
        `);
        await queryRunner.query(`
            DROP TABLE "backup_codes"
        `);
    }

}
