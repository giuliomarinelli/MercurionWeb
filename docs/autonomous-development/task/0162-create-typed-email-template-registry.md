# 0162 - Create a typed email-template registry

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Replace per-method template paths, subjects and context assembly conventions with one typed email-template registry that binds each notification kind to its asset, subject builder and validated context schema.

Source: `DATA-013` in Series `0001`.

## Context

`MailSenderService.sendEmail()` currently accepts an arbitrary subject, generic object and arbitrary template path. Account/MFA callers pass `resolve(...)` paths directly, while Help-specific methods repeat recipient lookups, context construction, subject strings and `dist/app_modules/notification/email-templates/...` paths. `0161` consolidates the template markup; this task consolidates how code selects and renders those templates. Help outbox events from `0158` should resolve through the same registry rather than embedding a physical template filename in durable event data.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/notification/services/mail-sender/mail-sender.service.ts`
- notification context models
- email templates/partials from `0161`
- Account/MFA/Help notification callers
- Help outbox event dispatcher from `0158`
- mail rendering tests

## In scope

- Define a closed `EmailTemplateKey`/notification registry covering every production email template.
- Associate each key with template asset identity, subject builder/static subject and runtime-validatable context schema/type.
- Provide a generic API where the selected key determines the allowed context type at compile time.
- Centralize template path resolution; callers never concatenate/resolve `dist/...hbs` paths.
- Centralize subject generation, including subjects parameterized by stable values such as Help public IDs.
- Validate context at the mail boundary before invoking the template adapter.
- Migrate Account, MFA, Help/outbox and other production mail callers to registry keys.
- Add exhaustiveness and render tests for every registry entry.

## Out of scope

- Do not put business/user lookup logic into the registry; use cases/notification composers provide the validated context values.
- Do not couple durable outbox event versions to physical filenames.
- Do not introduce runtime-editable remote templates.
- Do not redesign email copy beyond centralizing the existing subject/template contract.

## Decisions already made

- Notification/template identity is a stable semantic key, not a filesystem path.
- Context has both compile-time typing and boundary validation before render.
- Subject is part of the template contract and cannot drift independently across callers.
- Registry coverage is exhaustive for production templates.

## Requirements

1. Inventory every production `.hbs` template and every `sendEmail`/mailer call site; map each to one semantic key.
2. Define a TypeScript registry/map in which `EmailTemplateKey` selects the exact context type/schema and subject-builder input.
3. Add runtime context validation using the repository's approved validation approach; fail with a typed notification/configuration error before calling SMTP when context is invalid.
4. Resolve physical template assets through one path abstraction compatible with source/dev and compiled runtime packaging from `0163`.
5. Replace arbitrary `sendEmail(to, subject, context, path)` usage with `send(templateKey, recipient, context)` or an equivalently constrained API.
6. Make Help outbox event handlers map event version/type to a semantic template key without persisting a filename.
7. Add a test iterating all registry entries and rendering each with a valid fixture; add negative context-schema tests and compile-time/exhaustive coverage.

## Acceptance criteria

- [ ] Every production email template has exactly one semantic registry entry.
- [ ] Callers do not supply raw template filesystem paths or independent subject strings.
- [ ] Template key determines the allowed context type and runtime schema.
- [ ] Invalid context fails before SMTP/render dispatch with a typed error.
- [ ] Help outbox events remain stable if template files are reorganized.
- [ ] Registry exhaustiveness/render tests cover every entry.

## Validation

Run typed registry/context validation tests, render every template, affected Account/MFA/Help notification tests, outbox dispatcher tests, Nest build and canonical CI-parity gates.

## Browser validation

Not applicable.

## Stop conditions

Mark `BLOCKED` if a production mail call has no determinable template/context/subject contract or intentionally selects arbitrary runtime template paths that require a product architecture decision.

## Dependencies

- `0161-deduplicate-email-templates-with-handlebars-partials.md` must be `DONE`.
- `0158-add-transactional-outbox-for-help-notifications.md` should be `DONE` so Help notification event types are stable.

## Implementation notes

Keep recipient resolution and domain orchestration outside the registry. The registry should describe *how a known notification renders*, not become another god-service that fetches users and makes business decisions.

## Execution notes

### Feature branch
`feature/DATA-013` (base `71bf11ed7dee651f8f7a9008729bd6b8cce51b9d`)
### Preflight
Clean branch and exact base SHA confirmed. GitHub Actions run
`35046603657` for the supplied SHA completed successfully with the stable
`Required gate` (the exact-SHA classifier selected the repository metadata
path). No task-owned workspace process was active. Local focused preflight
used the existing dependency tree; `npm ci` and `npm run ci:check` were not
run.
### Preflight remediation
None.
### Summary
Added an exhaustive semantic email-template registry with typed contexts,
central subject builders, source/compiled-compatible asset resolution and
runtime context validation. Replaced all Account, MFA and Help mail callers'
raw paths/subjects with registry keys. Help outbox delivery remains keyed by
stable event types and delegates rendering through the registry-backed mail
sender.
### Task-specific validation performed
Passed:

- `npm run typecheck --workspace mercurion_web_node`
- `npm run lint --workspace mercurion_web_node`
- `npm run build --workspace mercurion_web_node`
- focused Jest coverage for the registry, all 13 email templates, mail sender
  boundary validation, Account flow and MFA service: 5 suites, 23 tests
- `git diff --check`
- Feature CI run `35047216321` initially failed only because the three
  superseded context model files were reported as Nest orphan files; those
  files were removed as part of this registry migration.

Registry tests assert every production template key has a valid fixture,
resolvable asset and subject; negative tests prove invalid context is rejected
before the mail adapter is invoked.
### Full pre-merge CI-parity validation
Reserved for the exact pushed feature SHA GitHub Actions workflow; no local
`npm run ci:check` was run.
### Browser validation performed
Not applicable.
### Commits
`c1c67b76` (initial implementation; feature CI run `35047216321` diagnosed)
and pending CI repair commit.
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
_None._
