# 0015 - Canonicalize RDKit contracts

- [ ] DONE
- [ ] BLOCKED

## Objective

Define RDKit API input/output contracts once, validate them at the server boundary, and make Angular and Nest consume the same canonical definitions without manual copies.

Source: `SYS-015` in Series `0001`.

## Context

Angular maintains RDKit request/result types in `MercurionWebNg/src/app/Models/rdkit-api.models.ts` and consumes them through `rd-kit-api.service.ts`. Nest independently defines DTOs/results under `MercurionWebNode/src/app_modules/mercurion-ai/Models/DTO/rdkit/`. These represent the same API boundary but evolve independently.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/rdkit-api.models.ts`
- `MercurionWebNg/src/app/services/rd-kit-api.service.ts`
- `MercurionWebNg/src/app/services/rd-kit.service.ts`
- `MercurionWebNode/src/app_modules/mercurion-ai/Models/DTO/rdkit/`
- `MercurionWebNode/src/app_modules/mercurion-ai/Models/interfaces/rdkit-api-ns.interface.ts`
- Mercurion AI controllers/services handling RDKit requests
- canonical contract mechanism

## In scope

- Inventory RDKit operations and exact request/response wire shapes.
- Define canonical input/output schemas/types including options and nullable result fields.
- Preserve Nest runtime validation/transformation for untrusted inputs.
- Replace Angular manual DTO/result copies with canonical generated/shared types.
- Add contract tests for all supported RDKit operations.

## Out of scope

- Modifying the local browser RDKit WASM/library implementation unless needed only to adapt to canonical types.
- Changes to `../MercurionTox21`.
- Changing scientific calculation semantics or numerical outputs.

## Decisions already made

- RDKit boundary DTOs have one source of truth.
- Nest still performs runtime validation.
- Existing wire compatibility and scientific semantics are preserved.

## Requirements

1. Cover `get_molecule_properties`, `to_canonical_smiles`, `are_same_structure` and any additional currently exposed RDKit operations discovered during inventory.
2. Represent request options, validation constraints, nullable outputs and error conditions explicitly.
3. Generate/share TypeScript types for Angular and Nest from the canonical source.
4. Keep Nest boundary validators equivalent to or stricter than the current class-validator rules.
5. Remove equivalent manual Angular/Nest contract copies once migrated.
6. Add round-trip contract fixtures/tests for valid and invalid inputs and representative results.

## Acceptance criteria

- [ ] Angular and Nest consume one canonical RDKit request/response contract.
- [ ] No duplicate handwritten RDKit API DTO/result type remains for the migrated operations.
- [ ] Server validation rejects the same invalid boundary cases as before or more strictly without rejecting previously valid documented inputs.
- [ ] Contract tests cover each operation.
- [ ] Angular/Nest builds/tests pass.
- [ ] Existing scientific behaviour not targeted by this task remains compatible.

## Validation

Run builds/tests in both projects plus canonical contract generation/checks and targeted RDKit tests.

## Browser validation

Not normally required for contract-only changes. If Angular runtime integration is modified, use `http://localhost:8888` and Chrome DevTools MCP to exercise one safe RDKit API call and verify the same-origin request/response shape and absence of console errors.

## Stop conditions

Block if Angular and Nest currently expose materially different semantics for the same RDKit field and choosing one would alter scientific/product behaviour rather than merely reconcile types.

## Dependencies

- An approved canonical cross-project contract mechanism.

## Implementation notes

Do not couple the canonical wire contract to Python/Tox21 implementation details. Tox21 remains a read-only sibling runtime dependency.

## Execution notes

### Summary

_Not started._

### Validation performed

_Not started._

### Browser validation performed

_Not applicable / not started._

### Changed files

_Not recorded._

### Blocker / human decision required

_None._
