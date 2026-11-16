-- RESET APPLICATIVO PREVIEW: elimina le tabelle elencate e tutti i loro dati.
-- Preserva public.molecule_embeddings e TUTTI i suoi indici; niente CASCADE.
-- In pgAdmin eseguire il file INTERO, Auto-commit attivo, applicazioni ferme.
-- Qualsiasi errore prima del COMMIT annulla il reset; eseguire ROLLBACK se necessario.
BEGIN;
-- Stesso proprietario applicativo attuale, anche se pgAdmin usa postgres.
SET LOCAL ROLE mercurion_preview;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = 0;
SET LOCAL search_path = public, pg_catalog;
SET LOCAL check_function_bodies = false;
SELECT pg_advisory_xact_lock(148048, 769);
DO $guard$
DECLARE unexpected text;
BEGIN
 IF current_database() <> 'mercurion_preview' THEN
  RAISE EXCEPTION 'Database errato: richiesto mercurion_preview';
 END IF;
 IF to_regclass('public.molecule_embeddings') IS NULL THEN
  RAISE EXCEPTION 'Tabella embeddings assente: reset rifiutato';
 END IF;
 SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO unexpected
 FROM pg_tables WHERE schemaname='public'
 AND tablename <> 'molecule_embeddings' AND NOT tablename = ANY(ARRAY['account_activation_receipts','auth_identities','backup_codes','countries','documents','experiment_execution_molecule_links','experiment_execution_synthesis_links','feedback','history','lab_experiment_protocol_revisions','lab_notebook_executions','lab_notebook_experiments','lab_notebook_sections','lab_notebooks','molecule_collection_items','molecule_collection_items_join','molecule_collections','molecule_name_i18n','molecule_preview_view','notebook_experiment_synthesis_links','oauth2_tokens','outbox_events','release_versions','storage_operations','synth_step_items','synth_steps','synthesis','synthesis_pool_collections','synthesis_pool_molecules','ticket_messages','tickets','user_notifications','users']::text[]);
 IF unexpected IS NOT NULL THEN
  RAISE EXCEPTION 'Tabelle inattese, nessuna rimozione: %', unexpected;
 END IF;
 IF to_regclass('public.users') IS NOT NULL THEN
  IF EXISTS (SELECT 1 FROM public.users LIMIT 1) THEN
   RAISE EXCEPTION 'Esistono utenti: reset rifiutato, verificare prima i dati';
  END IF;
 END IF;
END $guard$;
-- Gli indici trigrammi del DDL dev richiedono questa estensione trusted.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
LOCK TABLE public.molecule_embeddings IN ACCESS SHARE MODE;
CREATE TEMP TABLE embedding_objects_before ON COMMIT DROP AS
 SELECT c.oid, c.relname, c.relkind, pg_relation_filenode(c.oid) AS filenode,
        i.indisvalid, i.indisready, pg_get_indexdef(i.indexrelid) AS definition
 FROM pg_class c LEFT JOIN pg_index i ON i.indexrelid=c.oid
 WHERE c.oid='public.molecule_embeddings'::regclass
 OR c.oid IN (SELECT indexrelid FROM pg_index WHERE indrelid='public.molecule_embeddings'::regclass);

DROP TABLE IF EXISTS
  public.account_activation_receipts,
  public.auth_identities,
  public.backup_codes,
  public.countries,
  public.documents,
  public.experiment_execution_molecule_links,
  public.experiment_execution_synthesis_links,
  public.feedback,
  public.history,
  public.lab_experiment_protocol_revisions,
  public.lab_notebook_executions,
  public.lab_notebook_experiments,
  public.lab_notebook_sections,
  public.lab_notebooks,
  public.molecule_collection_items,
  public.molecule_collection_items_join,
  public.molecule_collections,
  public.molecule_name_i18n,
  public.molecule_preview_view,
  public.notebook_experiment_synthesis_links,
  public.oauth2_tokens,
  public.outbox_events,
  public.release_versions,
  public.storage_operations,
  public.synth_step_items,
  public.synth_steps,
  public.synthesis,
  public.synthesis_pool_collections,
  public.synthesis_pool_molecules,
  public.ticket_messages,
  public.tickets,
  public.user_notifications,
  public.users
RESTRICT;
DROP FUNCTION IF EXISTS public.assert_custom_synthesis_pool_item() RESTRICT;
DROP FUNCTION IF EXISTS public.assign_user_notification_revision() RESTRICT;
DROP FUNCTION IF EXISTS public.guard_experiment_execution_history() RESTRICT;
DROP FUNCTION IF EXISTS public.purge_orphan_items() RESTRICT;
DROP FUNCTION IF EXISTS public.reject_protocol_revision_mutation() RESTRICT;
DROP SEQUENCE IF EXISTS public.countries_id_seq RESTRICT;
DROP SEQUENCE IF EXISTS public.ticket_messages_public_id_seq RESTRICT;
DROP SEQUENCE IF EXISTS public.tickets_public_id_seq RESTRICT;
DROP SEQUENCE IF EXISTS public.user_notifications_revision_seq RESTRICT;
DROP TYPE IF EXISTS public.feedback_context_kind RESTRICT;
DROP TYPE IF EXISTS public.feedback_context_kind_enum RESTRICT;
DROP TYPE IF EXISTS public.feedback_env RESTRICT;
DROP TYPE IF EXISTS public.feedback_env_enum RESTRICT;
DROP TYPE IF EXISTS public.feedback_kind RESTRICT;
DROP TYPE IF EXISTS public.feedback_kind_enum RESTRICT;
DROP TYPE IF EXISTS public.feedback_source RESTRICT;
DROP TYPE IF EXISTS public.feedback_source_enum RESTRICT;
DROP TYPE IF EXISTS public.feedback_status RESTRICT;
DROP TYPE IF EXISTS public.feedback_status_enum RESTRICT;
DROP TYPE IF EXISTS public.release_context RESTRICT;

-- DDL da pg_dump reale; nessun synchronize TypeORM. Eseguire tramite 20_rebuild_preview_application.sql.

-- TYPE: feedback_context_kind
CREATE TYPE public.feedback_context_kind AS ENUM (
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
);

-- TYPE: feedback_env
CREATE TYPE public.feedback_env AS ENUM (
    'staging',
    'prod'
);

-- TYPE: feedback_kind
CREATE TYPE public.feedback_kind AS ENUM (
    'bug',
    'ux',
    'idea',
    'question',
    'other'
);

-- TYPE: feedback_source
CREATE TYPE public.feedback_source AS ENUM (
    'manual_page',
    'prompted'
);

-- TYPE: feedback_status
CREATE TYPE public.feedback_status AS ENUM (
    'new',
    'triaged',
    'resolved',
    'spam'
);

-- TYPE: release_context
CREATE TYPE public.release_context AS ENUM (
    'beta',
    'prod'
);

-- FUNCTION: assert_custom_synthesis_pool_item()
CREATE FUNCTION public.assert_custom_synthesis_pool_item() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

-- FUNCTION: assign_user_notification_revision()
CREATE FUNCTION public.assign_user_notification_revision() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_revision BIGINT;
    now_ms BIGINT;
BEGIN
    next_revision :=
        nextval('user_notifications_revision_seq');

    now_ms :=
        FLOOR(
            EXTRACT(EPOCH FROM clock_timestamp()) * 1000
        )::BIGINT;

    NEW.revision := next_revision;

    IF TG_OP = 'INSERT' THEN
        NEW.created_revision := next_revision;
        NEW.created_at := now_ms;
    END IF;

    NEW.updated_at := now_ms;

    RETURN NEW;
