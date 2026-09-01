# 0115 - Break the Nest domain-module dependency cycle

- [ ] DONE
- [ ] BLOCKED

## Objective

Turn the Nest application-module graph into a directed acyclic graph by replacing cross-domain implementation imports with explicit public ports/use-case APIs and removing `forwardRef()` as a cycle-resolution mechanism between application domains.

Source: `BE-001` in Series `0001`.

## Context

The audited Nest graph places Auth, Help, History, Meilisearch, MercurionAI, MoleculeCollection, Notification, OAuth2, Redis, SSO and User in one strongly connected component. The current repository confirms widespread `forwardRef()` imports across those modules. This task establishes the architectural direction for all later backend refactors; service-level identity/token/scope cycles are refined separately by `BE-002`, provider ownership by `BE-004`, and repository encapsulation by `BE-006`.

## Relevant files and modules

- `MercurionWebNode/src/app.module.ts`
- `MercurionWebNode/src/app_modules/auth/auth.module.ts`
- `MercurionWebNode/src/app_modules/user/user.module.ts`
- `MercurionWebNode/src/app_modules/redis/redis.module.ts`
- `MercurionWebNode/src/app_modules/help/help.module.ts`
- `MercurionWebNode/src/app_modules/history/history.module.ts`
- `MercurionWebNode/src/app_modules/meilisearch/meilisearch.module.ts`
- `MercurionWebNode/src/app_modules/mercurion-ai/mercurion-ai.module.ts`
- `MercurionWebNode/src/app_modules/molecule-collection/molecule-collection.module.ts`
- `MercurionWebNode/src/app_modules/notification/notification.module.ts`
- `MercurionWebNode/src/app_modules/oauth2-client/oauth2-client.module.ts`
- `MercurionWebNode/src/app_modules/sso/sso.module.ts`

## In scope

- Generate a machine-readable Nest module dependency graph and identify every edge participating in the audited SCC.
- Define directional public APIs/ports for cross-domain capabilities instead of importing another domain's internal service/repository implementation.
- Move neutral contracts to dependency-neutral locations when needed to reverse an edge safely.
- Remove module-level `forwardRef()` usages whose only purpose is resolving application-domain cycles.
- Add an architecture gate that fails on module dependency cycles and register it in canonical `ci:check`.
- Preserve transport contracts and domain behaviour while changing dependency direction.

## Out of scope

- Do not redesign persistence transactions or TypeORM schema; section F owns those concerns.
- Do not expose repositories merely to remove a cycle; `BE-006` requires the opposite boundary.
- Do not perform the detailed JwtTools/Scope/User service decomposition owned by `0116` beyond seams required for the module DAG.
- Do not redesign logging globally; `0129` owns the LoggerPort migration.
- Do not modify `../MercurionTox21`.

## Decisions already made

- Application domains depend on explicit public ports/use cases, not internal implementation classes.
- Dependency inversion is preferred over `forwardRef()`.
- Neutral contracts may live in a small shared/core package only when they contain no domain implementation or infrastructure dependency.
- Acyclicity is enforced automatically; it is not a convention checked by review alone.

## Requirements

1. Capture the current module graph and SCC membership before refactoring.
2. Define the intended layer/direction for each cross-domain edge and document it in code-level architecture configuration used by the checker.
3. Replace cyclic edges with injection tokens/interfaces or caller-owned ports implemented by the providing adapter/domain.
4. Remove obsolete `forwardRef()` imports after each edge is inverted.
5. Ensure modules export only the public capability required by consumers; no barrel may re-export internals simply to satisfy the graph.
6. Add focused module-compilation tests for affected domains.
7. Add a deterministic `nest:architecture:check`-style gate that fails if a module cycle is reintroduced and register it in `ci:check`.

## Acceptance criteria

- [ ] The production Nest application-module graph contains zero cycles.
- [ ] The audited Auth/Help/History/Meili/MercurionAI/MoleculeCollection/Notification/OAuth2/Redis/SSO/User SCC is eliminated.
- [ ] No module-level `forwardRef()` remains solely to resolve a domain dependency cycle.
- [ ] Cross-domain dependencies target public contracts/use cases rather than implementation internals.
- [ ] A deterministic architecture test fails when a temporary cyclic module edge is introduced.
- [ ] Existing public REST/GraphQL/WebSocket behaviour remains compatible.

## Validation

Run the Nest module/architecture graph test, affected module-compilation tests, `npm test`, `npm run test:e2e`, `npm run build`, and the repository-wide CI-parity gates.

## Browser validation

Not applicable. Behavioural compatibility is proven through Nest unit/integration/E2E transport tests.

## Stop conditions

Mark `BLOCKED` if breaking an edge requires an unresolved ownership decision between two domains, if a public capability cannot be separated without changing product semantics, or if the mandatory CI baseline cannot be restored to green.

## Dependencies

- `0008-enforce-nest-graphql-schema-drift-check.md` must be `DONE` so the architecture gate can join the canonical aggregate.

## Implementation notes

Do not substitute one giant shared module for the current SCC. A dependency graph that is technically acyclic because all domains depend on an unbounded `CommonModule` would preserve the same coupling under a different name.

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
_Not applicable._
### Commits
_Not recorded._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
