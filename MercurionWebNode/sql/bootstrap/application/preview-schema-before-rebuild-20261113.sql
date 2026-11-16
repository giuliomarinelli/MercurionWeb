--
-- PostgreSQL database dump
--

\restrict WPewoUe99NilTZJEogdzapHMWdAaMqcwIne1sSwPrOR8dzZyQUIvblscDcOysUX

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: feedback_context_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_context_kind_enum AS ENUM (
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


--
-- Name: feedback_env_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_env_enum AS ENUM (
    'staging',
    'prod'
);


--
-- Name: feedback_kind_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_kind_enum AS ENUM (
    'bug',
    'ux',
    'idea',
    'question',
    'other'
);


--
-- Name: feedback_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_source_enum AS ENUM (
    'manual_page',
    'prompted'
);


--
-- Name: feedback_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.feedback_status_enum AS ENUM (
    'new',
    'triaged',
    'resolved',
    'spam'
);


--
-- Name: release_context; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.release_context AS ENUM (
    'beta',
    'prod'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_activation_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_activation_receipts (
    jti character varying(255) NOT NULL,
    user_id uuid NOT NULL,
    email character varying(320) NOT NULL,
    recovery_code text NOT NULL,
    created_at bigint NOT NULL
);


--
-- Name: auth_identities; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: backup_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backup_codes (
    id uuid NOT NULL,
    hash character varying NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at bigint NOT NULL,
    used_at bigint,
    user_id uuid NOT NULL
);


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    iso2 character(2),
    emoji character varying(191),
    emoji_u character varying(191),
    latitude numeric(10,8),
    longitude numeric(11,8),
    phonecode character varying(255)
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id character varying NOT NULL,
    user_id uuid NOT NULL,
    storage_type character varying(32) NOT NULL,
    storage_path character varying(1024) NOT NULL,
    original_name character varying(255) NOT NULL,
    size bigint NOT NULL,
    mime_type character varying(128) NOT NULL,
    note text,
    is_public boolean DEFAULT false NOT NULL,
    created_at bigint,
    updated_at bigint,
    scope character varying NOT NULL,
    is_active boolean NOT NULL
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id uuid NOT NULL,
    created_at_ms bigint NOT NULL,
    env public.feedback_env_enum NOT NULL,
    source public.feedback_source_enum DEFAULT 'manual_page'::public.feedback_source_enum NOT NULL,
    kind public.feedback_kind_enum DEFAULT 'other'::public.feedback_kind_enum NOT NULL,
    anon_author_key text NOT NULL,
    rating_utility smallint,
    rating_clarity smallint,
    rating_experience smallint,
    message text,
    context_kind public.feedback_context_kind_enum DEFAULT 'global'::public.feedback_context_kind_enum NOT NULL,
    context_ref text,
    context_meta jsonb,
    client_version text,
    status public.feedback_status_enum DEFAULT 'new'::public.feedback_status_enum NOT NULL,
    internal_note text,
    tags text[],
    CONSTRAINT feedback_created_at_ms_positive CHECK ((created_at_ms > 0)),
    CONSTRAINT feedback_non_empty CHECK (((message IS NOT NULL) OR (rating_utility IS NOT NULL) OR (rating_clarity IS NOT NULL) OR (rating_experience IS NOT NULL)))
);


--
-- Name: history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history (
    id uuid NOT NULL,
    item_entity character varying NOT NULL,
    touched_at bigint NOT NULL,
    item_id uuid NOT NULL,
    user_id uuid NOT NULL,
    flag_ids text NOT NULL
);


--
-- Name: lab_experiment_protocol_revisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_experiment_protocol_revisions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    experiment_id uuid NOT NULL,
    revision_number integer NOT NULL,
    snapshot_schema_version integer DEFAULT 1 NOT NULL,
    snapshot jsonb NOT NULL,
    checksum_sha256 character(64) NOT NULL,
    created_at bigint NOT NULL,
    created_by uuid NOT NULL
);


--
-- Name: lab_notebook_executions; Type: TABLE; Schema: public; Owner: -
--

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
    updated_at bigint NOT NULL
);


--
-- Name: lab_notebook_experiments; Type: TABLE; Schema: public; Owner: -
--

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
    archived_at bigint
);


