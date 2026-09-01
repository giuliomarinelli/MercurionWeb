# 0212 - Remove manual backups and generated artifacts

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Remove committed local backup/result artifacts, classify every retained non-source file explicitly and add a narrow repository-hygiene gate that prevents regenerated snapshots, test outputs and ad hoc backups from returning.

Source: `QA-026` in Series `0001`.

## Context

The audit identified `MercurionWebNode/package.json.131225.bk`, `MercurionWebNode/package@10Snapshot.json`, `MercurionWebNode/jest-results.json`, `MercurionWebNode/notebook.txt` and `MercurionWebNg/docs.txt` as manual backup/snapshot/result files without a declared source, fixture or documentation role. Generated outputs also make diffs and static scans noisy. This task removes confirmed debris, verifies that no build/runtime path depends on it and establishes precise ignore/check rules without hiding legitimate fixtures or documentation.

## Relevant files and modules

- `MercurionWebNode/package.json.131225.bk`
- `MercurionWebNode/package@10Snapshot.json`
- `MercurionWebNode/jest-results.json`
- `MercurionWebNode/notebook.txt`
- `MercurionWebNg/docs.txt`
- root/project `.gitignore` files
- test/report/build output configuration
- Docker build contexts and asset-copy configuration
- repository-hygiene/static CI scripts

## In scope

- Inspect each audited artifact and prove whether it is unused debris or a misnamed required fixture/document.
- Delete confirmed manual backups, generated test results and ad hoc snapshots from source control.
- Move/rename a genuinely required fixture/document into the canonical location with explicit ownership and tests/references.
- Update generators/reporters so outputs go to ignored bounded directories.
- Add narrow ignore rules for known generated paths/patterns.
- Add a deterministic tracked-file hygiene check for backup/result naming and forbidden generated outputs.
- Verify Docker/build/test inputs do not depend on deleted files.

## Out of scope

- Do not delete a file solely because its name looks temporary; inspect references and content first.
- Do not add blanket ignores such as all `*.txt`, `*.json`, snapshots or documentation directories.
- Do not ignore canonical lockfiles, schemas, fixtures or intentionally versioned generated artifacts required by other task contracts.
- Do not rewrite Git history to erase old versions.
- Do not remove current diagnostic artifacts produced only in untracked CI/work directories.

## Decisions already made

- A committed file must have a declared source, fixture, configuration or documentation role.
- Manual backups belong in version history or external working storage, not beside maintained source.
- Generated CI/test/build outputs live in named ignored artifact directories unless another task explicitly requires versioning and drift checks.
- Hygiene checks inspect tracked files and precise forbidden patterns; they do not broadly suppress file types.

## Requirements

1. Search imports, scripts, Docker copy instructions, documentation and runtime reads for all five audited files and record their classification.
2. Delete every confirmed backup/result/debris file; if one is required, rename/move it to an owned canonical location and update all consumers/tests.
3. Inventory other tracked files matching backup/snapshot/result/temp patterns and classify them with the same rule rather than limiting the check to the five names.
4. Configure Jest/build/report tooling to write transient outputs under explicit ignored directories used by CI artifact upload.
5. Add/update root/project `.gitignore` entries narrowly, preserving canonical lockfiles, schemas and maintained fixtures.
6. Add a non-mutating hygiene command that rejects tracked backup/result artifacts, known output directories and newly introduced suspicious names with actionable diagnostics.
7. Add positive fixtures/allowlist metadata only for genuinely maintained snapshots/documents, with exact paths and rationale.
8. Register the hygiene command in canonical CI and verify clean install/test/build/container contexts after deletion.

## Acceptance criteria

- [ ] The five audited files are removed or reclassified into clearly owned canonical artifacts with evidence.
- [ ] No confirmed local backup or generated test result remains tracked.
- [ ] Transient reports/build outputs are generated only into explicit ignored/artifact locations.
- [ ] Ignore rules are narrow and do not hide legitimate source, fixtures, schemas or documentation.
- [ ] A new tracked backup/result artifact makes canonical CI fail with its path.
- [ ] Builds, tests and Docker contexts have no dependency on deleted debris.

## Validation

Run tracked-file/reference searches, the repository-hygiene gate and its negative fixtures; execute the generators/tests that previously produced outputs, verify `git diff --exit-code` and expected ignored status, build affected projects/images, then run repository-wide CI parity.

## Browser validation

Not applicable unless an audited file proves to be a browser-delivered asset. If so, preserve it under the correct asset contract and verify the consuming route through `http://localhost:8888` before removal of the legacy path.

## Stop conditions

Mark `BLOCKED` if a suspicious file is referenced by a real but undocumented product/runtime flow and its intended ownership or replacement cannot be determined; do not delete it merely to satisfy the hygiene metric.

## Dependencies

- `0202-complete-canonical-github-actions-ci-pipeline.md` should be `DONE` so transient reports have canonical artifact destinations.
- Generated-artifact contracts from earlier schema/codegen tasks remain authoritative and must not be reclassified as debris.

## Implementation notes

The Git history is already the backup. Keep the new gate based on tracked-path policy so developers may still create ignored local diagnostics without polluting commits.

## Execution notes

### Feature branch
_Not started._
### Preflight
_Not started._
### Preflight remediation
_None._
### Summary
_Not started._
### Task-specific validation performed
_Not started._
### Full pre-merge CI-parity validation
_Not started._
### Browser validation performed
_Not started / not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
