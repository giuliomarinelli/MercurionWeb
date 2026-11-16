# 0013 - Canonicalize contract enums and unions

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Eliminate duplicated client/server contract enums and unions with divergent values or casing by deriving both projects from canonical contract definitions.

Source: `SYS-013` in Series `0001`.

## Context

The audit found enum/union definitions duplicated across Angular and Nest with value/casing drift. This task concerns values that cross API/GraphQL/WebSocket boundaries or otherwise form a client/server contract; UI-only enums remain local.

## Relevant files and modules

- `MercurionWebNg/src/app/Models/`
- `MercurionWebNode/src/**/Models/enums/`
- `MercurionWebNode/src/**/Models/DTO/`
- GraphQL generated schema/types
- canonical contract/codegen mechanism from earlier tasks

## In scope

- Inventory duplicated cross-boundary enums/unions by semantic name and actual wire values.
- Select the existing authoritative wire value for each contract or document an intentional migration where already decided.
- Generate/share corresponding TypeScript definitions for Angular and Nest.
- Remove equivalent local contract copies.
- Add compatibility checks preventing value/casing drift.

## Out of scope

- UI-only display enums that never cross a boundary.
- Product changes to enum semantics.
- Database migrations unless strictly necessary to preserve the already-established canonical wire value and safe migration is explicitly defined.

## Decisions already made

- Contract enums/unions have one source of truth.
- Wire values and casing are explicit and testable.
- Local UI representations may map from canonical values but cannot redefine the contract.

## Requirements

1. Produce an inventory of duplicated cross-project enum/union concepts and their values.
2. Distinguish wire contract types from local-only state types.
3. Move contract types to the canonical source/generator.
4. Update serializers, validators, DTOs, GraphQL types and Angular consumers to use generated/shared values.
5. Add round-trip/compatibility tests for the canonical wire representations.
6. Add a static/codegen check that detects equivalent manual copies where feasible.

## Acceptance criteria

- [ ] Every cross-boundary enum/union has one canonical definition.
- [ ] Angular and Nest consume identical generated/shared wire values.
- [ ] No equivalent local contract enum remains with divergent casing/value.
- [ ] Compatibility tests cover serialization/deserialization of representative values.
- [ ] Builds, GraphQL checks and relevant tests pass.
- [ ] Existing behaviour not targeted by this task remains compatible.

## Validation

Run Angular and Nest builds/tests plus canonical contract generation/checks.

## Browser validation

Not applicable unless a corrected enum value changes a currently broken browser flow. If runtime evidence is needed, validate only through `http://localhost:8888`.

## Stop conditions

Block if current client/server/database values conflict and choosing which value is canonical would constitute an externally visible migration decision not already documented.

## Dependencies

- `0001-canonicalize-rest-contract-ownership.md` or another approved canonical cross-project contract mechanism must be available.
- `0002-generate-angular-graphql-documents-and-types.md` should be considered for GraphQL-derived enums to avoid competing generation paths.

## Implementation notes

Do not force every internal enum into a shared package. Share only actual contract semantics; map to richer local types when domain implementation requires it.

## Execution notes

### Summary

Audited every duplicated cross-boundary enum/union between Angular and Nest.
`packages/rest-contracts/src/index.ts` is now the single canonical definition
for every genuine wire-contract vocabulary that was previously redeclared
locally: `AuthProvider` (+ derived `SSO_AuthProvider`), `MfaStrategy` (wire
form), `UserGender` (+ derived `UserGenderControl`), `HistoryItemEntity`,
`VerifyKind`, and the five Feedback enums (`FeedbackEnv`, `FeedbackSource`,
`FeedbackKind`, `FeedbackContextKind`, `FeedbackStatus`). Each is now a frozen
runtime const object with a type derived from it (`typeof X[keyof typeof X]`),
so the value set can never diverge between the type and the runtime object.

The corresponding Nest-local enum files
(`app_modules/sso/Models/enums/auth-provider.enum.ts`,
`app_modules/auth/Models/enums/verify-kind.enum.ts`,
`app_modules/user/Models/enums/user-gender.enum.ts`,
`app_modules/history/Models/enums/history-item-entity.enum.ts`,
`app_modules/feedback/Models/enums/feedback.enums.ts`) no longer redeclare
their own literal values; they now purely re-export the canonical symbols from
`@mercurion/rest-contracts`, so `EnumName.KEY` call sites, TypeORM
`@Column({ enum: ... })` metadata, and `class-validator` `@IsEnum(...)`
decorators keep working unchanged (values proven identical to the previous
local definitions via the full test suite).

Angular does not need any source changes for these enums: it already consumes
(or can consume) the same `@mercurion/rest-contracts` types directly (e.g.
`auth.service.ts` already imports `MfaStrategy`/`SSO_AuthProvider` as types),
so there was no local Angular copy to remove for this set.