--
-- Name: lab_notebook_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_notebook_sections (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    notebook_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    section_order integer NOT NULL,
    content_delta jsonb,
    sanitized_text text DEFAULT ''::text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL
);


--
-- Name: lab_notebooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lab_notebooks (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    premise_delta jsonb,
    premise_text text DEFAULT ''::text NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    archived_at bigint
);


--
-- Name: molecule_collection_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecule_collection_items (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    label character varying,
    notes text,
    type character varying NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    touched_at bigint NOT NULL,
    alias character varying,
    system_key character varying,
    canonical_smiles text,
    mol_formula text,
    name text,
    properties_json text,
    chembl_molregno bigint,
    name_en character varying
);


--
-- Name: molecule_collection_items_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecule_collection_items_join (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    item_id uuid NOT NULL
);


--
-- Name: molecule_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecule_collections (
    id uuid NOT NULL,
    name character varying NOT NULL,
    system_key character varying,
    user_id uuid NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    touched_at bigint NOT NULL
);


--
-- Name: molecule_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.molecule_embeddings (
    stable_uuid uuid NOT NULL,
    molregno integer NOT NULL,
    smiles text NOT NULL,
    embedding public.vector(768),
    embedding_model text DEFAULT 'seyonec/ChemBERTa-zinc-base-v1'::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    preferred_name text
);


--
-- Name: oauth2_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oauth2_tokens (
    id character varying NOT NULL,
    provider character varying(32) NOT NULL,
    user_id uuid,
    refresh_token text NOT NULL,
    scope character varying(255),
    created_at bigint,
    updated_at bigint
);


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: release_versions; Type: TABLE; Schema: public; Owner: -
--

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
    source_ref character varying(128) NOT NULL,
    release_notes jsonb
);


--
-- Name: storage_operations; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: synth_step_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.synth_step_items (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    step_id uuid NOT NULL,
    pool_molecule_id uuid,
    text text,
    kind character varying NOT NULL,
    "position" character varying NOT NULL,
    item_order integer NOT NULL,
    CONSTRAINT ck_synth_step_item_kind CHECK (((kind)::text = ANY (ARRAY[('Reactant'::character varying)::text, ('Reagent'::character varying)::text, ('Solvent'::character varying)::text, ('Condition'::character varying)::text, ('Catalyst'::character varying)::text, ('Product'::character varying)::text, ('Byproduct'::character varying)::text, ('Other'::character varying)::text]))),
    CONSTRAINT ck_synth_step_item_nonempty CHECK (((pool_molecule_id IS NOT NULL) OR (NULLIF(btrim(text), ''::text) IS NOT NULL))),
    CONSTRAINT ck_synth_step_item_order_non_negative CHECK ((item_order >= 0)),
    CONSTRAINT ck_synth_step_item_position CHECK ((("position")::text = ANY (ARRAY[('BeforeArrow'::character varying)::text, ('OnArrow'::character varying)::text, ('AfterArrow'::character varying)::text])))
);


--
-- Name: synth_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.synth_steps (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synth_id uuid NOT NULL,
    step_order integer NOT NULL,
    description text,
    reaction_type character varying,
    CONSTRAINT ck_synth_step_order_non_negative CHECK ((step_order >= 0))
);


--
-- Name: synthesis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.synthesis (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    title character varying NOT NULL,
    notes text
);


--
-- Name: synthesis_pool_collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.synthesis_pool_collections (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    collection_id uuid NOT NULL
);


--
-- Name: synthesis_pool_molecules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.synthesis_pool_molecules (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    synthesis_id uuid NOT NULL,
    molecule_id uuid NOT NULL
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid NOT NULL,
    public_id bigint NOT NULL,
    ticket_id uuid NOT NULL,
    author_type character varying(30) NOT NULL,
    author_id uuid,
    user_id uuid NOT NULL,
    content_delta jsonb NOT NULL,
    content_html text NOT NULL,
    created_at bigint NOT NULL,
    CONSTRAINT ck_ticket_messages_public_id_positive CHECK ((public_id > 0))
);


