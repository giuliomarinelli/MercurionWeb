# Testing Strategy

This document tracks the unit‐testing scope for every NestJS component in the Mercurion backend.  
The goals are:

1. Every class (controllers, services, DTOs, guards, resolvers, modules, utils) has at least one focused spec that asserts behavior, not only instantiation.
2. Each spec isolates external infrastructure (DB, Meilisearch, Redis, SMTP, etc.) with deterministic mocks.
3. Cross‑cutting helpers (response builder, logger adapters, guards, decorators) are validated once and reused through shared test utilities.

For quick reference, the spec names mirror the file list under `src/**/**.spec.ts`.  
Below each class you’ll find the scenarios that must be covered or improved.

---

## Core / Bootstrap

- `app.module.ts` (`src/app.module.spec.ts`)
  - Validate that all feature modules are imported and global providers (guards, services) are registered once.
  - Use partial mocks for `ConfigService` to assert environment dependent registrations.
- `MercurionGraphQLModule` (`src/mercurion-graphql.module.ts`)
  - Cover `errorFormatter` logic for successful responses, user‑facing errors, and internal errors in prod vs dev.
  - Ensure GraphQL context wiring exposes Fastify request/reply to downstream decorators.
- `main.ts` (indirect via e2e in `test/app.e2e-spec.ts`)
  - Keep smoke test to ensure app boots with mocked Config + Redis services.
- `TestController` (`src/test.controller.spec.ts`)
  - Verify any diagnostic endpoints respond with mocked data.

## Utility Modules

- `HttpExceptionFilter` / `HttpStatusMap`
  - Already have specs; extend to cover GraphQL bypass and RPC error mapping edge cases.
- `ResponseService`
  - Assert timestamp formatting and default status code paths.
- `GraphqlUtils`, `TypeOrmUtils`, `WebSocketUtils`, `GeneralUtils`, `TypeGuards`
  - Ensure every helper function has positive/negative test cases, especially MFA strategy validation and GraphQL field parsing.

## Auth Module

### Controllers

- `AuthenticationController`
  - Login zero/first/third step flows: verify cookies, MFA branches, and unauthorized cases.
  - Logout routes: cookies cleared and services invoked.
  - Backup code + ws refresh: ensure Redis/session interactions.
- `AccountController`
  - Registration, activation, email/phone changes, MFA enable/disable, password flows with Turnstile guard branches.

### Services

- `AuthenticationService`, `AccountService`, `MfaService`, `SessionService`, `SercurityService`, `TurnstileService`
  - Cover token issuance, MFA sequence, Redis/session persistence, security masking utilities.
  - Use fake repositories / Redis mocks; assert error branches raise `RpcException`/`UnauthorizedException`.
- `JwtToolsService`
  - Unit test all token types (`AccessToken`, `ws_AccessToken`, PreAuth, etc.), revoked token handling, decode helpers.
- `SecureCookieService`, `PasswordEncoderService`, `IpService`, `GeoIpService`
  - Validate cookie signing/verification, password hashing, IP lookups (mock geoip-lite).

### Guards

- `GlobalGuard`, `TurnstileGuard`, `WsGuard`
  - Mock reflector metadata and JWT service to cover public vs protected routes, refresh flow, and Turnstile challenge validation.

### DTOs

- `login-first-step`, `login-second-step`, `email`, `change-phone`, `totp`, `test-phone`, etc.
  - Use `class-validator` to assert acceptance/rejection of valid/invalid payloads (already scaffolded but expand to cover new decorators).

## User Module

- `UserModule`/`UserService`
  - Cover repository queries, note CRUD, backup codes, session lookups.
- `User`/`BackupCode` entities
  - Ensure column metadata and hooks behave (using TypeORM testing utilities).
- DTOs (`user-register`, `create-note`, `update-note`)
  - Validate `class-validator` decorators.

## Notification Module

- `NotificationModule`, `MailSenderService`, `SmsSenderService`
  - Mock nodemailer/twilio clients and assert payload mapping, error retries, templating.

## Redis Module

- `RedisModule`, `RedisService`, `PubSubService`
  - Current specs cover basic RedisService operations; extend to `scan`, `scanIterate`, set membership helpers, and Pub/Sub publish/subscribe flows with mocked clients.

## Meilisearch Module

- `MeilisearchModule`
  - Ensure `MEILISEARCH_CLIENT` factory picks host/key from ConfigService.