Enums intentionally left untouched as out of scope, because they are
internal-only (never cross the client/server boundary) or already canonically
generated:
- `CompareResult`, `ContactChangeKind`, `MfaContext`, `PasswordContext`,
  `TokenType` (Nest, JWT-purpose discriminator), `StorageScope`, `StorageType`,
  `Scope` (opaque permission UUIDs), `ReleaseContext` — server-internal only.
- `AuthorType`, `TicketStatus`, `MoleculeRole` — already the canonical
  single source via NestJS `registerEnumType` + GraphQL-codegen into
  `MercurionWebNg/src/app/generated/{schema,graphql}.ts` (task 0002's
  mechanism); Angular has no hand-written duplicate.
- Angular's local `TokenType` (`auth.service.ts`, `'access_token' |
  'ws_accessToken'`) is a pure client-local `localStorage` key-namespace
  discriminator that never crosses the wire; it does not share semantics with
  Nest's `TokenType` (JWT purpose enum) despite the coincidental name, so it is
  UI-only local state per the task's declared out-of-scope.
- Nest's internal `MfaStrategy` enum (`user/Models/enums/mfa-strategy.enum.ts`)
  intentionally keeps its own values: they are opaque internal DB identifiers
  (UUIDs) used as TypeORM column values, never serialized to clients directly.
  Its wire representation is derived at the boundary via
  `GeneralUtils.getEnumKeyByValue(MfaStrategy, val)`, returning the enum KEY
  (e.g. `EMAIL_OTP`), which must equal the canonical wire `MfaStrategy` union.
  A new compile-time assertion (`MercurionWebNode/src/contracts/rest-contract-parity.ts`)
  and a new runtime test
  (`MercurionWebNode/src/contracts/canonical-enum-parity.spec.ts`) both verify
  that this internal enum's KEY set exactly equals the canonical wire
  `MfaStrategy` value set, closing the casing/value-drift risk without an
  externally visible migration of the opaque DB identifiers (which would be
  out of scope per the task's stop condition).

### Validation performed

- `npm run typecheck --workspace @mercurion/rest-contracts` — pass.
- `npm run typecheck --workspace mercurion_web_node` — pass.
- `npm run typecheck --workspace mercurion_web_ng` — pass.
- `npm run contracts:check --workspace mercurion_web_node` (tsc + existing
  `rest-contract-runtime.spec.ts`) — pass.
- `npx jest --runInBand src/contracts/canonical-enum-parity.spec.ts` (new
  compatibility/round-trip test covering all six canonicalized
  enums/unions) — 6/6 pass.
- Full Nest Jest suite (`npm test -- --runInBand`, workspace
  `mercurion_web_node`) — 119 suites / 172 tests pass.
- Full Angular Karma suite (`npm run test:ci`, workspace `mercurion_web_ng`)
  — 172/172 pass.
- `npm run ci:build` (Angular production build + Nest build) — pass.
- Final pre-integration gate from repository root: clean `npm ci` followed by
  `npm run ci:check` (lint, typecheck, tests, builds, GraphQL drift checks,
  contracts, application-error policy) — pass, 0 failures.

### Browser validation performed

Not applicable. This task changes only shared TypeScript enum/union
definitions and their Nest re-exports; no currently-working browser flow was
broken (no UI/DTO shape changed), and no previously-broken flow required this
fix to become observable in the browser. Per the task's stated condition,
browser validation was not required.

### Changed files

- `packages/rest-contracts/src/index.ts` — canonicalized `AuthProvider`,
  `MfaStrategy` (wire form), `UserGender`/`UserGenderControl`,
  `HistoryItemEntity`, `VerifyKind`, and the five `Feedback*` enums as frozen
  const objects with derived types (single source of truth).
- `MercurionWebNode/src/app_modules/sso/Models/enums/auth-provider.enum.ts`
  — re-exports canonical `AuthProvider`.
- `MercurionWebNode/src/app_modules/auth/Models/enums/verify-kind.enum.ts`
  — re-exports canonical `VerifyKind`.
- `MercurionWebNode/src/app_modules/user/Models/enums/user-gender.enum.ts`
  — re-exports canonical `UserGender`.
- `MercurionWebNode/src/app_modules/history/Models/enums/history-item-entity.enum.ts`
  — re-exports canonical `HistoryItemEntity`.
- `MercurionWebNode/src/app_modules/feedback/Models/enums/feedback.enums.ts`
  — re-exports canonical `FeedbackEnv`, `FeedbackSource`, `FeedbackKind`,
  `FeedbackContextKind`, `FeedbackStatus`.
- `MercurionWebNode/src/contracts/rest-contract-parity.ts` — added a
  compile-time assertion that the internal `MfaStrategy` DB enum's keys equal
  the canonical wire `MfaStrategy` union.
- `MercurionWebNode/src/contracts/canonical-enum-parity.spec.ts` (new) —
  runtime compatibility tests proving every canonicalized Nest enum is
  reference-identical to its `@mercurion/rest-contracts` source, plus the
  `MfaStrategy` DB-key/wire-value round-trip check.

### Blocker / human decision required

_None._
