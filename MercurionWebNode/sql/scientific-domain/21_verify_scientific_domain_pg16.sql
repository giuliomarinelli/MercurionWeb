-- Read-only postflight for Mercurion scientific domain v1 on PostgreSQL 16.
-- Single resultset for pgAdmin. Any status other than OK is a BLOCKER.
WITH expected_tables(name) AS (
  VALUES
  ('synthesis'),('synth_steps'),('synthesis_pool_collections'),
  ('synthesis_pool_molecules'),('synth_step_items'),('lab_notebooks'),
  ('lab_notebook_sections'),('lab_notebook_experiments'),
  ('lab_experiment_protocol_revisions'),('lab_notebook_executions'),
  ('notebook_experiment_synthesis_links'),('experiment_execution_synthesis_links'),
  ('experiment_execution_molecule_links')
), table_state AS (
  SELECT count(*) AS present FROM expected_tables
  WHERE to_regclass(format('public.%I',name)) IS NOT NULL
), fk_state AS (
  SELECT conrelid AS from_table,
         confrelid AS to_table,
         confdeltype AS delete_action
  FROM pg_constraint
  WHERE contype='f'
    AND connamespace='public'::regnamespace
), trigger_state AS (
  SELECT tgname FROM pg_trigger
  WHERE NOT tgisinternal AND tgrelid IN (
    'public.lab_experiment_protocol_revisions'::regclass,
    'public.lab_notebook_executions'::regclass,
    'public.synthesis_pool_molecules'::regclass)
), metrics AS (
  SELECT
    (SELECT present FROM table_state) AS tables_present,
    (to_regclass('public.lab_notebooks_old') IS NOT NULL)::integer AS old_notebook_retained,
    (to_regclass('public.lab_notebook_chapters') IS NULL)::integer AS legacy_chapters_gone,
    (to_regclass('public.lab_notebook_pages') IS NULL)::integer AS legacy_pages_gone,
    (to_regclass('public.synth_step_molecule_refs') IS NULL)::integer AS legacy_refs_gone,
    (SELECT count(*) FROM trigger_state WHERE tgname IN (
      'trg_protocol_revision_immutable',
      'trg_experiment_execution_history',
      'trg_synthesis_pool_custom_only')) AS integrity_triggers,
    (SELECT count(*) FROM fk_state
       WHERE from_table='public.synthesis_pool_molecules'::regclass AND to_table='public.molecule_collection_items'::regclass AND delete_action='c') AS cascade_molecule_pool,
    (SELECT count(*) FROM fk_state
       WHERE from_table='public.synth_step_items'::regclass AND to_table='public.synthesis_pool_molecules'::regclass AND delete_action='c') AS cascade_pool_step,
    (SELECT count(*) FROM fk_state
       WHERE from_table='public.experiment_execution_molecule_links'::regclass AND to_table='public.molecule_collection_items'::regclass AND delete_action='c') AS cascade_molecule_live_link,
    (SELECT count(*) FROM pg_constraint
       WHERE conrelid='public.lab_experiment_protocol_revisions'::regclass AND contype='f'
         AND confrelid='public.lab_notebook_experiments'::regclass AND confdeltype='r') AS restrict_protocol_experiment,
    (SELECT count(*) FROM pg_constraint WHERE connamespace='public'::regnamespace
       AND contype='f' AND conrelid IN (
         'public.synth_steps'::regclass,
         'public.synthesis_pool_molecules'::regclass,
         'public.synthesis_pool_collections'::regclass,
         'public.synth_step_items'::regclass,
         'public.lab_notebook_sections'::regclass,
         'public.lab_notebook_experiments'::regclass,
         'public.lab_experiment_protocol_revisions'::regclass,
         'public.lab_notebook_executions'::regclass)
       AND array_length(conkey,1) > 1) AS composite_fks
)
SELECT 'FEATURE_TABLES' AS check_name,
       CASE WHEN tables_present=13 THEN 'OK' ELSE 'BLOCKER' END AS status,
       tables_present::bigint AS observed, 13::bigint AS expected FROM metrics
UNION ALL SELECT 'LAB_NOTEBOOKS_OLD_RETAINED',
       CASE WHEN old_notebook_retained=1 THEN 'OK' ELSE 'BLOCKER' END,
       old_notebook_retained,1 FROM metrics
UNION ALL SELECT 'LEGACY_CHAPTERS_DROPPED',
       CASE WHEN legacy_chapters_gone=1 THEN 'OK' ELSE 'BLOCKER' END,
       legacy_chapters_gone,1 FROM metrics
UNION ALL SELECT 'LEGACY_PAGES_DROPPED',
       CASE WHEN legacy_pages_gone=1 THEN 'OK' ELSE 'BLOCKER' END,
       legacy_pages_gone,1 FROM metrics
UNION ALL SELECT 'LEGACY_SYNTH_REFS_DROPPED',
       CASE WHEN legacy_refs_gone=1 THEN 'OK' ELSE 'BLOCKER' END,
       legacy_refs_gone,1 FROM metrics
UNION ALL SELECT 'DOMAIN_INTEGRITY_TRIGGERS',
       CASE WHEN integrity_triggers=3 THEN 'OK' ELSE 'BLOCKER' END,
       integrity_triggers,3 FROM metrics
UNION ALL SELECT 'CASCADE_MOLECULE_POOL',
       CASE WHEN cascade_molecule_pool=1 THEN 'OK' ELSE 'BLOCKER' END,
       cascade_molecule_pool,1 FROM metrics
UNION ALL SELECT 'CASCADE_POOL_STEP',
       CASE WHEN cascade_pool_step=1 THEN 'OK' ELSE 'BLOCKER' END,
       cascade_pool_step,1 FROM metrics
UNION ALL SELECT 'CASCADE_MOLECULE_LIVE_LINK',
       CASE WHEN cascade_molecule_live_link=1 THEN 'OK' ELSE 'BLOCKER' END,
       cascade_molecule_live_link,1 FROM metrics
UNION ALL SELECT 'RESTRICT_PROTOCOL_EXPERIMENT',
       CASE WHEN restrict_protocol_experiment=1 THEN 'OK' ELSE 'BLOCKER' END,
       restrict_protocol_experiment,1 FROM metrics
UNION ALL SELECT 'NO_COMPOSITE_DOMAIN_FKS',
       CASE WHEN composite_fks=0 THEN 'OK' ELSE 'BLOCKER' END,
       composite_fks,0 FROM metrics
ORDER BY check_name;