END;
$$;

-- FUNCTION: guard_experiment_execution_history()
CREATE FUNCTION public.guard_experiment_execution_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;

-- FUNCTION: purge_orphan_items()
CREATE FUNCTION public.purge_orphan_items() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- dopo che un join è stato cancellato, se l’item non ha più join → elimina l’item
  IF NOT EXISTS (SELECT 1 FROM molecule_collection_items_join WHERE item_id = OLD.item_id) THEN
    DELETE FROM molecule_collection_items WHERE id = OLD.item_id;
  END IF;
  RETURN NULL;
END;
$$;

-- FUNCTION: reject_protocol_revision_mutation()
CREATE FUNCTION public.reject_protocol_revision_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '23514',
    MESSAGE = 'Protocol revisions are append-only and immutable',
    CONSTRAINT = 'ck_protocol_revision_immutable';
END
$$;


SET LOCAL default_tablespace = '';

SET LOCAL default_table_access_method = heap;

-- TABLE: account_activation_receipts
CREATE TABLE public.account_activation_receipts (
    jti character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    email character varying(320) NOT NULL,
    recovery_code text NOT NULL,
    created_at bigint NOT NULL
);

-- TABLE: auth_identities
CREATE TABLE public.auth_identities (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider text NOT NULL,
    provider_subject text NOT NULL,
    email character varying(255),
    email_verified boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);

-- TABLE: backup_codes
CREATE TABLE public.backup_codes (
    id uuid NOT NULL,
    hash character varying(255) NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    used_at bigint,
    user_id uuid NOT NULL
);

-- TABLE: countries
CREATE TABLE public.countries (
    name character varying(100) NOT NULL,
    iso2 character(2) NOT NULL,
    emoji character varying(191),
    emoji_u character varying(191),
    latitude numeric(10,8),
    longitude numeric(11,8),
    phonecode character varying(255),
    id integer NOT NULL
);

-- SEQUENCE: countries_id_seq
ALTER TABLE public.countries ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.countries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

-- TABLE: documents
CREATE TABLE public.documents (
    user_id uuid NOT NULL,
    storage_type character varying(32) NOT NULL,
    storage_path character varying(1024) NOT NULL,
    original_name character varying(255) NOT NULL,
    size bigint NOT NULL,
    mime_type character varying(128) NOT NULL,
    note text,
    is_public boolean NOT NULL,
    created_at bigint,
    updated_at bigint,
    scope character varying(255) DEFAULT 'None'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    id uuid NOT NULL
);

-- TABLE: experiment_execution_molecule_links
CREATE TABLE public.experiment_execution_molecule_links (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    execution_id uuid NOT NULL,
    item_id uuid NOT NULL,
    created_at bigint NOT NULL
);

-- TABLE: experiment_execution_synthesis_links
CREATE TABLE public.experiment_execution_synthesis_links (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    execution_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    step_id uuid,
    created_at bigint NOT NULL
);

-- TABLE: feedback
CREATE TABLE public.feedback (
    id uuid NOT NULL,
    created_at_ms bigint NOT NULL,
    env public.feedback_env NOT NULL,
    source public.feedback_source DEFAULT 'manual_page'::public.feedback_source NOT NULL,
    kind public.feedback_kind DEFAULT 'other'::public.feedback_kind NOT NULL,
    anon_author_key text NOT NULL,
    rating_utility smallint,
    rating_clarity smallint,
    rating_experience smallint,
    message text,
    context_kind public.feedback_context_kind DEFAULT 'global'::public.feedback_context_kind NOT NULL,
    context_ref text,
    context_meta jsonb,
    client_version text,
    moderated_at_ms bigint,
    moderated_by_user_id uuid,
    status public.feedback_status DEFAULT 'new'::public.feedback_status NOT NULL,
    internal_note text,
    tags text[],
    CONSTRAINT feedback_created_at_ms_positive CHECK ((created_at_ms > 0)),
    CONSTRAINT feedback_non_empty CHECK (((message IS NOT NULL) OR (rating_utility IS NOT NULL) OR (rating_clarity IS NOT NULL) OR (rating_experience IS NOT NULL))),
    CONSTRAINT feedback_rating_clarity_check CHECK (((rating_clarity >= 1) AND (rating_clarity <= 5))),
    CONSTRAINT feedback_rating_experience_check CHECK (((rating_experience >= 1) AND (rating_experience <= 5))),
    CONSTRAINT feedback_rating_utility_check CHECK (((rating_utility >= 1) AND (rating_utility <= 5)))
);

-- TABLE: history
CREATE TABLE public.history (
    id uuid NOT NULL,
    item_entity character varying(100) NOT NULL,
    touched_at bigint NOT NULL,
    item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    flag_ids text DEFAULT '{}'::text NOT NULL
);

-- TABLE: lab_experiment_protocol_revisions
CREATE TABLE public.lab_experiment_protocol_revisions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    experiment_id uuid NOT NULL,
    revision_number integer NOT NULL,
    snapshot_schema_version integer DEFAULT 1 NOT NULL,
    snapshot jsonb NOT NULL,
    checksum_sha256 character(64) NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT ck_protocol_revision_positive CHECK (((revision_number >= 1) AND (snapshot_schema_version >= 1))),
    CONSTRAINT ck_protocol_revision_sha256 CHECK ((checksum_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT ck_protocol_revision_snapshot_object CHECK ((jsonb_typeof(snapshot) = 'object'::text))
);

-- TABLE: lab_notebook_executions
CREATE TABLE public.lab_notebook_executions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    experiment_id uuid NOT NULL,
    protocol_revision_id uuid,
    title character varying(255) NOT NULL,
    execution_order integer NOT NULL,
    status character varying(16) DEFAULT 'DRAFT'::character varying NOT NULL,
    content_delta jsonb,
    sanitized_text text DEFAULT ''::text NOT NULL,
    started_at bigint,
    completed_at bigint,
    archived_at bigint,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    CONSTRAINT ck_execution_delta CHECK (((content_delta IS NULL) OR (jsonb_typeof(content_delta) = 'object'::text))),
    CONSTRAINT ck_execution_lifecycle CHECK (((((status)::text = 'DRAFT'::text) AND (protocol_revision_id IS NULL) AND (started_at IS NULL) AND (completed_at IS NULL)) OR (((status)::text = 'IN_PROGRESS'::text) AND (protocol_revision_id IS NOT NULL) AND (started_at IS NOT NULL) AND (completed_at IS NULL)) OR (((status)::text = 'COMPLETED'::text) AND (protocol_revision_id IS NOT NULL) AND (started_at IS NOT NULL) AND (completed_at IS NOT NULL)) OR (((status)::text = 'CANCELLED'::text) AND (protocol_revision_id IS NOT NULL) AND (started_at IS NOT NULL) AND (completed_at IS NULL)))),
    CONSTRAINT ck_execution_order CHECK ((execution_order >= 0)),
    CONSTRAINT ck_execution_status CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'IN_PROGRESS'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);

-- TABLE: lab_notebook_experiments
CREATE TABLE public.lab_notebook_experiments (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    section_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    experiment_order integer NOT NULL,
    content_delta jsonb,
    sanitized_text text DEFAULT ''::text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    archived_at bigint,
    CONSTRAINT ck_notebook_experiment_delta CHECK (((content_delta IS NULL) OR (jsonb_typeof(content_delta) = 'object'::text))),
    CONSTRAINT ck_notebook_experiment_order CHECK ((experiment_order >= 0))
);

