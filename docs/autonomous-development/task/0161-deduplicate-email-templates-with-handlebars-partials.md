# 0161 - Deduplicate email templates with Handlebars partials

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Refactor the 13 Handlebars email templates so shared document layout, branding, typography, footer and reusable content blocks live in tested partials/layouts while each template contains only message-specific content.

Source: `DATA-012` in Series `0001`.

## Context

The audit measured approximately 2,712 duplicated template lines (86.65% duplication) across the notification emails. The current files are each roughly full HTML documents, making a branding/layout/security/accessibility change a many-file edit. The mailer currently uses `HandlebarsAdapter` in strict mode but has no canonical partial/layout structure configured.

## Relevant files and modules

- `MercurionWebNode/src/app_modules/notification/email-templates/`
- Handlebars/Mailer configuration
- email context models
- notification rendering tests
- build asset packaging finalized by `0163`

## In scope

- Extract one canonical HTML/email shell and reusable header/footer/branding/typography/CTA blocks into Handlebars partials/layouts.
- Configure the Handlebars adapter to resolve partials deterministically in dev/test/build output.
- Reduce each existing template to its message-specific subject/body/context usage.
- Preserve current user-facing wording and links unless a duplicated inconsistency is demonstrably accidental.
- Keep strict rendering so missing required context fails tests rather than rendering empty placeholders.
- Add render snapshots/semantic assertions for every template and representative mail clients' critical markup constraints where practical.
- Add a duplication/structure guard so full layout copies are not reintroduced.

## Out of scope

- Do not redesign brand visuals/copy unrelated to deduplication.
- Do not introduce a remote email-template SaaS.
- Do not define the typed template/subject registry yet; `0162` owns registry/orchestration.
- Do not solve asset-copy path inconsistencies here; `0163` owns build packaging.

## Decisions already made

- Shared visual structure has one source of truth.
- Templates remain repository-owned Handlebars assets.
- Template rendering is strict and deterministic.
- Message-specific templates may override only explicitly supported layout blocks/variables.

## Requirements

1. Inventory common sections across all 13 templates and separate truly common markup from message-specific content.
2. Create a clear `layouts`/`partials`/message-template structure (or equivalent supported by the adapter) with stable names.
3. Configure `HandlebarsAdapter` partial resolution without absolute machine-specific paths.
4. Refactor every existing email template to use the shared layout/partials and remove copied HTML/CSS sections.
5. Preserve escaping rules and explicitly mark only already-approved trusted HTML fields as raw where required; do not broaden unsafe triple-stache usage.
6. Add render fixtures for every template context and assert critical CTA URL, message copy, brand header/footer and valid output.
7. Add a deterministic check/duplication threshold or structural test to prevent future full-layout duplication.

## Acceptance criteria

- [ ] Shared email layout/header/footer/typography markup exists once in canonical partial/layout assets.
- [ ] All 13 message templates render through that shared structure.
- [ ] Existing user-facing content and destination URLs remain compatible.
- [ ] Missing required context fails rendering tests.
- [ ] Template duplication is materially reduced and guarded against regression.
- [ ] No unsafe raw HTML rendering is introduced by the refactor.

## Validation

Render every template with typed fixture data, compare semantic/snapshot output, run notification/mail tests, build the Nest project and run canonical CI-parity gates.

## Browser validation

Not applicable. Validate generated email HTML through deterministic render tests rather than the Mercurion browser runtime.

## Stop conditions

Mark `BLOCKED` if two templates intentionally use materially different branding/layout semantics and current product requirements do not establish whether they should converge; preserve those differences explicitly instead of erasing them by assumption.

## Dependencies

- No DATA-specific dependency; canonical Nest config/build must already be green.

## Implementation notes

Do not optimize only for textual line-count reduction. The goal is one maintainable semantic layout while retaining email-client-safe markup, including necessary table/inline-style patterns.

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