--
-- Name: ticket_messages_public_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ticket_messages_public_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ticket_messages_public_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ticket_messages_public_id_seq OWNED BY public.ticket_messages.public_id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid NOT NULL,
    public_id bigint NOT NULL,
    user_id uuid NOT NULL,
    subject character varying(255) NOT NULL,
    status character varying(30) DEFAULT 'Open'::character varying NOT NULL,
    last_message_at bigint NOT NULL,
    created_at bigint NOT NULL,
    updated_at bigint NOT NULL,
    CONSTRAINT ck_tickets_public_id_positive CHECK ((public_id > 0))
);


--
-- Name: tickets_public_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tickets_public_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tickets_public_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tickets_public_id_seq OWNED BY public.tickets.public_id;


--
-- Name: user_notifications; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying,
    registration_identity character varying(320),
    unconfirmed_email character varying,
    complete_phone_number character varying,
    phone_number_prefix_length bigint DEFAULT '0'::bigint NOT NULL,
    unconfirmed_phone_number character varying,
    unconfirmed_phone_number_prefix_length bigint,
    password_hash character varying(100),
    first_name character varying DEFAULT ''::character varying NOT NULL,
    last_name character varying DEFAULT ''::character varying NOT NULL,
    gender character varying DEFAULT 'Undefined'::character varying NOT NULL,
    job character varying,
    initials character varying(2) DEFAULT ''::character varying NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    mfa_strategies text DEFAULT '[]'::text NOT NULL,
    created_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    updated_at bigint DEFAULT ((EXTRACT(epoch FROM now()) * (1000)::numeric))::bigint NOT NULL,
    otp_secret character varying DEFAULT ''::character varying NOT NULL,
    app_totp_secret character varying,
    old_password_hashes jsonb DEFAULT '[]'::jsonb NOT NULL,
    avatar_id character varying,
    backup_codes_given boolean DEFAULT false NOT NULL,
    account_recovery_code_hash character varying,
    locked boolean DEFAULT false NOT NULL,
    recovery_mode boolean DEFAULT false NOT NULL,
    sso boolean DEFAULT false NOT NULL
);


--
-- Name: ticket_messages public_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages ALTER COLUMN public_id SET DEFAULT nextval('public.ticket_messages_public_id_seq'::regclass);


--
-- Name: tickets public_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets ALTER COLUMN public_id SET DEFAULT nextval('public.tickets_public_id_seq'::regclass);


--
-- Name: lab_notebook_sections PK_0a0d8aa3d87cd177c9260af5803; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT "PK_0a0d8aa3d87cd177c9260af5803" PRIMARY KEY (id);


--
-- Name: synthesis PK_262d7e38221e68b80de71ce3134; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis
    ADD CONSTRAINT "PK_262d7e38221e68b80de71ce3134" PRIMARY KEY (id);


--
-- Name: molecule_collections PK_27bbec66b841320242f7d57942c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collections
    ADD CONSTRAINT "PK_27bbec66b841320242f7d57942c" PRIMARY KEY (id);


--
-- Name: lab_notebook_executions PK_2c723690b96ccc66b56a5b75dc9; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT "PK_2c723690b96ccc66b56a5b75dc9" PRIMARY KEY (id);


--
-- Name: oauth2_tokens PK_32570683e5d515faea659c3dbab; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oauth2_tokens
    ADD CONSTRAINT "PK_32570683e5d515faea659c3dbab" PRIMARY KEY (id);


--
-- Name: synthesis_pool_collections PK_33e7b8d7e41935e7ac11c8a6f16; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT "PK_33e7b8d7e41935e7ac11c8a6f16" PRIMARY KEY (id);


--
-- Name: tickets PK_343bc942ae261cf7a1377f48fd0; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "PK_343bc942ae261cf7a1377f48fd0" PRIMARY KEY (id);


--
-- Name: backup_codes PK_34ab957382dbc57e8fb53f1638f; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_codes
    ADD CONSTRAINT "PK_34ab957382dbc57e8fb53f1638f" PRIMARY KEY (id);


--
-- Name: ticket_messages PK_37beb692dedf7eccb4e519ccec1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "PK_37beb692dedf7eccb4e519ccec1" PRIMARY KEY (id);