-- TABLE: lab_notebook_sections
CREATE TABLE public.lab_notebook_sections (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    notebook_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    section_order integer NOT NULL,
    content_delta jsonb,
    sanitized_text text DEFAULT ''::text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    CONSTRAINT ck_notebook_section_delta CHECK (((content_delta IS NULL) OR (jsonb_typeof(content_delta) = 'object'::text))),
    CONSTRAINT ck_notebook_section_order CHECK ((section_order >= 0))
);

-- TABLE: lab_notebooks
CREATE TABLE public.lab_notebooks (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    premise_delta jsonb,
    premise_text text DEFAULT ''::text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    archived_at bigint,
    CONSTRAINT ck_notebook_premise_delta CHECK (((premise_delta IS NULL) OR (jsonb_typeof(premise_delta) = 'object'::text)))
);

-- TABLE: molecule_collection_items
CREATE TABLE public.molecule_collection_items (
    id uuid NOT NULL,
    label character varying(255),
    notes text,
    mol_formula text,
    name character varying(255),
    chembl_molregno bigint,
    canonical_smiles text,
    type character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    properties jsonb DEFAULT '{}'::jsonb,
    properties_json text,
    touched_at bigint DEFAULT (0)::bigint NOT NULL,
    alias character varying(255),
    name_en character varying(255),
    system_key character varying
);

-- TABLE: molecule_collection_items_join
CREATE TABLE public.molecule_collection_items_join (
    id uuid NOT NULL,
    item_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    user_id uuid NOT NULL
);

-- TABLE: molecule_collections
CREATE TABLE public.molecule_collections (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    touched_at bigint DEFAULT (0)::bigint NOT NULL,
    system_key character varying
);

-- TABLE: molecule_name_i18n
CREATE TABLE public.molecule_name_i18n (
    molregno integer NOT NULL,
    preferred_en text NOT NULL,
    preferred_it text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- TABLE: molecule_preview_view
CREATE TABLE public.molecule_preview_view (
    id bigint NOT NULL,
    cmb_id character varying(255) NOT NULL,
    preferred_name character varying(255) DEFAULT NULL::character varying,
    synonyms character varying(255) DEFAULT NULL::character varying,
    smiles text,
    standard_inchi_key character varying(255) DEFAULT NULL::character varying,
    mw_freebase double precision,
    alogp double precision,
    hba bigint,
    hbd bigint,
    psa double precision,
    rtb bigint,
    max_phase bigint,
    molecule_type character varying(255) DEFAULT NULL::character varying,
    oral_admin bigint,
    parenteral_admin bigint,
    topical_admin bigint,
    black_box_warning_flag bigint,
    natural_product_flag bigint,
    prodrug_flag bigint
);

-- TABLE: notebook_experiment_synthesis_links
CREATE TABLE public.notebook_experiment_synthesis_links (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    experiment_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    created_at bigint NOT NULL
);

-- TABLE: oauth2_tokens
CREATE TABLE public.oauth2_tokens (
    id character varying(255) NOT NULL,
    provider character varying(32) NOT NULL,
    user_id uuid,
    refresh_token text NOT NULL,
    scope character varying(255) DEFAULT NULL::character varying,
    created_at bigint,
    updated_at bigint
);

-- TABLE: outbox_events
CREATE TABLE public.outbox_events (
    id uuid NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(120) NOT NULL,
    version integer NOT NULL,
    payload jsonb NOT NULL,
    status character varying(30) NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    available_at bigint NOT NULL,
    created_at bigint NOT NULL,
    claimed_at bigint,
    claimed_by character varying(120),
    processed_at bigint,
    last_error text,
    dedupe_key character varying(255) NOT NULL,
    correlation_id uuid,
    causation_id uuid,
    occurred_at bigint NOT NULL
);

-- TABLE: release_versions
CREATE TABLE public.release_versions (
    id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    context public.release_context NOT NULL,
    major integer NOT NULL,
    minor integer NOT NULL,
    patch integer,
    beta_iteration integer,
    version_string character varying(64) NOT NULL,
    version_sha256 character(64) NOT NULL,
    release_notes jsonb,
    source_ref character varying(128) NOT NULL,
    CONSTRAINT chk_beta_iter_pos CHECK (((beta_iteration IS NULL) OR (beta_iteration >= 1))),
    CONSTRAINT chk_beta_rules CHECK ((((context = 'beta'::public.release_context) AND (patch IS NULL) AND (beta_iteration IS NOT NULL)) OR ((context = 'prod'::public.release_context) AND (patch IS NOT NULL) AND (beta_iteration IS NULL)))),
    CONSTRAINT chk_major_nonneg CHECK ((major >= 0)),
    CONSTRAINT chk_minor_nonneg CHECK ((minor >= 0)),
    CONSTRAINT chk_patch_nonneg CHECK (((patch IS NULL) OR (patch >= 0))),
    CONSTRAINT chk_source_ref_nonempty CHECK ((length(TRIM(BOTH FROM source_ref)) > 0)),
    CONSTRAINT chk_source_ref_pattern CHECK (((source_ref)::text ~ '^[0-9a-fA-F]{7,40}@[0-9A-Za-z][0-9A-Za-z._/\-]{0,63}$'::text)),
    CONSTRAINT chk_version_string_nonempty CHECK ((length(TRIM(BOTH FROM version_string)) > 0))
);

-- TABLE: synth_step_items
CREATE TABLE public.synth_step_items (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    step_id uuid NOT NULL,
    pool_molecule_id uuid,
    text text,
    kind character varying(32) NOT NULL,
    "position" character varying(16) NOT NULL,
    item_order integer NOT NULL,
    CONSTRAINT ck_synth_step_item_kind CHECK (((kind)::text = ANY ((ARRAY['Reactant'::character varying, 'Reagent'::character varying, 'Solvent'::character varying, 'Condition'::character varying, 'Catalyst'::character varying, 'Product'::character varying, 'Byproduct'::character varying, 'Other'::character varying])::text[]))),
    CONSTRAINT ck_synth_step_item_nonempty CHECK (((pool_molecule_id IS NOT NULL) OR (NULLIF(btrim(text), ''::text) IS NOT NULL))),
    CONSTRAINT ck_synth_step_item_order_non_negative CHECK ((item_order >= 0)),
    CONSTRAINT ck_synth_step_item_position CHECK ((("position")::text = ANY ((ARRAY['BeforeArrow'::character varying, 'OnArrow'::character varying, 'AfterArrow'::character varying])::text[])))
);

-- TABLE: synth_steps
CREATE TABLE public.synth_steps (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synth_id uuid NOT NULL,
    step_order integer NOT NULL,
    description text,
    reaction_type character varying(255),
    CONSTRAINT ck_synth_step_order_non_negative CHECK ((step_order >= 0))
);

-- TABLE: synthesis
CREATE TABLE public.synthesis (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    notes text
);

-- TABLE: synthesis_pool_collections
CREATE TABLE public.synthesis_pool_collections (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    collection_id uuid NOT NULL
);

-- TABLE: synthesis_pool_molecules
CREATE TABLE public.synthesis_pool_molecules (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    molecule_id uuid NOT NULL
);

-- TABLE: ticket_messages
CREATE TABLE public.ticket_messages (
    id uuid NOT NULL,
    public_id bigint NOT NULL,
    ticket_id uuid NOT NULL,
    author_type character varying(30) NOT NULL,
    author_id uuid,
    user_id uuid NOT NULL,
    content_delta jsonb NOT NULL,
    content_html text NOT NULL,
    created_at bigint NOT NULL
);

-- SEQUENCE: ticket_messages_public_id_seq
ALTER TABLE public.ticket_messages ALTER COLUMN public_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.ticket_messages_public_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

-- TABLE: tickets
CREATE TABLE public.tickets (
    id uuid NOT NULL,
    public_id bigint NOT NULL,
    user_id uuid NOT NULL,
    subject character varying(255) NOT NULL,
    status character varying(30) DEFAULT 'Open'::character varying NOT NULL,
    last_message_at bigint NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);

-- SEQUENCE: tickets_public_id_seq
ALTER TABLE public.tickets ALTER COLUMN public_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.tickets_public_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

-- TABLE: user_notifications
CREATE TABLE public.user_notifications (
    id uuid NOT NULL,
    recipient_user_id uuid NOT NULL,
    type character varying(120) NOT NULL,
    version integer NOT NULL,
    category character varying(60) NOT NULL,
    title character varying(180) NOT NULL,
    summary character varying(400) NOT NULL,
    body text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    resource_type character varying(100),
    resource_id character varying(180),
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    seen_at bigint,
    read_at bigint,
    dismissed_at bigint,
    revision bigint NOT NULL,
    created_revision bigint NOT NULL,
    dedupe_key character varying(255) NOT NULL,
    CONSTRAINT ck_user_notifications_version_positive CHECK ((version > 0))
);

-- SEQUENCE: user_notifications_revision_seq
CREATE SEQUENCE public.user_notifications_revision_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- TABLE: users
CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(255),
    password_hash character varying(100),
    first_name character varying(255) DEFAULT ''::character varying NOT NULL,
    last_name character varying(255) DEFAULT ''::character varying NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    created_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    updated_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    complete_phone_number character varying(255),
    unconfirmed_email character varying(255),
    phone_number_prefix_length bigint DEFAULT (0)::bigint NOT NULL,
    otp_secret character varying(255) DEFAULT ''::character varying NOT NULL,
    mfa_strategies text DEFAULT '[]'::text NOT NULL,
    app_totp_secret character varying(255),
    unconfirmed_phone_number character varying(255),
    unconfirmed_phone_number_prefix_length bigint,
    initials character varying(2) DEFAULT ''::character varying NOT NULL,
    old_password_hashes jsonb DEFAULT '[]'::jsonb,
    avatar_id uuid,
    gender character varying(9) DEFAULT 'Undefined'::character varying NOT NULL,
    job character varying(255),
    backup_codes_given boolean DEFAULT false NOT NULL,
    account_recovery_code_hash character varying(100),
    locked boolean DEFAULT false NOT NULL,
    recovery_mode boolean DEFAULT false NOT NULL,
    sso boolean DEFAULT false NOT NULL,
    registration_identity character varying(320)
);

