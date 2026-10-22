-- Mercurion scientific-domain schema / PostgreSQL 16 / DB-FIRST
-- ONE-TIME destructive rebuild of ONLY legacy Notebook and Synthesis tables.
-- Explicit authorization granted by the repository owner on 2026-10-21.
-- Does NOT drop lab_notebooks_old, molecule_* tables, users, or other domains.
-- UUIDs are assigned by the application (UUIDv7), NEVER by PostgreSQL.
-- All FK references intentionally use a single ID: ownership is enforced by Nest.
-- Requires backup, maintenance window, and the matching Nest/GraphQL release.
-- This script is NOT a TypeORM migration. NEVER execute while legacy Nest runs.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

-- Fail closed on repeat runs, unsupported server, incomplete legacy footprint,
-- and unexpected new feature objects. Do not allow a typo to erase another domain.
DO $preflight$
DECLARE
  tbl text;
BEGIN
  IF current_setting('server_version_num')::integer < 160000 THEN
    RAISE EXCEPTION 'This script requires PostgreSQL 16 or later';
  END IF;
  FOREACH tbl IN ARRAY ARRAY[
    'lab_notebooks','lab_notebook_chapters','lab_notebook_sections',
    'lab_notebook_pages','lab_notebook_links',
    'synthesis','synth_steps','synth_step_molecule_refs'
  ] LOOP
    IF to_regclass(format('public.%I',tbl)) IS NULL THEN
      RAISE EXCEPTION 'Expected legacy table public.% is missing; refusing reset',tbl;
    END IF;
  END LOOP;
  FOREACH tbl IN ARRAY ARRAY[
    'lab_notebook_experiments','lab_notebook_executions',
    'lab_experiment_protocol_revisions',
    'notebook_experiment_synthesis_links',
    'experiment_execution_synthesis_links',
    'experiment_execution_molecule_links',
    'synth_step_items','synthesis_pool_molecules','synthesis_pool_collections'
  ] LOOP
    IF to_regclass(format('public.%I',tbl)) IS NOT NULL THEN
      RAISE EXCEPTION 'New feature table public.% already exists; refusing reset',tbl;
    END IF;
  END LOOP;
  IF to_regprocedure('public.reject_protocol_revision_mutation()') IS NOT NULL
     OR to_regprocedure('public.guard_experiment_execution_history()') IS NOT NULL
     OR to_regprocedure('public.assert_custom_synthesis_pool_item()') IS NOT NULL THEN
    RAISE EXCEPTION 'New scientific-domain trigger function already exists; refusing reset';
  END IF;
END
$preflight$;

-- NO DROP ... CASCADE: a newly introduced external FK must halt this transaction.
-- lab_notebooks_old deliberately survives.
DROP TABLE public.lab_notebook_links;
DROP TABLE public.lab_notebook_pages;
DROP TABLE public.lab_notebook_sections;
DROP TABLE public.lab_notebook_chapters;
DROP TABLE public.lab_notebooks;
DROP TABLE public.synth_step_molecule_refs;
DROP TABLE public.synth_steps;
DROP TABLE public.synthesis;

-- =========================== SYNTHESIS ===========================
CREATE TABLE public.synthesis (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  notes text,
  CONSTRAINT uq_synthesis_owner_title UNIQUE(user_id,title)
);
CREATE INDEX idx_synthesis_user ON public.synthesis(user_id);