--
-- Name: lab_experiment_protocol_revisions PK_4063a0817d2a584e8ff8bff4b79; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT "PK_4063a0817d2a584e8ff8bff4b79" PRIMARY KEY (id);


--
-- Name: synth_steps PK_4b8fe8e68d19d1ec8a5e946c708; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT "PK_4b8fe8e68d19d1ec8a5e946c708" PRIMARY KEY (id);


--
-- Name: user_notifications PK_569622b0fd6e6ab3661de985a2b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT "PK_569622b0fd6e6ab3661de985a2b" PRIMARY KEY (id);


--
-- Name: release_versions PK_59591e5c96a2b9516c7814352a6; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.release_versions
    ADD CONSTRAINT "PK_59591e5c96a2b9516c7814352a6" PRIMARY KEY (id);


--
-- Name: synth_step_items PK_5965acf36b6587faded6a147c86; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT "PK_5965acf36b6587faded6a147c86" PRIMARY KEY (id);


--
-- Name: account_activation_receipts PK_59b0c202eff16f155fc6be44e61; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_activation_receipts
    ADD CONSTRAINT "PK_59b0c202eff16f155fc6be44e61" PRIMARY KEY (jti);


--
-- Name: auth_identities PK_63a29aebcddd09448dbeee4666b; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT "PK_63a29aebcddd09448dbeee4666b" PRIMARY KEY (id);


--
-- Name: outbox_events PK_6689a16c00d09b8089f6237f1d2; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "PK_6689a16c00d09b8089f6237f1d2" PRIMARY KEY (id);


--
-- Name: lab_notebook_experiments PK_6740741a888c63622cc7f0ee7d4; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT "PK_6740741a888c63622cc7f0ee7d4" PRIMARY KEY (id);


--
-- Name: molecule_collection_items PK_835bd803ff647d860837b33a621; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collection_items
    ADD CONSTRAINT "PK_835bd803ff647d860837b33a621" PRIMARY KEY (id);


--
-- Name: feedback PK_8389f9e087a57689cd5be8b2b13; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT "PK_8389f9e087a57689cd5be8b2b13" PRIMARY KEY (id);


--
-- Name: history PK_9384942edf4804b38ca0ee51416; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT "PK_9384942edf4804b38ca0ee51416" PRIMARY KEY (id);


--
-- Name: molecule_embeddings PK_9920b2884e55127d09c8806c911; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_embeddings
    ADD CONSTRAINT "PK_9920b2884e55127d09c8806c911" PRIMARY KEY (stable_uuid);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: documents PK_ac51aa5181ee2036f5ca482857c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT "PK_ac51aa5181ee2036f5ca482857c" PRIMARY KEY (id);


--
-- Name: countries PK_b2d7006793e8697ab3ae2deff18; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT "PK_b2d7006793e8697ab3ae2deff18" PRIMARY KEY (id);


--
-- Name: storage_operations PK_b619692865df0f8aad54ba22a53; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_operations
    ADD CONSTRAINT "PK_b619692865df0f8aad54ba22a53" PRIMARY KEY (id);


--
-- Name: lab_notebooks PK_c382ebcc191b6383d293b1b8a3a; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebooks
    ADD CONSTRAINT "PK_c382ebcc191b6383d293b1b8a3a" PRIMARY KEY (id);


--
-- Name: synthesis_pool_molecules PK_c98fa00d0908a322da317598a5e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT "PK_c98fa00d0908a322da317598a5e" PRIMARY KEY (id);


--
-- Name: molecule_collection_items_join PK_f813facf69ec6784b3f9ad09b74; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT "PK_f813facf69ec6784b3f9ad09b74" PRIMARY KEY (id);


--
-- Name: users REL_c3401836efedec3bec459c8f81; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "REL_c3401836efedec3bec459c8f81" UNIQUE (avatar_id);


--
-- Name: outbox_events UQ_07121831383f239a044f95eab04; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT "UQ_07121831383f239a044f95eab04" UNIQUE (dedupe_key);


--
-- Name: ticket_messages UQ_4640bd255fbffc2c891c4e4ca9e; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "UQ_4640bd255fbffc2c891c4e4ca9e" UNIQUE (public_id);


