# 0162 - Create a typed email-template registry

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [x] SKIPPED_DEPENDENCY
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

### Dependency skip (2026-09-03 session)

- Direct terminal prerequisite(s): `0158` (DATA-009, SKIPPED_DEPENDENCY).
- Transitive chain: 0008 SYS-008 BLOCKED -> 0150 DATA-001 SKIPPED_DEPENDENCY -> 0158 DATA-009 SKIPPED_DEPENDENCY -> 0162 DATA-013 SKIPPED_DEPENDENCY.
- No feature branch was created and no worker was invoked.