-- CONSTRAINT: outbox_events PK_notification_outbox_events_id
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "PK_notification_outbox_events_id" PRIMARY KEY (id);

-- CONSTRAINT: outbox_events UQ_notification_outbox_events_dedupe_key
ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "UQ_notification_outbox_events_dedupe_key" UNIQUE (dedupe_key);

-- CONSTRAINT: auth_identities auth_identities_pkey
ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_pkey PRIMARY KEY (id);

-- CONSTRAINT: countries countries_pkey
ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);

-- CONSTRAINT: documents documents_pkey
ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);

-- CONSTRAINT: experiment_execution_molecule_links experiment_execution_molecule_links_pkey
ALTER TABLE ONLY public.experiment_execution_molecule_links
    ADD CONSTRAINT experiment_execution_molecule_links_pkey PRIMARY KEY (id);

-- CONSTRAINT: experiment_execution_synthesis_links experiment_execution_synthesis_links_pkey
ALTER TABLE ONLY public.experiment_execution_synthesis_links
    ADD CONSTRAINT experiment_execution_synthesis_links_pkey PRIMARY KEY (id);

-- CONSTRAINT: feedback feedback_pkey
ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);

-- CONSTRAINT: history history_pkey
ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (id);

-- CONSTRAINT: backup_codes idx_19502_primary
ALTER TABLE ONLY public.backup_codes
    ADD CONSTRAINT idx_19502_primary PRIMARY KEY (id);

-- CONSTRAINT: molecule_collections idx_19541_primary
ALTER TABLE ONLY public.molecule_collections
    ADD CONSTRAINT idx_19541_primary PRIMARY KEY (id);

-- CONSTRAINT: molecule_collection_items idx_19546_primary
ALTER TABLE ONLY public.molecule_collection_items
    ADD CONSTRAINT idx_19546_primary PRIMARY KEY (id);

-- CONSTRAINT: molecule_collection_items_join idx_19552_primary
ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT idx_19552_primary PRIMARY KEY (id);

-- CONSTRAINT: molecule_preview_view idx_19555_primary
ALTER TABLE ONLY public.molecule_preview_view
    ADD CONSTRAINT idx_19555_primary PRIMARY KEY (id);

-- CONSTRAINT: oauth2_tokens idx_19564_primary
ALTER TABLE ONLY public.oauth2_tokens
    ADD CONSTRAINT idx_19564_primary PRIMARY KEY (id);

-- CONSTRAINT: users idx_19589_primary
ALTER TABLE ONLY public.users
    ADD CONSTRAINT idx_19589_primary PRIMARY KEY (id);

-- CONSTRAINT: lab_experiment_protocol_revisions lab_experiment_protocol_revisions_pkey
ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT lab_experiment_protocol_revisions_pkey PRIMARY KEY (id);

-- CONSTRAINT: lab_notebook_executions lab_notebook_executions_pkey
ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT lab_notebook_executions_pkey PRIMARY KEY (id);

-- CONSTRAINT: lab_notebook_experiments lab_notebook_experiments_pkey
ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT lab_notebook_experiments_pkey PRIMARY KEY (id);

-- CONSTRAINT: lab_notebook_sections lab_notebook_sections_pkey
ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT lab_notebook_sections_pkey PRIMARY KEY (id);

-- CONSTRAINT: lab_notebooks lab_notebooks_pkey
ALTER TABLE ONLY public.lab_notebooks
    ADD CONSTRAINT lab_notebooks_pkey PRIMARY KEY (id);

-- CONSTRAINT: molecule_collection_items_join molecule_collection_items_join_user_id_collection_id_item_id_ke
ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT molecule_collection_items_join_user_id_collection_id_item_id_ke UNIQUE (user_id, collection_id, item_id);

-- CONSTRAINT: molecule_collection_items molecule_collection_items_user_molregno_unique
ALTER TABLE ONLY public.molecule_collection_items
    ADD CONSTRAINT molecule_collection_items_user_molregno_unique UNIQUE (user_id, chembl_molregno);

-- CONSTRAINT: molecule_name_i18n molecule_name_i18n_pkey
ALTER TABLE ONLY public.molecule_name_i18n
    ADD CONSTRAINT molecule_name_i18n_pkey PRIMARY KEY (molregno);

-- CONSTRAINT: notebook_experiment_synthesis_links notebook_experiment_synthesis_links_pkey
ALTER TABLE ONLY public.notebook_experiment_synthesis_links
    ADD CONSTRAINT notebook_experiment_synthesis_links_pkey PRIMARY KEY (id);

-- CONSTRAINT: account_activation_receipts pk_account_activation_receipts
ALTER TABLE ONLY public.account_activation_receipts
    ADD CONSTRAINT pk_account_activation_receipts PRIMARY KEY (jti);

-- CONSTRAINT: release_versions release_versions_pkey
ALTER TABLE ONLY public.release_versions
    ADD CONSTRAINT release_versions_pkey PRIMARY KEY (id);

-- CONSTRAINT: synth_step_items synth_step_items_pkey
ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT synth_step_items_pkey PRIMARY KEY (id);