--
-- Name: tickets UQ_68e6889e77f60cb118b5337229c; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT "UQ_68e6889e77f60cb118b5337229c" UNIQUE (public_id);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: molecule_collection_items_join molecule_collection_items_join_user_id_collection_id_item_id_ke; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT molecule_collection_items_join_user_id_collection_id_item_id_ke UNIQUE (user_id, collection_id, item_id);


--
-- Name: lab_notebook_executions uq_execution_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT uq_execution_order UNIQUE (experiment_id, execution_order);


--
-- Name: lab_notebook_experiments uq_notebook_experiment_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT uq_notebook_experiment_order UNIQUE (section_id, experiment_order);


--
-- Name: lab_notebook_sections uq_notebook_section_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT uq_notebook_section_order UNIQUE (notebook_id, section_order);


--
-- Name: lab_experiment_protocol_revisions uq_protocol_revision_number; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT uq_protocol_revision_number UNIQUE (experiment_id, revision_number);


--
-- Name: synth_step_items uq_synth_step_item_position_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT uq_synth_step_item_position_order UNIQUE (step_id, "position", item_order);


--
-- Name: synth_steps uq_synth_step_order; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT uq_synth_step_order UNIQUE (synth_id, step_order);


--
-- Name: synthesis uq_synthesis_owner_title; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis
    ADD CONSTRAINT uq_synthesis_owner_title UNIQUE (user_id, title);


--
-- Name: synthesis_pool_collections uq_synthesis_pool_collection; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT uq_synthesis_pool_collection UNIQUE (synthesis_id, collection_id);


--
-- Name: synthesis_pool_molecules uq_synthesis_pool_molecule; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT uq_synthesis_pool_molecule UNIQUE (synthesis_id, molecule_id);


--
-- Name: IDX_1b74d0b172890060fc0ee20d46; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_1b74d0b172890060fc0ee20d46" ON public.synth_steps USING btree (user_id);


--
-- Name: IDX_2238b5e135a1a22cc2a2882349; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_2238b5e135a1a22cc2a2882349" ON public.synthesis_pool_molecules USING btree (user_id);


--
-- Name: IDX_4e1e9276fa80af9ecf92ed8c94; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_4e1e9276fa80af9ecf92ed8c94" ON public.molecule_collections USING btree (user_id);


--
-- Name: IDX_5a6b7c28f3a5fb883bbc0564c3; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5a6b7c28f3a5fb883bbc0564c3" ON public.molecule_collection_items USING btree (chembl_molregno);


--
-- Name: IDX_5cdbec673a4054c3ca905a35db; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_5cdbec673a4054c3ca905a35db" ON public.documents USING btree (storage_type);


--
-- Name: IDX_6553e60c1da09ba0ef70530775; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_6553e60c1da09ba0ef70530775" ON public.documents USING btree (user_id, storage_type, storage_path);


--
-- Name: IDX_68e27096706c07e32b5ece1b38; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_68e27096706c07e32b5ece1b38" ON public.oauth2_tokens USING btree (provider, user_id);


--
-- Name: IDX_6a40e9066804dca20e5dc4ddf7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_6a40e9066804dca20e5dc4ddf7" ON public.synthesis_pool_molecules USING btree (synthesis_id);


--
-- Name: IDX_850187886599a2ca7e13402642; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_850187886599a2ca7e13402642" ON public.synth_step_items USING btree (user_id);


--
-- Name: IDX_8a07bb9845dafbd2002b7bc395; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8a07bb9845dafbd2002b7bc395" ON public.synthesis_pool_collections USING btree (synthesis_id);


--
-- Name: IDX_8d60498f6612e6bcddf1105e75; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_8d60498f6612e6bcddf1105e75" ON public.synth_steps USING btree (synth_id);


--
-- Name: IDX_c6219a8edcd021ac7779ae41d4; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c6219a8edcd021ac7779ae41d4" ON public.synthesis_pool_collections USING btree (collection_id);


--
-- Name: IDX_c7481daf5059307842edef74d7; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_c7481daf5059307842edef74d7" ON public.documents USING btree (user_id);


--
-- Name: IDX_cdcb3470974a67b8935b4cc528; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_cdcb3470974a67b8935b4cc528" ON public.synth_step_items USING btree (pool_molecule_id);


