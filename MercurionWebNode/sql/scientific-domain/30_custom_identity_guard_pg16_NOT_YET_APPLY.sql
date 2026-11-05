-- Mercurion / PostgreSQL 16 / DB-first.
-- FUTURE CUTOVER ONLY: deploy after the generic molecule update mutation and
-- Ketcher flow implement copy-on-write and never update an existing structure.
-- This script does NOT run automatically or generate any UUID.
-- The unique index is the canonical authority for custom identity uniqueness.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';

DO $check$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.molecule_collection_items
    WHERE type='custom' AND
      (canonical_smiles IS NULL OR BTRIM(canonical_smiles)='')
  ) THEN
    RAISE EXCEPTION 'Cannot enable custom-identity guard: missing canonical_smiles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.molecule_collection_items
    WHERE type='custom'
    GROUP BY user_id,canonical_smiles HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'Cannot enable custom-identity guard: duplicate owner/smiles';
  END IF;
  IF to_regclass('public.uq_molecule_custom_user_canonical_smiles') IS NOT NULL
     OR to_regprocedure('public.guard_molecule_identity()') IS NOT NULL THEN
    RAISE EXCEPTION 'Molecule identity guard already exists; refusing repeated apply';
  END IF;
END
$check$;

ALTER TABLE public.molecule_collection_items
  ADD CONSTRAINT ck_molecule_custom_canonical_nonempty
  CHECK (type <> 'custom' OR
        (canonical_smiles IS NOT NULL AND BTRIM(canonical_smiles)<>'')); 

CREATE UNIQUE INDEX uq_molecule_custom_user_canonical_smiles
  ON public.molecule_collection_items (user_id,canonical_smiles)
  WHERE type='custom';

CREATE FUNCTION public.guard_molecule_identity()
RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  -- STI discriminator describes the immutable identity kind, not an editable tag.
  IF NEW.type IS DISTINCT FROM OLD.type THEN
    RAISE EXCEPTION USING ERRCODE='23514',
      MESSAGE='Molecule item type cannot be changed in place',
      CONSTRAINT='ck_molecule_item_type_immutable';
  END IF;
  IF OLD.type='custom' AND
     (NEW.canonical_smiles IS DISTINCT FROM OLD.canonical_smiles
      OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    RAISE EXCEPTION USING ERRCODE='23514',
      MESSAGE='Custom molecule structural identity is immutable',
      CONSTRAINT='ck_custom_molecule_identity_immutable';
  END IF;
  RETURN NEW;
END
$fn$;

CREATE TRIGGER trg_molecule_identity_immutable
BEFORE UPDATE OF canonical_smiles,type,user_id ON public.molecule_collection_items
FOR EACH ROW EXECUTE FUNCTION public.guard_molecule_identity();

ALTER FUNCTION public.guard_molecule_identity() OWNER TO app;

COMMIT;
-- The application must map SQLSTATE 23505 (duplicate) and 23514 (immutable)
-- to explicit domain errors; never expose expected conflicts as generic 500s.