-- CONSTRAINT: synth_steps synth_steps_pkey
ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT synth_steps_pkey PRIMARY KEY (id);

-- CONSTRAINT: synthesis synthesis_pkey
ALTER TABLE ONLY public.synthesis
    ADD CONSTRAINT synthesis_pkey PRIMARY KEY (id);

-- CONSTRAINT: synthesis_pool_collections synthesis_pool_collections_pkey
ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT synthesis_pool_collections_pkey PRIMARY KEY (id);

-- CONSTRAINT: synthesis_pool_molecules synthesis_pool_molecules_pkey
ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT synthesis_pool_molecules_pkey PRIMARY KEY (id);

-- CONSTRAINT: ticket_messages ticket_messages_pkey
ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);

-- CONSTRAINT: ticket_messages ticket_messages_public_id_key
ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_public_id_key UNIQUE (public_id);

-- CONSTRAINT: tickets tickets_pkey
ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);

-- CONSTRAINT: tickets tickets_public_id_key
ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_public_id_key UNIQUE (public_id);

-- CONSTRAINT: molecule_collections unique_name_per_user
ALTER TABLE ONLY public.molecule_collections
    ADD CONSTRAINT unique_name_per_user UNIQUE (name, user_id);

-- CONSTRAINT: auth_identities uq_auth_identity_user
ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT uq_auth_identity_user UNIQUE (user_id);

-- CONSTRAINT: experiment_execution_molecule_links uq_execution_molecule
ALTER TABLE ONLY public.experiment_execution_molecule_links
    ADD CONSTRAINT uq_execution_molecule UNIQUE (execution_id, item_id);

-- CONSTRAINT: lab_notebook_executions uq_execution_order
ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT uq_execution_order UNIQUE (experiment_id, execution_order) DEFERRABLE;

-- CONSTRAINT: experiment_execution_synthesis_links uq_execution_synthesis_step
ALTER TABLE ONLY public.experiment_execution_synthesis_links
    ADD CONSTRAINT uq_execution_synthesis_step UNIQUE NULLS NOT DISTINCT (execution_id, synthesis_id, step_id);

-- CONSTRAINT: notebook_experiment_synthesis_links uq_experiment_synthesis
ALTER TABLE ONLY public.notebook_experiment_synthesis_links
    ADD CONSTRAINT uq_experiment_synthesis UNIQUE (experiment_id, synthesis_id);

-- CONSTRAINT: lab_notebook_experiments uq_notebook_experiment_order
ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT uq_notebook_experiment_order UNIQUE (section_id, experiment_order) DEFERRABLE;

-- CONSTRAINT: lab_notebook_sections uq_notebook_section_order
ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT uq_notebook_section_order UNIQUE (notebook_id, section_order) DEFERRABLE;

-- CONSTRAINT: lab_experiment_protocol_revisions uq_protocol_revision_number
ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT uq_protocol_revision_number UNIQUE (experiment_id, revision_number);

-- CONSTRAINT: auth_identities uq_provider_subject
ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT uq_provider_subject UNIQUE (provider, provider_subject);

-- CONSTRAINT: synth_step_items uq_synth_step_item_position_order
ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT uq_synth_step_item_position_order UNIQUE (step_id, "position", item_order) DEFERRABLE;

-- CONSTRAINT: synth_steps uq_synth_step_order
ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT uq_synth_step_order UNIQUE (synth_id, step_order) DEFERRABLE;

-- CONSTRAINT: synthesis uq_synthesis_owner_title
ALTER TABLE ONLY public.synthesis
    ADD CONSTRAINT uq_synthesis_owner_title UNIQUE (user_id, title);

-- CONSTRAINT: synthesis_pool_collections uq_synthesis_pool_collection
ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT uq_synthesis_pool_collection UNIQUE (synthesis_id, collection_id);

-- CONSTRAINT: synthesis_pool_molecules uq_synthesis_pool_molecule
ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT uq_synthesis_pool_molecule UNIQUE (synthesis_id, molecule_id);

-- CONSTRAINT: user_notifications uq_user_notifications_dedupe
ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT uq_user_notifications_dedupe UNIQUE (dedupe_key);

-- CONSTRAINT: user_notifications user_notifications_pkey
ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT user_notifications_pkey PRIMARY KEY (id);

-- INDEX: feedback_context_meta_gin_idx
CREATE INDEX feedback_context_meta_gin_idx ON public.feedback USING gin (context_meta);

-- INDEX: feedback_context_ref_idx
CREATE INDEX feedback_context_ref_idx ON public.feedback USING btree (context_ref);

-- INDEX: feedback_env_anon_author_created_at_ms_idx
CREATE INDEX feedback_env_anon_author_created_at_ms_idx ON public.feedback USING btree (env, anon_author_key, created_at_ms DESC);

-- INDEX: feedback_env_context_kind_created_at_ms_idx
CREATE INDEX feedback_env_context_kind_created_at_ms_idx ON public.feedback USING btree (env, context_kind, created_at_ms DESC);

-- INDEX: feedback_env_contextkind_ref_created_idx
CREATE INDEX feedback_env_contextkind_ref_created_idx ON public.feedback USING btree (env, context_kind, context_ref, created_at_ms DESC);

-- INDEX: feedback_env_created_at_ms_idx
CREATE INDEX feedback_env_created_at_ms_idx ON public.feedback USING btree (env, created_at_ms DESC);

-- INDEX: feedback_env_kind_created_at_ms_idx
CREATE INDEX feedback_env_kind_created_at_ms_idx ON public.feedback USING btree (env, kind, created_at_ms DESC);

-- INDEX: feedback_env_status_created_at_ms_idx
CREATE INDEX feedback_env_status_created_at_ms_idx ON public.feedback USING btree (env, status, created_at_ms DESC);

-- INDEX: feedback_message_trgm_idx
CREATE INDEX feedback_message_trgm_idx ON public.feedback USING gin (message public.gin_trgm_ops);

-- INDEX: feedback_moderated_at_ms_idx
CREATE INDEX feedback_moderated_at_ms_idx ON public.feedback USING btree (moderated_at_ms DESC) WHERE (moderated_at_ms IS NOT NULL);

-- INDEX: feedback_moderated_by_created_at_ms_idx
CREATE INDEX feedback_moderated_by_created_at_ms_idx ON public.feedback USING btree (moderated_by_user_id, created_at_ms DESC) WHERE (moderated_by_user_id IS NOT NULL);

-- INDEX: feedback_prod_created_at_ms_idx
CREATE INDEX feedback_prod_created_at_ms_idx ON public.feedback USING btree (created_at_ms DESC) WHERE (env = 'prod'::public.feedback_env);

-- INDEX: feedback_status_idx
CREATE INDEX feedback_status_idx ON public.feedback USING btree (status);

-- INDEX: feedback_tags_gin_idx
CREATE INDEX feedback_tags_gin_idx ON public.feedback USING gin (tags);

-- INDEX: fki_users_documents_FK
CREATE INDEX "fki_users_documents_FK" ON public.users USING btree (avatar_id);

-- INDEX: idx_19502_fk_70066ea80d2f4b871beda32633b
CREATE INDEX idx_19502_fk_70066ea80d2f4b871beda32633b ON public.backup_codes USING btree (user_id);

-- INDEX: idx_19546_idx_5a6b7c28f3a5fb883bbc0564c3
CREATE INDEX idx_19546_idx_5a6b7c28f3a5fb883bbc0564c3 ON public.molecule_collection_items USING btree (chembl_molregno);