--
-- Name: IDX_d0cad25d12d7d89a801c080270; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d0cad25d12d7d89a801c080270" ON public.synthesis_pool_collections USING btree (user_id);


--
-- Name: IDX_d53c3b54e0d80506f70f08df07; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d53c3b54e0d80506f70f08df07" ON public.synthesis USING btree (user_id);


--
-- Name: IDX_d6aa78263e12110a73a2b8d065; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d6aa78263e12110a73a2b8d065" ON public.molecule_collection_items_join USING btree (user_id);


--
-- Name: IDX_d826b643be6d30fe7cedc429c2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d826b643be6d30fe7cedc429c2" ON public.molecule_collection_items USING btree (user_id);


--
-- Name: IDX_d8d3bae04b9de245c6cca77fd6; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_d8d3bae04b9de245c6cca77fd6" ON public.synth_step_items USING btree (step_id);


--
-- Name: IDX_da97655d6791e511d80fc4a400; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "IDX_da97655d6791e511d80fc4a400" ON public.storage_operations USING btree (dedupe_key);


--
-- Name: IDX_db59c035fa2eeb342481bcefd2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_db59c035fa2eeb342481bcefd2" ON public.synthesis_pool_molecules USING btree (molecule_id);


--
-- Name: IDX_ef55ec3050b3790b34bbd62545; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "IDX_ef55ec3050b3790b34bbd62545" ON public.molecule_collection_items USING btree (type);


--
-- Name: feedback_context_ref_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_context_ref_idx ON public.feedback USING btree (context_ref);


--
-- Name: feedback_env_anon_author_created_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_env_anon_author_created_at_ms_idx ON public.feedback USING btree (env, anon_author_key, created_at_ms);


--
-- Name: feedback_env_context_kind_created_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_env_context_kind_created_at_ms_idx ON public.feedback USING btree (env, context_kind, created_at_ms);


--
-- Name: feedback_env_created_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_env_created_at_ms_idx ON public.feedback USING btree (env, created_at_ms);


--
-- Name: feedback_env_kind_created_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_env_kind_created_at_ms_idx ON public.feedback USING btree (env, kind, created_at_ms);


--
-- Name: feedback_env_status_created_at_ms_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_env_status_created_at_ms_idx ON public.feedback USING btree (env, status, created_at_ms);


--
-- Name: feedback_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_status_idx ON public.feedback USING btree (status);


--
-- Name: idx_account_activation_receipts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_activation_receipts_user ON public.account_activation_receipts USING btree (user_id);


--
-- Name: idx_auth_identities_user_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_identities_user_provider ON public.auth_identities USING btree (user_id, provider);


--
-- Name: idx_executions_owner_experiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_executions_owner_experiment ON public.lab_notebook_executions USING btree (user_id, experiment_id);


--
-- Name: idx_lab_notebooks_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lab_notebooks_owner ON public.lab_notebooks USING btree (user_id);


--
-- Name: idx_mci_join_user_item_collection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mci_join_user_item_collection ON public.molecule_collection_items_join USING btree (user_id, item_id, collection_id);


--
-- Name: idx_me_hnsw_cos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_me_hnsw_cos ON public.molecule_embeddings USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_molecule_collection_items_user_touched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_molecule_collection_items_user_touched ON public.molecule_collection_items USING btree (user_id, touched_at);


--
-- Name: idx_molecule_collections_user_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_molecule_collections_user_name ON public.molecule_collections USING btree (user_id, name);


--
-- Name: idx_molecule_collections_user_touched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_molecule_collections_user_touched ON public.molecule_collections USING btree (user_id, touched_at);


--
-- Name: idx_notebook_experiments_owner_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notebook_experiments_owner_parent ON public.lab_notebook_experiments USING btree (user_id, section_id);


--
-- Name: idx_notebook_sections_owner_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notebook_sections_owner_parent ON public.lab_notebook_sections USING btree (user_id, notebook_id);


--
-- Name: idx_protocol_revisions_owner_experiment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_protocol_revisions_owner_experiment ON public.lab_experiment_protocol_revisions USING btree (user_id, experiment_id);


