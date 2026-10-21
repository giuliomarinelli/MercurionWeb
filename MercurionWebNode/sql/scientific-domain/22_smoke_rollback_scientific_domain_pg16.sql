-- PostgreSQL 16 DB-first smoke test (test fixture / no persistent writes).
-- Execute on a test database, preferably an ephemeral clone.
-- Hard-coded UUIDv7 fixture identifiers are generated outside PostgreSQL.
-- On success ROLLBACK undoes all INSERT/DELETE operations.
-- A failed DO block aborts the transaction; inspect Messages tab carefully.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '45s';

DO $smoke$
DECLARE
  u uuid := '019a68d0-72fa-71a3-a1e8-a34fc1c23712';
  n uuid := '019a68d0-72fb-72a3-98df-c9cdf14e17a4';
  section_id uuid := '019a68d0-72fc-78c6-ad3d-a2e2f32a875a';
  exp uuid := '019a68d0-72fd-7f09-a620-f04bd7d4ca9b';
  rev uuid := '019a68d0-72fe-71d7-9cbf-f3e50668202d';
  run_id uuid := '019a68d0-72ff-7ff1-a6f4-964048227cd8';
  synth uuid := '019a68d0-7300-7f84-b62b-3df8d559b095';
  step_id uuid := '019a68d0-7301-79ec-b83d-a0f4fc4d1e42';
  item_id uuid := '019a68d0-7302-7cc7-b32f-1bf7be3aa7f8';
  molecule_id uuid := '019a68d0-7303-7f87-975c-f0631e56ce4b';
  pool_id uuid := '019a68d0-7304-7e10-9a29-a13704bd90ad';
  step_item_id uuid := '019a68d0-7305-7b3d-86b6-6b80ea8f8d14';
  live_link_id uuid := '019a68d0-7306-7f0c-92d3-9b7fd52a8d0f';
  chembl_id uuid := '019a68d0-7307-7f27-8818-a6c9661bf202';
  v_now bigint := 1792577000000;
  before_change text;
BEGIN
  INSERT INTO public.lab_notebooks(id,user_id,title,created_at,updated_at)
    VALUES (n,u,'SMOKE notebook',v_now,v_now);
  INSERT INTO public.lab_notebook_sections
    (id,user_id,notebook_id,title,section_order,created_at,updated_at)
    VALUES (section_id,u,n,'SMOKE section',0,v_now,v_now);
  INSERT INTO public.lab_notebook_experiments
    (id,user_id,section_id,title,experiment_order,content_delta,created_at,updated_at)
    VALUES (exp,u,section_id,'SMOKE experiment',0,'{"ops":[{"insert":"Test\n"}]}'::jsonb,v_now,v_now);

  INSERT INTO public.lab_experiment_protocol_revisions
    (id,user_id,experiment_id,revision_number,snapshot_schema_version,snapshot,
     checksum_sha256,created_at,created_by)
    VALUES (rev,u,exp,1,1,'{"schemaVersion":1}'::jsonb,repeat('a',64),v_now,u);
  INSERT INTO public.lab_notebook_executions
    (id,user_id,experiment_id,protocol_revision_id,title,execution_order,
     status,started_at,created_at,updated_at)
    VALUES (run_id,u,exp,rev,'SMOKE execution',0,'IN_PROGRESS',v_now,v_now,v_now);

  BEGIN
    UPDATE public.lab_experiment_protocol_revisions
      SET snapshot='{"schemaVersion":2}'::jsonb WHERE id=rev;
    RAISE EXCEPTION 'SMOKE FAILURE: protocol revision was mutable';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: protocol revision UPDATE rejected (23514)';
  END;

  BEGIN
    DELETE FROM public.lab_notebook_executions WHERE id=run_id;
    RAISE EXCEPTION 'SMOKE FAILURE: started execution was deletable';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: started execution DELETE rejected (23514)';
  END;

  BEGIN
    UPDATE public.lab_notebook_executions
      SET protocol_revision_id=NULL WHERE id=run_id;
    RAISE EXCEPTION 'SMOKE FAILURE: protocol binding was mutable';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: execution protocol revision binding protected';
  END;

  INSERT INTO public.synthesis(id,user_id,title) VALUES(synth,u,'SMOKE synthesis');
  INSERT INTO public.synth_steps(id,user_id,synth_id,step_order)
    VALUES(step_id,u,synth,0);
  INSERT INTO public.molecule_collection_items
    (id,user_id,type,canonical_smiles,created_at,updated_at)
    VALUES(molecule_id,u,'custom','C',v_now,v_now);
  INSERT INTO public.synthesis_pool_molecules(id,user_id,synthesis_id,molecule_id)
    VALUES(pool_id,u,synth,molecule_id);
  INSERT INTO public.synth_step_items
    (id,user_id,step_id,pool_molecule_id,kind,position,item_order)
    VALUES(step_item_id,u,step_id,pool_id,'Reactant','BeforeArrow',0);
  INSERT INTO public.experiment_execution_molecule_links
    (id,user_id,execution_id,item_id,created_at)
    VALUES(live_link_id,u,run_id,molecule_id,v_now);

  INSERT INTO public.molecule_collection_items
    (id,user_id,type,chembl_molregno,created_at,updated_at)
    VALUES(chembl_id,u,'chembl',999888777666,v_now,v_now);
  BEGIN
    INSERT INTO public.synthesis_pool_molecules(id,user_id,synthesis_id,molecule_id)
      VALUES('019a68d0-7308-7b00-a39d-bf9688855b10',u,synth,chembl_id);
    RAISE EXCEPTION 'SMOKE FAILURE: ChEMBL item entered a custom-only synthesis pool';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: custom-only synthesis pool enforced (23514)';
  END;

  -- Deleting the molecule must cascade through live pool and step-item refs,
  -- but must NOT remove the synthesis or historical protocol revision snapshot.
  DELETE FROM public.molecule_collection_items WHERE id=molecule_id;
  IF EXISTS(SELECT 1 FROM public.synthesis_pool_molecules WHERE id=pool_id)
     OR EXISTS(SELECT 1 FROM public.synth_step_items WHERE id=step_item_id)
     OR EXISTS(SELECT 1 FROM public.experiment_execution_molecule_links WHERE id=live_link_id) THEN
    RAISE EXCEPTION 'SMOKE FAILURE: live molecule FK CASCADE did not remove dependent links';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.synthesis WHERE id=synth)
     OR NOT EXISTS(SELECT 1 FROM public.lab_experiment_protocol_revisions WHERE id=rev) THEN
    RAISE EXCEPTION 'SMOKE FAILURE: molecule deletion erased synthesis or protocol history';
  END IF;
  RAISE NOTICE 'PASS: molecule CASCADE removes only live associations and keeps scientific history';
  RAISE NOTICE 'ALL SMOKE ASSERTIONS PASSED. Transaction will now ROLLBACK.';
END
$smoke$;

ROLLBACK;
-- No records, including synthetic UUIDs and ChEMBL test fixture, are persisted.