CREATE TABLE public.synth_steps (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  synth_id uuid NOT NULL REFERENCES public.synthesis(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  description text,
  reaction_type varchar(255),
  CONSTRAINT ck_synth_step_order_non_negative CHECK(step_order >= 0),
  CONSTRAINT uq_synth_step_order UNIQUE(synth_id,step_order)
    DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_synth_steps_owner_synth ON public.synth_steps(user_id,synth_id);

CREATE TABLE public.synthesis_pool_collections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  synthesis_id uuid NOT NULL REFERENCES public.synthesis(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.molecule_collections(id) ON DELETE CASCADE,
  CONSTRAINT uq_synthesis_pool_collection UNIQUE(synthesis_id,collection_id)
);
CREATE INDEX idx_synthesis_pool_collections_owner ON public.synthesis_pool_collections(user_id,synthesis_id);
CREATE INDEX idx_synthesis_pool_collections_collection ON public.synthesis_pool_collections(collection_id);

CREATE TABLE public.synthesis_pool_molecules (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  synthesis_id uuid NOT NULL REFERENCES public.synthesis(id) ON DELETE CASCADE,
  molecule_id uuid NOT NULL REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE,
  CONSTRAINT uq_synthesis_pool_molecule UNIQUE(synthesis_id,molecule_id)
);
CREATE INDEX idx_synthesis_pool_molecules_owner ON public.synthesis_pool_molecules(user_id,synthesis_id);
CREATE INDEX idx_synthesis_pool_molecules_molecule ON public.synthesis_pool_molecules(molecule_id);

-- DB-level molecule-kind invariant, without introducing composite owner FKs.
-- Ownership checks remain exclusively in the application service layer.
CREATE FUNCTION public.assert_custom_synthesis_pool_item()
RETURNS trigger LANGUAGE plpgsql AS $fn$
DECLARE actual_type varchar;
BEGIN
  SELECT m.type INTO actual_type
  FROM public.molecule_collection_items m WHERE m.id = NEW.molecule_id;
  IF actual_type IS DISTINCT FROM 'custom' THEN
    RAISE EXCEPTION USING ERRCODE = '23514',
      MESSAGE = 'A synthesis pool accepts only custom molecules',
      CONSTRAINT = 'ck_synthesis_pool_custom_only';
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_synthesis_pool_custom_only
BEFORE INSERT OR UPDATE OF molecule_id ON public.synthesis_pool_molecules
FOR EACH ROW EXECUTE FUNCTION public.assert_custom_synthesis_pool_item();

CREATE TABLE public.synth_step_items (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  step_id uuid NOT NULL REFERENCES public.synth_steps(id) ON DELETE CASCADE,
  pool_molecule_id uuid REFERENCES public.synthesis_pool_molecules(id) ON DELETE CASCADE,
  text text,
  kind varchar(32) NOT NULL,
  position varchar(16) NOT NULL,
  item_order integer NOT NULL,
  CONSTRAINT ck_synth_step_item_kind CHECK (kind IN
    ('Reactant','Reagent','Solvent','Condition','Catalyst','Product','Byproduct','Other')),
  CONSTRAINT ck_synth_step_item_position CHECK (position IN
    ('BeforeArrow','OnArrow','AfterArrow')),
  CONSTRAINT ck_synth_step_item_nonempty CHECK (
    pool_molecule_id IS NOT NULL OR NULLIF(BTRIM(text),'') IS NOT NULL),
  CONSTRAINT ck_synth_step_item_order_non_negative CHECK (item_order >= 0),
  CONSTRAINT uq_synth_step_item_position_order UNIQUE(step_id,position,item_order)
    DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_synth_step_items_owner_step ON public.synth_step_items(user_id,step_id);
CREATE INDEX idx_synth_step_items_pool ON public.synth_step_items(pool_molecule_id);

-- =========================== NOTEBOOK ============================
CREATE TABLE public.lab_notebooks (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  premise_delta jsonb,
  premise_text text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  archived_at bigint,
  CONSTRAINT ck_notebook_premise_delta CHECK (
    premise_delta IS NULL OR jsonb_typeof(premise_delta)='object')
);
CREATE INDEX idx_lab_notebooks_owner ON public.lab_notebooks(user_id);

-- Name replaces legacy NotebookChapter while keeping the intended parent/child role.
CREATE TABLE public.lab_notebook_sections (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  notebook_id uuid NOT NULL REFERENCES public.lab_notebooks(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  section_order integer NOT NULL,
  content_delta jsonb,
  sanitized_text text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT ck_notebook_section_order CHECK(section_order >= 0),
  CONSTRAINT ck_notebook_section_delta CHECK (
    content_delta IS NULL OR jsonb_typeof(content_delta)='object'),
  CONSTRAINT uq_notebook_section_order UNIQUE(notebook_id,section_order)
    DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_notebook_sections_owner_parent ON public.lab_notebook_sections(user_id,notebook_id);

-- Name replaces legacy NotebookSection.
CREATE TABLE public.lab_notebook_experiments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  section_id uuid NOT NULL REFERENCES public.lab_notebook_sections(id) ON DELETE CASCADE,
  title varchar(255) NOT NULL,
  experiment_order integer NOT NULL,
  content_delta jsonb,
  sanitized_text text NOT NULL DEFAULT '',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  archived_at bigint,
  CONSTRAINT ck_notebook_experiment_order CHECK(experiment_order >= 0),
  CONSTRAINT ck_notebook_experiment_delta CHECK (
    content_delta IS NULL OR jsonb_typeof(content_delta)='object'),
  CONSTRAINT uq_notebook_experiment_order UNIQUE(section_id,experiment_order)
    DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_notebook_experiments_owner_parent ON public.lab_notebook_experiments(user_id,section_id);

-- Append-only scientific snapshot, independent of subsequent live Synthesis edits.
-- RESTRICT makes an experiment with revisions non-deletable (archive it instead).
CREATE TABLE public.lab_experiment_protocol_revisions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  experiment_id uuid NOT NULL REFERENCES public.lab_notebook_experiments(id) ON DELETE RESTRICT,
  revision_number integer NOT NULL,
  snapshot_schema_version integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL,
  checksum_sha256 char(64) NOT NULL,
  created_at bigint NOT NULL,
  created_by uuid NOT NULL,
  CONSTRAINT ck_protocol_revision_positive CHECK (
    revision_number >= 1 AND snapshot_schema_version >= 1),
  CONSTRAINT ck_protocol_revision_snapshot_object CHECK (
    jsonb_typeof(snapshot)='object'),
  CONSTRAINT ck_protocol_revision_sha256 CHECK (
    checksum_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT uq_protocol_revision_number UNIQUE(experiment_id,revision_number)
);
CREATE INDEX idx_protocol_revisions_owner_experiment
  ON public.lab_experiment_protocol_revisions(user_id,experiment_id);

CREATE FUNCTION public.reject_protocol_revision_mutation()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514',
    MESSAGE = 'Protocol revisions are append-only and immutable',
    CONSTRAINT = 'ck_protocol_revision_immutable';
END
$fn$;
CREATE TRIGGER trg_protocol_revision_immutable
BEFORE UPDATE OR DELETE ON public.lab_experiment_protocol_revisions
FOR EACH ROW EXECUTE FUNCTION public.reject_protocol_revision_mutation();

-- Execution represents a particular lab attempt, not a mutable protocol.
CREATE TABLE public.lab_notebook_executions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  experiment_id uuid NOT NULL REFERENCES public.lab_notebook_experiments(id) ON DELETE CASCADE,
  protocol_revision_id uuid REFERENCES public.lab_experiment_protocol_revisions(id) ON DELETE RESTRICT,
  title varchar(255) NOT NULL,
  execution_order integer NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'DRAFT',
  content_delta jsonb,
  sanitized_text text NOT NULL DEFAULT '',
  started_at bigint,
  completed_at bigint,
  archived_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  CONSTRAINT ck_execution_status CHECK (
    status IN ('DRAFT','IN_PROGRESS','COMPLETED','CANCELLED')),
  CONSTRAINT ck_execution_lifecycle CHECK (
    (status='DRAFT' AND protocol_revision_id IS NULL AND started_at IS NULL AND completed_at IS NULL)
    OR (status='IN_PROGRESS' AND protocol_revision_id IS NOT NULL AND started_at IS NOT NULL AND completed_at IS NULL)
    OR (status='COMPLETED' AND protocol_revision_id IS NOT NULL AND started_at IS NOT NULL AND completed_at IS NOT NULL)
    OR (status='CANCELLED' AND protocol_revision_id IS NOT NULL AND started_at IS NOT NULL AND completed_at IS NULL)),
  CONSTRAINT ck_execution_delta CHECK (
    content_delta IS NULL OR jsonb_typeof(content_delta)='object'),
  CONSTRAINT ck_execution_order CHECK(execution_order >= 0),
  CONSTRAINT uq_execution_order UNIQUE(experiment_id,execution_order)
    DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX idx_executions_owner_experiment ON public.lab_notebook_executions(user_id,experiment_id);
CREATE INDEX idx_executions_revision ON public.lab_notebook_executions(protocol_revision_id);

-- Minimal DB guard for transition history. Fine-grained access and identity
-- consistency (ownership, same experiment revision) are handled by Nest.
CREATE FUNCTION public.guard_experiment_execution_history()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION USING ERRCODE='23514',
        MESSAGE='Started executions must be archived, not deleted',
        CONSTRAINT='ck_execution_historical_retention';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.status = 'DRAFT' AND NEW.status NOT IN ('DRAFT','IN_PROGRESS') THEN
    RAISE EXCEPTION USING ERRCODE='23514',
      MESSAGE='Draft executions must be started before completion or cancellation',
      CONSTRAINT='ck_execution_start_required';
  END IF;
  IF OLD.status <> 'DRAFT' THEN
    IF NEW.protocol_revision_id IS DISTINCT FROM OLD.protocol_revision_id
       OR NEW.experiment_id IS DISTINCT FROM OLD.experiment_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
      RAISE EXCEPTION USING ERRCODE='23514',
        MESSAGE='Started execution identity and protocol revision are immutable',
        CONSTRAINT='ck_execution_protocol_binding_immutable';
    END IF;
    IF OLD.status IN ('COMPLETED','CANCELLED') AND (
        NEW.content_delta IS DISTINCT FROM OLD.content_delta
        OR NEW.sanitized_text IS DISTINCT FROM OLD.sanitized_text
        OR NEW.title IS DISTINCT FROM OLD.title
        OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
        OR NEW.status IS DISTINCT FROM OLD.status) THEN
      RAISE EXCEPTION USING ERRCODE='23514',
        MESSAGE='Completed or cancelled execution content is immutable',
        CONSTRAINT='ck_execution_final_immutable';
    END IF;
    IF OLD.status='IN_PROGRESS' AND NEW.status NOT IN ('IN_PROGRESS','COMPLETED','CANCELLED') THEN
      RAISE EXCEPTION USING ERRCODE='23514',
        MESSAGE='An execution cannot return to draft',
        CONSTRAINT='ck_execution_status_transition';
    END IF;
  END IF;
  RETURN NEW;
END
$fn$;
CREATE TRIGGER trg_experiment_execution_history
BEFORE UPDATE OR DELETE ON public.lab_notebook_executions
FOR EACH ROW EXECUTE FUNCTION public.guard_experiment_execution_history();

-- ======================== LIVE CROSS-DOMAIN LINKS ======================
-- These FKs CASCADE only live association rows. Protocol snapshots do NOT
-- contain FKs to live molecules, syntheses or steps and remain intact.
CREATE TABLE public.notebook_experiment_synthesis_links (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  experiment_id uuid NOT NULL REFERENCES public.lab_notebook_experiments(id) ON DELETE CASCADE,
  synthesis_id uuid NOT NULL REFERENCES public.synthesis(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  CONSTRAINT uq_experiment_synthesis UNIQUE(experiment_id,synthesis_id)
);
CREATE INDEX idx_experiment_synth_links_user ON public.notebook_experiment_synthesis_links(user_id);
CREATE INDEX idx_experiment_synth_links_synth ON public.notebook_experiment_synthesis_links(synthesis_id);

CREATE TABLE public.experiment_execution_synthesis_links (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  execution_id uuid NOT NULL REFERENCES public.lab_notebook_executions(id) ON DELETE CASCADE,
  synthesis_id uuid NOT NULL REFERENCES public.synthesis(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.synth_steps(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  CONSTRAINT uq_execution_synthesis_step UNIQUE NULLS NOT DISTINCT(execution_id,synthesis_id,step_id)
);
CREATE INDEX idx_execution_synth_links_user ON public.experiment_execution_synthesis_links(user_id);
CREATE INDEX idx_execution_synth_links_synth ON public.experiment_execution_synthesis_links(synthesis_id);
CREATE INDEX idx_execution_synth_links_step ON public.experiment_execution_synthesis_links(step_id);

CREATE TABLE public.experiment_execution_molecule_links (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  execution_id uuid NOT NULL REFERENCES public.lab_notebook_executions(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE,
  created_at bigint NOT NULL,
  CONSTRAINT uq_execution_molecule UNIQUE(execution_id,item_id)
);
CREATE INDEX idx_execution_molecule_links_user ON public.experiment_execution_molecule_links(user_id);
CREATE INDEX idx_execution_molecule_links_item ON public.experiment_execution_molecule_links(item_id);

-- Preserve the ownership policy of the existing schema (role app).
-- Operators need ALTER TABLE OWNER privileges or must run the script as app.
ALTER TABLE public.synthesis OWNER TO app;
ALTER TABLE public.synth_steps OWNER TO app;
ALTER TABLE public.synthesis_pool_collections OWNER TO app;
ALTER TABLE public.synthesis_pool_molecules OWNER TO app;
ALTER TABLE public.synth_step_items OWNER TO app;
ALTER TABLE public.lab_notebooks OWNER TO app;
ALTER TABLE public.lab_notebook_sections OWNER TO app;
ALTER TABLE public.lab_notebook_experiments OWNER TO app;
ALTER TABLE public.lab_experiment_protocol_revisions OWNER TO app;
ALTER TABLE public.lab_notebook_executions OWNER TO app;
ALTER TABLE public.notebook_experiment_synthesis_links OWNER TO app;
ALTER TABLE public.experiment_execution_synthesis_links OWNER TO app;
ALTER TABLE public.experiment_execution_molecule_links OWNER TO app;
ALTER FUNCTION public.assert_custom_synthesis_pool_item() OWNER TO app;
ALTER FUNCTION public.reject_protocol_revision_mutation() OWNER TO app;
ALTER FUNCTION public.guard_experiment_execution_history() OWNER TO app;

COMMIT;
-- Run 21_verify_scientific_domain_pg16.sql in another session.