--
-- Name: idx_uniq_molecule_embeddings; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_uniq_molecule_embeddings ON public.molecule_embeddings USING btree (molregno);


--
-- Name: idx_user_notifications_active_recent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_active_recent ON public.user_notifications USING btree (recipient_user_id, created_at, id) WHERE (dismissed_at IS NULL);


--
-- Name: idx_user_notifications_active_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_active_unread ON public.user_notifications USING btree (recipient_user_id, created_at, id) WHERE ((dismissed_at IS NULL) AND (read_at IS NULL));


--
-- Name: idx_user_notifications_active_unseen; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_active_unseen ON public.user_notifications USING btree (recipient_user_id, created_at, id) WHERE ((dismissed_at IS NULL) AND (seen_at IS NULL));


--
-- Name: idx_user_notifications_recovery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_notifications_recovery ON public.user_notifications USING btree (recipient_user_id, revision);


--
-- Name: messages_ticket_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_ticket_created_idx ON public.ticket_messages USING btree (ticket_id, created_at);


--
-- Name: messages_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX messages_user_idx ON public.ticket_messages USING btree (user_id, created_at);


--
-- Name: outbox_dispatch_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_dispatch_idx ON public.outbox_events USING btree (status, available_at, claimed_at);


--
-- Name: outbox_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX outbox_pending_idx ON public.outbox_events USING btree (status, available_at);


--
-- Name: storage_operations_due_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX storage_operations_due_idx ON public.storage_operations USING btree (status, next_attempt_at);


--
-- Name: tickets_user_last_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tickets_user_last_idx ON public.tickets USING btree (user_id, last_message_at);


--
-- Name: uq_auth_identities_provider_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_auth_identities_provider_subject ON public.auth_identities USING btree (provider, provider_subject);


--
-- Name: uq_molecule_collection_items_id_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_molecule_collection_items_id_user ON public.molecule_collection_items USING btree (id, user_id);


--
-- Name: uq_molecule_collection_items_user_system_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_molecule_collection_items_user_system_key ON public.molecule_collection_items USING btree (user_id, system_key);


--
-- Name: uq_molecule_collections_id_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_molecule_collections_id_user ON public.molecule_collections USING btree (id, user_id);


--
-- Name: uq_molecule_collections_user_system_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_molecule_collections_user_system_key ON public.molecule_collections USING btree (user_id, system_key);


--
-- Name: uq_user_notifications_dedupe; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_user_notifications_dedupe ON public.user_notifications USING btree (dedupe_key);


--
-- Name: uq_users_registration_identity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_users_registration_identity ON public.users USING btree (registration_identity) WHERE (registration_identity IS NOT NULL);


--
-- Name: ux_release_versions_components; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_release_versions_components ON public.release_versions USING btree (context, major, minor, patch, beta_iteration);


--
-- Name: ux_release_versions_source_ref; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_release_versions_source_ref ON public.release_versions USING btree (source_ref);


--
-- Name: ux_release_versions_version_string; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_release_versions_version_string ON public.release_versions USING btree (version_string);


--
-- Name: lab_notebook_experiments FK_0a482747dfcbbf8bc2b2ac0315d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_experiments
    ADD CONSTRAINT "FK_0a482747dfcbbf8bc2b2ac0315d" FOREIGN KEY (section_id) REFERENCES public.lab_notebook_sections(id) ON DELETE CASCADE;


--
-- Name: synthesis_pool_molecules FK_6a40e9066804dca20e5dc4ddf72; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT "FK_6a40e9066804dca20e5dc4ddf72" FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;


--
-- Name: backup_codes FK_70066ea80d2f4b871beda32633b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backup_codes
    ADD CONSTRAINT "FK_70066ea80d2f4b871beda32633b" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ticket_messages FK_75b3a5f421dbf7b73778da519cb; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT "FK_75b3a5f421dbf7b73778da519cb" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: lab_notebook_sections FK_84a70cd7e2aadcd190c3ca4ce77; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_sections
    ADD CONSTRAINT "FK_84a70cd7e2aadcd190c3ca4ce77" FOREIGN KEY (notebook_id) REFERENCES public.lab_notebooks(id) ON DELETE CASCADE;