-- INDEX: idx_19564_idx_68e27096706c07e32b5ece1b38
CREATE UNIQUE INDEX idx_19564_idx_68e27096706c07e32b5ece1b38 ON public.oauth2_tokens USING btree (provider, user_id);

-- INDEX: idx_account_activation_receipts_user
CREATE INDEX idx_account_activation_receipts_user ON public.account_activation_receipts USING btree (user_id);

-- INDEX: idx_backup_codes_hash_unused
CREATE INDEX idx_backup_codes_hash_unused ON public.backup_codes USING btree (hash) WHERE (used = false);

-- INDEX: idx_backup_codes_user_unused
CREATE INDEX idx_backup_codes_user_unused ON public.backup_codes USING btree (user_id) WHERE (used = false);

-- INDEX: idx_documents_mime_type
CREATE INDEX idx_documents_mime_type ON public.documents USING btree (mime_type);

-- INDEX: idx_documents_scope
CREATE INDEX idx_documents_scope ON public.documents USING btree (scope);

-- INDEX: idx_documents_storage_type
CREATE INDEX idx_documents_storage_type ON public.documents USING btree (storage_type);

-- INDEX: idx_documents_user_id
CREATE INDEX idx_documents_user_id ON public.documents USING btree (user_id);

-- INDEX: idx_documents_user_scope_active_created_at_desc
CREATE INDEX idx_documents_user_scope_active_created_at_desc ON public.documents USING btree (user_id, scope, is_active, created_at DESC);

-- INDEX: idx_execution_molecule_links_item
CREATE INDEX idx_execution_molecule_links_item ON public.experiment_execution_molecule_links USING btree (item_id);

-- INDEX: idx_execution_molecule_links_user
CREATE INDEX idx_execution_molecule_links_user ON public.experiment_execution_molecule_links USING btree (user_id);

-- INDEX: idx_execution_synth_links_step
CREATE INDEX idx_execution_synth_links_step ON public.experiment_execution_synthesis_links USING btree (step_id);

-- INDEX: idx_execution_synth_links_synth
CREATE INDEX idx_execution_synth_links_synth ON public.experiment_execution_synthesis_links USING btree (synthesis_id);

-- INDEX: idx_execution_synth_links_user
CREATE INDEX idx_execution_synth_links_user ON public.experiment_execution_synthesis_links USING btree (user_id);

-- INDEX: idx_executions_owner_experiment
CREATE INDEX idx_executions_owner_experiment ON public.lab_notebook_executions USING btree (user_id, experiment_id);

-- INDEX: idx_executions_revision
CREATE INDEX idx_executions_revision ON public.lab_notebook_executions USING btree (protocol_revision_id);

-- INDEX: idx_experiment_synth_links_synth
CREATE INDEX idx_experiment_synth_links_synth ON public.notebook_experiment_synthesis_links USING btree (synthesis_id);

-- INDEX: idx_experiment_synth_links_user
CREATE INDEX idx_experiment_synth_links_user ON public.notebook_experiment_synthesis_links USING btree (user_id);

-- INDEX: idx_history_entity_item_touched_at_desc
CREATE INDEX idx_history_entity_item_touched_at_desc ON public.history USING btree (item_entity, item_id, touched_at DESC);

-- INDEX: idx_history_entity_touched_at_desc
CREATE INDEX idx_history_entity_touched_at_desc ON public.history USING btree (item_entity, touched_at DESC);

-- INDEX: idx_history_user_entity_item_touched_id_desc
CREATE INDEX idx_history_user_entity_item_touched_id_desc ON public.history USING btree (user_id, item_entity, item_id, touched_at DESC, id DESC);

-- INDEX: idx_history_user_touched_at_desc
CREATE INDEX idx_history_user_touched_at_desc ON public.history USING btree (user_id, touched_at DESC);

-- INDEX: idx_lab_notebooks_owner
CREATE INDEX idx_lab_notebooks_owner ON public.lab_notebooks USING btree (user_id);

-- INDEX: idx_mci_join_user_item_collection
CREATE INDEX idx_mci_join_user_item_collection ON public.molecule_collection_items_join USING btree (user_id, item_id, collection_id);

-- INDEX: idx_mci_user_type_touched_desc
CREATE INDEX idx_mci_user_type_touched_desc ON public.molecule_collection_items USING btree (user_id, type, touched_at DESC);

-- INDEX: idx_molecule_collection_items_join_collection_id
CREATE INDEX idx_molecule_collection_items_join_collection_id ON public.molecule_collection_items_join USING btree (collection_id);

-- INDEX: idx_molecule_collection_items_join_item_id
CREATE INDEX idx_molecule_collection_items_join_item_id ON public.molecule_collection_items_join USING btree (item_id);

-- INDEX: idx_molecule_collection_items_join_user_id
CREATE INDEX idx_molecule_collection_items_join_user_id ON public.molecule_collection_items_join USING btree (user_id);

-- INDEX: idx_molecule_collection_items_type
CREATE INDEX idx_molecule_collection_items_type ON public.molecule_collection_items USING btree (type);

-- INDEX: idx_molecule_collection_items_user_id
CREATE INDEX idx_molecule_collection_items_user_id ON public.molecule_collection_items USING btree (user_id);

-- INDEX: idx_molecule_collections_user_id
CREATE INDEX idx_molecule_collections_user_id ON public.molecule_collections USING btree (user_id);

-- INDEX: idx_molecule_collections_user_touched_desc
CREATE INDEX idx_molecule_collections_user_touched_desc ON public.molecule_collections USING btree (user_id, touched_at DESC);

-- INDEX: idx_notebook_experiments_owner_parent
CREATE INDEX idx_notebook_experiments_owner_parent ON public.lab_notebook_experiments USING btree (user_id, section_id);

-- INDEX: idx_notebook_sections_owner_parent
CREATE INDEX idx_notebook_sections_owner_parent ON public.lab_notebook_sections USING btree (user_id, notebook_id);

-- INDEX: idx_protocol_revisions_owner_experiment
CREATE INDEX idx_protocol_revisions_owner_experiment ON public.lab_experiment_protocol_revisions USING btree (user_id, experiment_id);

-- INDEX: idx_synth_step_items_owner_step
CREATE INDEX idx_synth_step_items_owner_step ON public.synth_step_items USING btree (user_id, step_id);

-- INDEX: idx_synth_step_items_pool
CREATE INDEX idx_synth_step_items_pool ON public.synth_step_items USING btree (pool_molecule_id);

-- INDEX: idx_synth_steps_owner_synth
CREATE INDEX idx_synth_steps_owner_synth ON public.synth_steps USING btree (user_id, synth_id);

-- INDEX: idx_synthesis_pool_collections_collection
CREATE INDEX idx_synthesis_pool_collections_collection ON public.synthesis_pool_collections USING btree (collection_id);

-- INDEX: idx_synthesis_pool_collections_owner
CREATE INDEX idx_synthesis_pool_collections_owner ON public.synthesis_pool_collections USING btree (user_id, synthesis_id);

-- INDEX: idx_synthesis_pool_molecules_molecule
CREATE INDEX idx_synthesis_pool_molecules_molecule ON public.synthesis_pool_molecules USING btree (molecule_id);

-- INDEX: idx_synthesis_pool_molecules_owner
CREATE INDEX idx_synthesis_pool_molecules_owner ON public.synthesis_pool_molecules USING btree (user_id, synthesis_id);

-- INDEX: idx_synthesis_user
CREATE INDEX idx_synthesis_user ON public.synthesis USING btree (user_id);

