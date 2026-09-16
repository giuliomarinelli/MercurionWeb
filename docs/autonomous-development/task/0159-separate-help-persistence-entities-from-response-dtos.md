# 0159 - Separate Help persistence entities from response DTOs

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Stop returning and mutating TypeORM `Ticket`/`TicketMessage` entities as API views; introduce immutable user/support response models and explicit mappers/presenters that apply public-ID, content and visibility rules without modifying persistence state.

Source: `DATA-010` in Series `0001`.

## Context

`HelpService` currently selects partial entities and then mutates them for presentation: it rewrites `publicId`, clears `userId`/`authorId` fields through `Object.entries`, assigns transient full-name properties and serializes message content on the entity. The persistence classes are also GraphQL object types. This couples field authorization and wire representation to mutable ORM instances and makes a read operation capable of changing the in-memory entity used by later logic.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/help/Models/entities/`
- `MercurionWebNode/src/app_modules/help/Models/DTO/`
- `MercurionWebNode/src/app_modules/help/services/help.service.ts`
- `MercurionWebNode/src/app_modules/help/resolvers/help.resolver.ts`
- public-ID formatter from `0157`
- GraphQL schema/contracts

## In scope

- Define immutable API/view types for ticket summary, detail and message responses with explicit user/support visibility variants where needed.
- Add side-effect-free mappers/presenters from persistence/query projections to response DTOs.
- Move public-ID formatting, content-delta serialization and computed names into mapping/presentation.
- Replace field-deletion/entity mutation with explicit construction of allowed response shapes.
- Decouple TypeORM entities from GraphQL presentation where practical while preserving the public schema.
- Prefer query projections/raw DTO rows when a response needs only selected fields rather than materializing a partially populated entity and mutating it.
- Add tests proving source entities/projections remain unchanged after presentation.

## Out of scope

- Do not change Help authorization policy; `0160` owns owner/support permission unification.
- Do not redesign pagination contract established by `BE-028`/system tasks.
- Do not change public GraphQL field names or nullability unless required by an already-approved contract migration.
- Do not expose new persistence/internal fields.

## Decisions already made

- Persistence entities are internal mutable storage models and never serve directly as sanitized response objects.
- Response/view DTOs are immutable plain data with explicit fields.
- Visibility is represented by the selected presenter/view contract, not deleting keys from an entity at runtime.
- Formatting is pure and does not mutate database identity fields.

## Requirements

1. Inventory every Help resolver return shape and the fields currently hidden/added for owner/support/ViewUsers paths.
2. Define typed response models preserving the existing GraphQL contract and separating DB-only fields from computed/transient fields.
3. Implement pure presenters/mappers using the canonical public-ID formatter from `0157`.
4. Refactor list/detail/message queries to return projections suitable for mapping without `Object.entries` field deletion or entity mutation.
5. Ensure `contentDelta` has one canonical transport representation rather than mutating the entity value during reads.
6. Remove presentation-only mutable properties from persistence entities where they are no longer required.
7. Add tests that deep-freeze/clone source inputs and prove presenters do not mutate them; add schema snapshot/contract tests.

## Acceptance criteria

- [ ] No Help resolver/service returns a mutated TypeORM entity as the sanitized public response.
- [ ] User/support response fields are explicit and compile-time typed.
- [ ] Public-ID and computed-name formatting occurs in pure mapping code.
- [ ] Persistence entities contain no response-only mutation workflow.
- [ ] Existing GraphQL response contract remains compatible.
- [ ] Tests prove mapping does not mutate persistence inputs.

## Validation

Run Help presenter/unit tests, resolver contract tests, schema drift validation, Help integration tests, full Nest unit/E2E tests, build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if the current GraphQL schema intentionally exposes a persistence-only field whose removal/visibility requires a public contract decision not already covered by versioning rules.

## Dependencies

- `0157-make-help-public-ids-single-source-and-deterministic.md` must be `DONE`.
- `SYS-011`/`SYS-022` contract and versioning rules should be `DONE` before changing any public wire shape.

## Execution notes

### Feature branch
`feature/DATA-010` at base `c8b2bf798d13f4116c78803684abb0b547871aae`.
### Preflight
Clean branch and workspace confirmed; `develop`, `origin/develop`, and HEAD
matched the supplied base SHA. Local `commit.gpgSign` is `false`, no
workspace-consuming Angular/Nest/Tox21/Jest processes were active, and the
focused Help service baseline test passed. GitHub Actions run
`35042741481` for the exact base SHA completed successfully with Ubuntu and
Windows prerequisite jobs, Nest unit/E2E, GraphQL/static gates, builds,
containers, browser journeys, and `Required gate` green.
### Preflight remediation
None. No install or aggregate CI command was run locally.
### Summary
Added immutable GraphQL response DTOs and pure Help presenters. Help queries and
mutations now construct explicit response shapes from persistence projections,
perform public-ID/content formatting and visibility/name presentation without
mutating entities, and persistence entities no longer carry GraphQL-only
presentation properties.
### Task-specific validation performed
Passed `npm test --workspace mercurion_web_node -- --runInBand
--runTestsByPath src/app_modules/help/models/dto/help-presenters.spec.ts
src/app_modules/help/services/help.service.spec.ts` (3 tests), Nest
`typecheck`, Nest `lint`, Nest `build`, GraphQL `schema:check`, and
`git diff --check`. Presenter tests deep-clone sources and verify public IDs,
content-delta serialization, computed names, and hidden user/support fields.
### Full pre-merge CI-parity validation
Complete clean-install and aggregate CI parity are delegated to GitHub Actions
for the pushed exact feature SHA; local `npm ci` and `npm run ci:check` were
intentionally not run.
### Browser validation performed
Not applicable per recipe.
### Commits
`f2c4c2c2ac0c701c19390db60ba8a7432b22e492`
(`feat(help): separate persistence entities from response DTOs`, with required
Co-authored-by trailer); `fcbd4718f647f617c13a12aa13edff3d58154df4`
(`docs(task): record DATA-010 validation`, with required Co-authored-by
trailer).
### Merge / CI
Implementation SHA `f2c4c2c2ac0c701c19390db60ba8a7432b22e492` Actions run
`35043798417` completed successfully. Final feature SHA
`fcbd4718f647f617c13a12aa13edff3d58154df4` Actions run `35044274747`
completed successfully via the repository's metadata validation path because
the final delta was execution notes only. The implementation run had Ubuntu
and Windows prerequisites,
Nest/Angular unit and E2E suites, GraphQL/static gates, builds, container
checks, browser journeys, database schema, and `Required gate` green; the
final run's autonomous validators, metadata check, and `Required gate` were
also green.
Integration remains coordinator-owned; this worker did not merge or mutate
`develop`.
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