--
-- Name: synthesis_pool_collections FK_8a07bb9845dafbd2002b7bc395d; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT "FK_8a07bb9845dafbd2002b7bc395d" FOREIGN KEY (synthesis_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;


--
-- Name: lab_experiment_protocol_revisions FK_8aea754ec670544a6c21e42f7c3; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_experiment_protocol_revisions
    ADD CONSTRAINT "FK_8aea754ec670544a6c21e42f7c3" FOREIGN KEY (experiment_id) REFERENCES public.lab_notebook_experiments(id) ON DELETE RESTRICT;


--
-- Name: synth_steps FK_8d60498f6612e6bcddf1105e752; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_steps
    ADD CONSTRAINT "FK_8d60498f6612e6bcddf1105e752" FOREIGN KEY (synth_id) REFERENCES public.synthesis(id) ON DELETE CASCADE;


--
-- Name: lab_notebook_executions FK_9080db4eda026fc4210f449db68; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT "FK_9080db4eda026fc4210f449db68" FOREIGN KEY (experiment_id) REFERENCES public.lab_notebook_experiments(id) ON DELETE CASCADE;


--
-- Name: auth_identities FK_c06a980d83c42611d27a294e55c; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_identities
    ADD CONSTRAINT "FK_c06a980d83c42611d27a294e55c" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users FK_c3401836efedec3bec459c8f818; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "FK_c3401836efedec3bec459c8f818" FOREIGN KEY (avatar_id) REFERENCES public.documents(id);


--
-- Name: synthesis_pool_collections FK_c6219a8edcd021ac7779ae41d41; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_collections
    ADD CONSTRAINT "FK_c6219a8edcd021ac7779ae41d41" FOREIGN KEY (collection_id) REFERENCES public.molecule_collections(id) ON DELETE CASCADE;


--
-- Name: synth_step_items FK_cdcb3470974a67b8935b4cc5282; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT "FK_cdcb3470974a67b8935b4cc5282" FOREIGN KEY (pool_molecule_id) REFERENCES public.synthesis_pool_molecules(id) ON DELETE CASCADE;


--
-- Name: synth_step_items FK_d8d3bae04b9de245c6cca77fd6b; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synth_step_items
    ADD CONSTRAINT "FK_d8d3bae04b9de245c6cca77fd6b" FOREIGN KEY (step_id) REFERENCES public.synth_steps(id) ON DELETE CASCADE;


--
-- Name: synthesis_pool_molecules FK_db59c035fa2eeb342481bcefd23; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.synthesis_pool_molecules
    ADD CONSTRAINT "FK_db59c035fa2eeb342481bcefd23" FOREIGN KEY (molecule_id) REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE;


--
-- Name: molecule_collection_items_join FK_f10f716577fc9a7a25af6806df4; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT "FK_f10f716577fc9a7a25af6806df4" FOREIGN KEY (item_id) REFERENCES public.molecule_collection_items(id) ON DELETE CASCADE;


--
-- Name: lab_notebook_executions FK_f21d1e8b78ffe2f9530fb02e1ee; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lab_notebook_executions
    ADD CONSTRAINT "FK_f21d1e8b78ffe2f9530fb02e1ee" FOREIGN KEY (protocol_revision_id) REFERENCES public.lab_experiment_protocol_revisions(id) ON DELETE RESTRICT;


--
-- Name: molecule_collection_items_join FK_f279211bb5d094e50296876fb15; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.molecule_collection_items_join
    ADD CONSTRAINT "FK_f279211bb5d094e50296876fb15" FOREIGN KEY (collection_id) REFERENCES public.molecule_collections(id) ON DELETE CASCADE;


--
-- Name: user_notifications FK_fb5bd0191f165e00ee59a62c0dc; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_notifications
    ADD CONSTRAINT "FK_fb5bd0191f165e00ee59a62c0dc" FOREIGN KEY (recipient_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: account_activation_receipts fk_account_activation_receipts_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_activation_receipts
    ADD CONSTRAINT fk_account_activation_receipts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict WPewoUe99NilTZJEogdzapHMWdAaMqcwIne1sSwPrOR8dzZyQUIvblscDcOysUX