-- INDEX: idx_user_notifications_active_recent
CREATE INDEX idx_user_notifications_active_recent ON public.user_notifications USING btree (recipient_user_id, created_at DESC, id DESC) WHERE (dismissed_at IS NULL);

-- INDEX: idx_user_notifications_active_unread
CREATE INDEX idx_user_notifications_active_unread ON public.user_notifications USING btree (recipient_user_id, created_at DESC, id DESC) WHERE ((dismissed_at IS NULL) AND (read_at IS NULL));

-- INDEX: idx_user_notifications_active_unseen
CREATE INDEX idx_user_notifications_active_unseen ON public.user_notifications USING btree (recipient_user_id, created_at DESC, id DESC) WHERE ((dismissed_at IS NULL) AND (seen_at IS NULL));

-- INDEX: idx_user_notifications_recovery
CREATE INDEX idx_user_notifications_recovery ON public.user_notifications USING btree (recipient_user_id, revision);

-- INDEX: idx_users_account_recovery_code_hash
CREATE INDEX idx_users_account_recovery_code_hash ON public.users USING btree (account_recovery_code_hash);

-- INDEX: idx_users_oldpw_gin_ops
CREATE INDEX idx_users_oldpw_gin_ops ON public.users USING gin (old_password_hashes);

-- INDEX: ix_release_versions_beta_line
CREATE INDEX ix_release_versions_beta_line ON public.release_versions USING btree (major, minor, beta_iteration DESC) WHERE (context = 'beta'::public.release_context);

-- INDEX: ix_release_versions_context_created_at_desc
CREATE INDEX ix_release_versions_context_created_at_desc ON public.release_versions USING btree (context, created_at DESC);

-- INDEX: ix_release_versions_created_at
CREATE INDEX ix_release_versions_created_at ON public.release_versions USING btree (created_at DESC);

-- INDEX: ix_release_versions_prod_line
CREATE INDEX ix_release_versions_prod_line ON public.release_versions USING btree (major, minor, patch DESC) WHERE (context = 'prod'::public.release_context);

-- INDEX: messages_ticket_created_idx
CREATE INDEX messages_ticket_created_idx ON public.ticket_messages USING btree (ticket_id, created_at);

-- INDEX: messages_user_idx
CREATE INDEX messages_user_idx ON public.ticket_messages USING btree (user_id, created_at DESC);

-- INDEX: outbox_dispatch_idx
CREATE INDEX outbox_dispatch_idx ON public.outbox_events USING btree (status, available_at, claimed_at);

-- INDEX: outbox_pending_idx
CREATE INDEX outbox_pending_idx ON public.outbox_events USING btree (status, available_at);

-- INDEX: tickets_status_last_idx
CREATE INDEX tickets_status_last_idx ON public.tickets USING btree (status, last_message_at DESC);

-- INDEX: tickets_user_last_idx
CREATE INDEX tickets_user_last_idx ON public.tickets USING btree (user_id, last_message_at DESC);

-- INDEX: uq_auth_provider_email_lower_notnull
CREATE UNIQUE INDEX uq_auth_provider_email_lower_notnull ON public.auth_identities USING btree (provider, lower((email)::text)) WHERE (email IS NOT NULL);

-- INDEX: uq_countries_iso2
CREATE UNIQUE INDEX uq_countries_iso2 ON public.countries USING btree (iso2);

-- INDEX: uq_countries_name
CREATE UNIQUE INDEX uq_countries_name ON public.countries USING btree (name);

-- INDEX: uq_molecule_collection_items_user_system_key
CREATE UNIQUE INDEX uq_molecule_collection_items_user_system_key ON public.molecule_collection_items USING btree (user_id, system_key);

-- INDEX: uq_molecule_collections_user_system_key
CREATE UNIQUE INDEX uq_molecule_collections_user_system_key ON public.molecule_collections USING btree (user_id, system_key);

-- INDEX: uq_users_email_lower_local
CREATE UNIQUE INDEX uq_users_email_lower_local ON public.users USING btree (lower((email)::text)) WHERE ((email IS NOT NULL) AND (sso = false));

-- INDEX: ux_release_versions_components
CREATE UNIQUE INDEX ux_release_versions_components ON public.release_versions USING btree (context, major, minor, patch, beta_iteration);

-- INDEX: ux_release_versions_source_ref
CREATE UNIQUE INDEX ux_release_versions_source_ref ON public.release_versions USING btree (source_ref);

-- INDEX: ux_release_versions_version_sha256
CREATE UNIQUE INDEX ux_release_versions_version_sha256 ON public.release_versions USING btree (version_sha256);

-- INDEX: ux_release_versions_version_string
CREATE UNIQUE INDEX ux_release_versions_version_string ON public.release_versions USING btree (version_string);

-- TRIGGER: lab_notebook_executions trg_experiment_execution_history
CREATE TRIGGER trg_experiment_execution_history BEFORE DELETE OR UPDATE ON public.lab_notebook_executions FOR EACH ROW EXECUTE FUNCTION public.guard_experiment_execution_history();

-- TRIGGER: lab_experiment_protocol_revisions trg_protocol_revision_immutable
CREATE TRIGGER trg_protocol_revision_immutable BEFORE DELETE OR UPDATE ON public.lab_experiment_protocol_revisions FOR EACH ROW EXECUTE FUNCTION public.reject_protocol_revision_mutation();

-- TRIGGER: synthesis_pool_molecules trg_synthesis_pool_custom_only
CREATE TRIGGER trg_synthesis_pool_custom_only BEFORE INSERT OR UPDATE OF molecule_id ON public.synthesis_pool_molecules FOR EACH ROW EXECUTE FUNCTION public.assert_custom_synthesis_pool_item();

-- TRIGGER: user_notifications trg_user_notifications_revision
CREATE TRIGGER trg_user_notifications_revision BEFORE INSERT OR UPDATE ON public.user_notifications FOR EACH ROW EXECUTE FUNCTION public.assign_user_notification_revision();

-- FK CONSTRAINT: auth_identities auth_identities_user_id_fkey
ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT auth_identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FK CONSTRAINT: experiment_execution_molecule_links experiment_execution_molecule_links_execution_id_fkey
ALTER TABLE ONLY public.experiment_execution_molecule_links
    ADD CONSTRAINT experiment_execution_molecule_links_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.lab_notebook_executions(id) ON DELETE CASCADE;

-- FK CONSTRAINT: experiment_execution_molecule_links experiment_execution_molecule_links_item_id_fkey
ALTER TABLE ONLY public.experiment_execution_molecule_links
    ADD CONSTRAINT experiment_execution_molecule_links_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE;

-- FK CONSTRAINT: experiment_execution_synthesis_links experiment_execution_synthesis_links_execution_id_fkey
ALTER TABLE ONLY public.experiment_execution_synthesis_links
    ADD CONSTRAINT experiment_execution_synthesis_links_execution_id_fkey FOREIGN KEY (execution_id) REFERENCES public.lab_notebook_executions(id) ON DELETE CASCADE;

-- FK CONSTRAINT: experiment_execution_synthesis_links experiment_execution_synthesis_links_step_id_fkey
ALTER TABLE ONLY public.experiment_execution_synthesis_links
    ADD CONSTRAINT experiment_execution_synthesis_links_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.synth_steps(id) ON DELETE CASCADE;

-- FK CONSTRAINT: experiment_execution_synthesis_links experiment_execution_synthesis_links_synthesis_id_fkey
ALTER TABLE ONLY public.experiment_execution_synthesis_links
    ADD CONSTRAINT experiment_execution_synthesis_links_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;

