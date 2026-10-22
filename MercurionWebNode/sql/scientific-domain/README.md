# Mercurion scientific domain — PostgreSQL 16 / DB-first

## Status (2026-10-21)

**SQL 20/21 executed successfully on ephemeral PostgreSQL 16.15 (2026-10-21), using a synthetic legacy fixture and the non-superuser app role.** Postflight: 11/11 OK; behavioral checks: 54/54 PASS; six expected rejection/rollback scenarios verified. Container removed, pg_sl untouched. See [VALIDATION-PG16.md](VALIDATION-PG16.md) for inputs, evidence and limits. A real database clone and a coordinated matching Nest/GraphQL cutover are still required; this SQL test does not certify application integration or remote CI.

* 20_reset_notebook_synthesis_pg16.sql: one-time, transactional rebuild. Precisely eight DROP TABLE statements, only legacy Notebook/Synthesis. Existing lab_notebooks_old and all molecule, user and other tables are kept. No DROP CASCADE. Stops if new tables already exist, or if a legacy source table is missing.
* 21_verify_scientific_domain_pg16.sql: read-only postflight that emits one resultset of OK/BLOCKER checks in pgAdmin.

The repair of cross-owner ChEMBL collection membership is **already completed and verified** by the operator. This package does not repair or alter molecule_collection_items or molecule_collection_items_join.

## Pre-application gate

1. A verified and restorable PostgreSQL database backup and a tested clone.
2. Maintenance window: no old Nest process may write Notebook/Synthesis during the cutover.
3. Nest domain entity/DTO/resolver refactor must be ready for immediate matching deployment. Do not apply a new schema to a still-running old GraphQL backend.
4. Run the SQL as a role able to own the new tables as app. PostgreSQL 16 or later required.
5. Confirm that eight legacy tables are disposable and that lab_notebooks_old must be preserved.
6. Confirm no external FKs require manual migration. DROP TABLE uses RESTRICT (default) and the transaction aborts if such dependencies exist.
7. The associated molecule identity constraint script is a **separate** deployment phase, only after Ketcher/Nest copy-on-write is implemented.

## Domain decisions

LabNotebook -> NotebookSection -> NotebookExperiment -> ExperimentExecution.

An execution is a concrete run and references an immutable ExperimentProtocolRevision once started. The DB blocks subsequent changes of its protocol binding, and blocks deleting started executions. Experiment deletion is blocked by retained immutable revisions; use archived_at for historical records.

Synthesis is independent and linear. A synthesis owns steps, step items and a pool. FK ON DELETE CASCADE only removes *live* links when the corresponding molecule, pool membership or synthesis is explicitly deleted. Protocol-revision snapshots keep chemical structures and planned conditions; no FK to mutable synthesis state is required for rendering history.

FKs refer to single IDs deliberately; the Nest layer must enforce owner equality and same-experiment/same-synthesis consistency, including concurrent paths.

## Cutover and smoke test

1. On a **staging copy only**, execute all statements in 20_reset_notebook_synthesis_pg16.sql as one query (including BEGIN and COMMIT).
2. Execute 21_verify_scientific_domain_pg16.sql in a separate pgAdmin query, verify all OK.
3. Check table names, owners/privileges and data counts.
4. Validate Nest entity metadata / GraphQL codegen against the new schema. Ensure no code still tries to read old chapters, pages or synth_step_molecule_refs.
5. Test copy-on-write/custom-only pool, deletion cascade, owner permissions, revision freeze, execution transitions and archival.
6. Only after green tests + matching backend deployment, repeat on the intended application DB.

**There is no automated rollback after commit** because legacy test data is intentionally dropped. Rollback is either the open transaction on failure, or restore from the verified backup.
## Local cutover confirmation (21 October 2026)

The operator reported that both SQL 20 and SQL 21 were executed sequentially on the **local application PostgreSQL** after successful isolated-container testing. The pgAdmin postflight screenshot shows **11 / 11 OK**: 13 feature tables, three integrity triggers, the expected CASCADE/RESTRICT decisions, no composite feature FK, preservation of lab_notebooks_old and removal of the targeted legacy tables.

The Nest LabNotebookModule has subsequently been switched in this feature branch to the v1 scientific Notebook entities/services/resolvers. This branch is a **development integration checkpoint**, not a tested release. Runtime GraphQL remains to be regenerated/verified, and the Angular Notebook/Synthesis UI is not implemented.

Do **not** rerun SQL 20: it is intentionally a one-time, fail-closed script. SQL 21 is safe to repeat as a read-only inspection. Additional behavior checks are in rollback-only SQL 22, preferably run first on the isolated database clone.

A Windows PowerShell verification runner is available at `scripts/verify-scientific-backend.ps1` (repository root). It runs the Nest TypeScript typecheck, focused Jest suite, GraphQL schema regeneration/check and build. It does not touch the database; review its SDL diff.