- `MoleculeSearchService`
  - Verify filter composition, result mapping (synonyms splitting, known flag) and `searchMolecules_excludeAlreadyAdded`.
- `MoleculeService`, `SecurityAuditService`, `MeiliLoggerService`
  - Cover detail fetch caching, audit logging, logger context creation.
- Resolvers (`MoleculeSearchResolver`, `MoleculeResolver`)
  - Assert they proxy arguments to services and honor decorators.
- DTOs (`molecule-search-input`, `molecule-search-result`, `molecule-detail`)
  - Validate `class-validator` metadata and GraphQL schema alignment.

## Molecule Collection Module

- Services: `MoleculeCollectionService`, `MoleculeCollectionItemService`, `MoleculeCollectionItemJoinService`, `CustomMoleculeItemService`, `ChEMBLMoleculeItemService`
  - Cover CRUD, TypeORM query builder branches, `markAsTouched`, DTO conversion, and ChemBL synchronization.
- Entities: `MoleculeCollection`, `MoleculeCollectionItemEntity`, `CustomMoleculeItemEntity`, `ChEMBLMoleculeItemEntity`, `MoleculeCollectionItemJoin`
  - Ensure hooks (`BeforeInsert`), relations, and computed fields (itemsCount) behave.
- DTOs (`CreateMoleculeItemInput`, `AddManyChEMBLItemDTO`, etc.)
  - Validate new `class-validator` decorators.

## Lab Notebook Module

- Services: `LabNotebookService`, `NotebookSectionService`, `NotebookChapterService`, `NotebookPageService`
  - Test hierarchical CRUD, ordering logic, and relation loading.
- Entities: `LabNotebook`, `LabNotebookSection`, `LabNotebookChapter`, `LabNotebookPage`, `LabNotebookLink`
  - Validate ordering hooks and relation metadata.
- DTOs (create/update notebook/chapter/section/page)
  - Ensure validators reject/accept correct payloads.

## Synth Module

- Services: `SynthesisService`, `SyntheticStepService`, `SynthStepMoleculeRefService`
  - Cover creation/update flows, relation linking, and role enforcement.
- DTOs (`SynthesisInput`, `SynthStepInput`, `SynthStepMoleculeRefInput`)
  - Validate numeric/string/enum constraints.

## Embedding Module

- `EmbeddingModule`, `EmbeddingService`, `EmbeddingController`
  - Mock vector store/external API calls; assert DTO validation and response formatting.

## History Module

- `HistoryService`, `HistoryController`
  - Test addition/query of history entities, pagination, and user scoping.

## OAuth2 Client Module

- Services: `OAuth2ClientService`, `OAuth2PersistenceService`, `AccessTokenRefreshService`
  - Cover OAuth handshake, token refresh scheduling, persistence failure handling.
- Controller: `OAuth2ClientController`
  - Validate callback endpoints and error branches.

## Dropbox Object Store Module

- `DropboxObjectStoreService`, `DocumentController`
  - Mock Dropbox SDK interactions, ensure upload/download/delete flows set ACLs correctly.

## Socket.IO Module

- `SocketIoModule`, `SocketIoGateway`
  - Test gateway room joins, message broadcasting, and Redis adapter configuration.

## Mercurion AI Module

- Module + Controller + Service + DTO (`smiles.cls.dto`)
  - Cover SMILES validation, AI orchestration requests, and controller endpoints.

## Meili Logger / Shared Services

- `MeiliLoggerService`
  - Ensure `forContext` returns a Nest‐compatible logger facade and respects log levels.

## Additional E2E / Integration

- `test/app.e2e-spec.ts`
  - Keep smoke endpoints and add targeted GraphQL resolver checks once per sprint.

---

### Implementation Phases

1. **Dependency Hygiene** – Update every spec to provide/mimic required collaborators (ConfigService, DataSource, MeiliLoggerService, etc.) so the suite boots reliably.
2. **Behavioral Coverage** – Replace “should be defined” tests with functional assertions (success/failure paths, DTO validation, TypeORM query expectations).
3. **Cross-Module Scenarios** – Add integration-like specs where beneficial (e.g., Molecule search resolver + service).
4. **Regression Guardrails** – Each fix/regression (like the GraphQL pipe change) gets a dedicated spec to prevent recurrence.

All subsequent test implementations should reference this document to keep parity between planned and delivered coverage.