-- FK CONSTRAINT: backup_codes fk_70066ea80d2f4b871beda32633b
ALTER TABLE ONLY public.backup_codes
    ADD CONSTRAINT fk_70066ea80d2f4b871beda32633b FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FK CONSTRAINT: account_activation_receipts fk_account_activation_receipts_user
ALTER TABLE ONLY public.account_activation_receipts
    ADD CONSTRAINT fk_account_activation_receipts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FK CONSTRAINT: molecule_collection_items_join fk_f10f716577fc9a7a25af6806df4
ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT fk_f10f716577fc9a7a25af6806df4 FOREIGN KEY (item_id) REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE;

-- FK CONSTRAINT: molecule_collection_items_join fk_f279211bb5d094e50296876fb15
ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT fk_f279211bb5d094e50296876fb15 FOREIGN KEY (collection_id) REFERENCES public.molecule_collections(id) ON DELETE CASCADE;

-- FK CONSTRAINT: user_notifications fk_user_notifications_recipient
ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT fk_user_notifications_recipient FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- FK CONSTRAINT: lab_experiment_protocol_revisions lab_experiment_protocol_revisions_experiment_id_fkey
ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT lab_experiment_protocol_revisions_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.lab_notebook_experiments(id) ON DELETE RESTRICT;

-- FK CONSTRAINT: lab_notebook_executions lab_notebook_executions_experiment_id_fkey
ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT lab_notebook_executions_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.lab_notebook_experiments(id) ON DELETE CASCADE;

-- FK CONSTRAINT: lab_notebook_executions lab_notebook_executions_protocol_revision_id_fkey
ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT lab_notebook_executions_protocol_revision_id_fkey FOREIGN KEY (protocol_revision_id) REFERENCES public.lab_experiment_protocol_revisions(id) ON DELETE RESTRICT;

-- FK CONSTRAINT: lab_notebook_experiments lab_notebook_experiments_section_id_fkey
ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT lab_notebook_experiments_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lab_notebook_sections(id) ON DELETE CASCADE;

-- FK CONSTRAINT: lab_notebook_sections lab_notebook_sections_notebook_id_fkey
ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT lab_notebook_sections_notebook_id_fkey FOREIGN KEY (notebook_id) REFERENCES public.lab_notebooks(id) ON DELETE CASCADE;

-- FK CONSTRAINT: notebook_experiment_synthesis_links notebook_experiment_synthesis_links_experiment_id_fkey
ALTER TABLE ONLY public.notebook_experiment_synthesis_links
    ADD CONSTRAINT notebook_experiment_synthesis_links_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES public.lab_notebook_experiments(id) ON DELETE CASCADE;

-- FK CONSTRAINT: notebook_experiment_synthesis_links notebook_experiment_synthesis_links_synthesis_id_fkey
ALTER TABLE ONLY public.notebook_experiment_synthesis_links
    ADD CONSTRAINT notebook_experiment_synthesis_links_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synth_step_items synth_step_items_pool_molecule_id_fkey
ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT synth_step_items_pool_molecule_id_fkey FOREIGN KEY (pool_molecule_id) REFERENCES public.synthesis_pool_molecules(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synth_step_items synth_step_items_step_id_fkey
ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT synth_step_items_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.synth_steps(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synth_steps synth_steps_synth_id_fkey
ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT synth_steps_synth_id_fkey FOREIGN KEY (synth_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synthesis_pool_collections synthesis_pool_collections_collection_id_fkey
ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT synthesis_pool_collections_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.molecule_collections(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synthesis_pool_collections synthesis_pool_collections_synthesis_id_fkey
ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT synthesis_pool_collections_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synthesis_pool_molecules synthesis_pool_molecules_molecule_id_fkey
ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT synthesis_pool_molecules_molecule_id_fkey FOREIGN KEY (molecule_id) REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE;

-- FK CONSTRAINT: synthesis_pool_molecules synthesis_pool_molecules_synthesis_id_fkey
ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT synthesis_pool_molecules_synthesis_id_fkey FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;

-- FK CONSTRAINT: ticket_messages ticket_messages_ticket_id_fkey
ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;

-- FK CONSTRAINT: ticket_messages ticket_messages_user_id_fkey
ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

-- FK CONSTRAINT: tickets tickets_user_id_fkey
ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE NOT VALID;

-- FK CONSTRAINT: users users_documents_FK
ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_documents_FK" FOREIGN KEY (avatar_id) REFERENCES public.documents(id) ON UPDATE SET NULL ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

-- TABLE: storage_operations
CREATE TABLE public.storage_operations (
    id uuid NOT NULL,
    document_id uuid,
    type character varying(30) NOT NULL,
    object_key character varying(1024) NOT NULL,
    status character varying(30) NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    next_attempt_at bigint NOT NULL,
    created_at bigint NOT NULL,
    completed_at bigint,
    last_error text,
    dedupe_key character varying(255) NOT NULL
);

-- CONSTRAINT: storage_operations PK_b619692865df0f8aad54ba22a53
ALTER TABLE ONLY public.storage_operations
    ADD CONSTRAINT "PK_b619692865df0f8aad54ba22a53" PRIMARY KEY (id);

-- INDEX: IDX_da97655d6791e511d80fc4a400
CREATE UNIQUE INDEX "IDX_da97655d6791e511d80fc4a400" ON public.storage_operations USING btree (dedupe_key);

-- INDEX: storage_operations_due_idx
CREATE INDEX storage_operations_due_idx ON public.storage_operations USING btree (status, next_attempt_at);

-- Nessun oggetto embeddings deve essere stato rimosso, ricreato o invalidato.
DO $verify$
BEGIN
 IF EXISTS (
  SELECT 1 FROM embedding_objects_before old
  LEFT JOIN pg_class c ON c.oid=old.oid
  LEFT JOIN pg_index i ON i.indexrelid=c.oid
  WHERE c.oid IS NULL OR c.relname IS DISTINCT FROM old.relname
   OR pg_relation_filenode(c.oid) IS DISTINCT FROM old.filenode
   OR i.indisvalid IS DISTINCT FROM old.indisvalid
   OR i.indisready IS DISTINCT FROM old.indisready
   OR pg_get_indexdef(i.indexrelid) IS DISTINCT FROM old.definition
 ) THEN RAISE EXCEPTION 'Verifica embeddings fallita: transazione annullata'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public'
       AND tablename=ANY(ARRAY['account_activation_receipts','auth_identities','backup_codes','countries','documents','experiment_execution_molecule_links','experiment_execution_synthesis_links','feedback','history','lab_experiment_protocol_revisions','lab_notebook_executions','lab_notebook_experiments','lab_notebook_sections','lab_notebooks','molecule_collection_items','molecule_collection_items_join','molecule_collections','molecule_name_i18n','molecule_preview_view','notebook_experiment_synthesis_links','oauth2_tokens','outbox_events','release_versions','storage_operations','synth_step_items','synth_steps','synthesis','synthesis_pool_collections','synthesis_pool_molecules','ticket_messages','tickets','user_notifications','users']::text[])) <> 33 THEN
  RAISE EXCEPTION 'Numero tabelle applicative inatteso';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_attrdef d
     ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid='public.users'::regclass AND a.attname='created_at')
 OR NOT EXISTS (SELECT 1 FROM pg_attribute a JOIN pg_attrdef d
     ON d.adrelid=a.attrelid AND d.adnum=a.attnum
     WHERE a.attrelid='public.users'::regclass AND a.attname='updated_at') THEN
  RAISE EXCEPTION 'Default utenti assenti';
 END IF;
END $verify$;
COMMIT;
SELECT 'APPLICATION_SCHEMA_REBUILT_EMBEDDINGS_PRESERVED' AS status;
