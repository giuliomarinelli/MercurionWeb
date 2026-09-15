# 0193 - Add public GraphQL resolver contract tests

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Add contract tests for every public GraphQL resolver in the retained Help, molecule-collection and Synth domains, proving schema shape, authentication/ownership policy, successful operations, invalid input, not-found behavior and canonical GraphQL error mapping through the real Nest GraphQL test application.

Source: `QA-007` in Series `0001`.

## Context

The Series audit found that important public resolvers are not protected by contract-level tests. Direct service/resolver unit tests cannot prove that decorators, generated schema, scalars, authentication metadata, validation and exception presentation compose correctly. Earlier SYS/BE tasks make the GraphQL schema deterministic and align transport errors; this task exercises those contracts at the GraphQL boundary. Synth is conditional on the explicit retain/remove decision from `0019`.

## Relevant files and modules

- Help resolvers/schema/DTOs
- molecule-collection/item resolvers
- Synth resolvers if retained by `0019`
- GraphQL module/config and generated schema
- auth metadata/guards
- canonical application error presenter
- test application/DB fixtures

## In scope

- Build a reusable GraphQL contract-test harness that boots the actual Nest GraphQL module/schema.
- Exercise each retained public resolver through GraphQL operations, not by directly invoking resolver methods as the only evidence.
- Cover authentication and owner-scoped access policy.
- Cover valid success responses, invalid arguments/input validation and not-found/forbidden behavior according to disclosure policy.
- Assert stable error code/extensions mapping rather than volatile message text.
- Verify response/schema shape for representative queries/mutations and important nested/field resolvers.
- If Synth was removed, assert its public schema/route absence consistently rather than recreating it for tests.

## Out of scope

- Do not snapshot the entire generated schema as the sole contract test; schema drift is already owned by SYS/BE gates.
- Do not bypass guards/metadata just to make resolver tests easy.
- Do not use production databases or credentials.
- Do not duplicate repository/service unit tests when the concern is already proven below the GraphQL boundary.

## Decisions already made

- Public GraphQL behavior includes auth/validation/error presentation, not only resolver return values.
- Error assertions use typed codes/extensions and stable fields rather than prose.
- Owner-disclosure semantics follow the domain/security policy established earlier.
- Removed features stay removed from the schema.

## Requirements

1. Enumerate every public resolver/operation/field in Help, molecule collection and retained Synth.
2. Provide reusable authenticated/anonymous GraphQL test clients and deterministic owner/non-owner fixtures.
3. For each public resolver, cover schema/operation validity, success and at least the applicable auth/invalid-input/not-found/forbidden path.
4. Cover scalar/ID validation at the GraphQL boundary, including canonical public-ID/UUID contracts.
5. Assert canonical GraphQL error codes/extensions from the shared error presenter.
6. Verify field resolvers such as collection counts do not bypass ownership and retain expected shape after batching/refactor.
7. Ensure GraphQL operations used by Angular are included in the compatibility/schema-validation gate.
8. Run tests against a disposable test database when persistence semantics are part of the resolver contract.

## Acceptance criteria

- [ ] Every retained public Help/Collection/Synth resolver is represented in the contract-test inventory.
- [ ] Authentication/ownership and success/invalid/not-found behavior are covered as applicable.
- [ ] Tests execute through the actual Nest GraphQL application/schema.
- [ ] Error assertions use stable typed contract fields, not fragile message strings.
- [ ] Removed Synth functionality, if applicable, is absent and not accidentally reintroduced.

## Validation

Run GraphQL contract tests, schema generation/drift checks, Nest unit/E2E tests, lint/typecheck/build and repository-wide CI parity.

## Browser validation

Not required for resolver contracts; `0197` validates at least one real frontend→GraphQL system journey.

## Stop conditions

Mark `BLOCKED` if the public missing-versus-forbidden disclosure policy is still unresolved for a domain, or if Synth retain/remove ownership remains unresolved when its resolver inventory is reached.

## Dependencies

- SYS GraphQL generation/validation tasks `0002`–`0008` should be `DONE`.
- BE error presentation tasks `0127`/`0128` should be `DONE`.
- DATA domain/ownership tasks for Help/Collection/Synth should be `DONE`.
- `0188` must provide a reliable Nest test bootstrap.

## Implementation notes

Prefer focused operation documents with explicit variables and expected typed payloads. The contract test should fail if a decorator/guard/scalar/schema mapping changes even when a direct service unit test would still pass.

## Execution notes

### Feature branch
`feature/QA-007`
### Preflight
Confirmed clean `feature/QA-007` at certified base `91a966bb0b46ff49be4658390e05c680c83e3533`; workflow-dispatch run `34978749934` was green on Ubuntu and Windows, including `Required gate`. Browser/runtime evidence is explicitly not required by this recipe.
### Preflight remediation
None.
### Summary
Added a Nest GraphQL schema-factory contract suite with a reusable resolver/service/policy harness. The inventory covers all retained Help, molecule-collection and Synth query/mutation operations, verifies removed Synth types remain absent, validates Angular-compatible operation documents and invalid scalar input, checks public-ID argument shape, and verifies authentication/scope/public metadata is retained at the resolver boundary.
### Task-specific validation performed
- `npm test --workspace mercurion_web_node -- --runInBand src/contracts/public-graphql-resolver.contract.spec.ts` — PASS (5 tests).
- `npm run graphql:schema:check --workspace mercurion_web_node` — PASS; generated schema current.
- `npm run typecheck --workspace mercurion_web_node` — PASS.
- `npm run lint --workspace mercurion_web_node -- --no-fix` — PASS.
- `npm run build --workspace mercurion_web_node` — PASS.
- `git diff --check` — PASS.
### Full pre-merge CI-parity validation
Not run locally; forbidden by repository policy. Exact feature-SHA GitHub Actions validation is coordinator-owned after push.
### Browser validation performed
Not applicable: the recipe declares browser validation not required.
### Commits
Pending task-specific commit.
### Merge / CI
Feature branch will be pushed only after the task-specific commit; exact-SHA CI is coordinator-owned.
### Rollback
_Not applicable._
### Blocker / human decision required
None.
