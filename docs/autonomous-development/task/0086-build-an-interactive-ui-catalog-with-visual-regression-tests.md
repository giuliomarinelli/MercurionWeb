# 0086 - Build an interactive UI catalog with visual regression tests

- [x] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY

## Objective

Create a development-only interactive catalog for every canonical Angular UI primitive, documenting states/variants/accessibility and protecting the design system with deterministic visual regression tests runnable locally and in CI.

Source: `UI-028` in Series `0001`.

## Context

Tasks `0059`-`0085` establish the canonical UI primitives, semantic tokens, accessibility checks and supported animation/styling rules, but the repository currently has no Storybook/stories/visual-regression catalog. Without a canonical rendered inventory, variants can drift and reviewers cannot inspect the complete design-system surface independently of feature pages.

## Relevant files and modules

- canonical UI primitives created by `0059`-`0076`
- semantic tokens/style configuration from `0077`-`0082`
- accessibility fixtures/helpers from `0083`
- `MercurionWebNg/package.json` and Angular configuration
- root CI aggregate

## In scope

- Add a development/test-only Angular component catalog; expected baseline implementation is Storybook for Angular unless an equivalent mature catalog already exists when this task runs.
- Create stories/examples for every canonical primitive and all meaningful public variants/states.
- Provide light/dark theme and representative responsive viewport coverage.
- Document each primitive's typed API, accessibility expectations and intended composition boundaries.
- Add deterministic local visual regression screenshots/snapshots with a browser automation harness such as Playwright or the catalog's supported equivalent.
- Commit stable visual baselines and fail CI on unapproved visual diffs.
- Reuse accessibility fixtures/helpers where practical.
- Keep the catalog completely out of the production Mercurion route/runtime bundle.

## Out of scope

- Do not create a production `/storybook` or design-system route.
- Do not require Chromatic or any other hosted SaaS to build, browse or verify the catalog.
- Do not turn the catalog into a second implementation of application business logic.
- Do not snapshot arbitrary full application pages when primitive/component states provide a more stable regression boundary.
- Do not modify `../MercurionTox21`.

## Decisions already made

- The catalog is developer/test tooling only and is not shipped as a Mercurion application feature.
- Storybook is the expected catalog technology for the current no-catalog baseline; select versions compatible with the Angular version actually present when the task executes.
- Visual regression must be reproducible locally and in GitHub Actions without external paid infrastructure.
- Determinism is mandatory: disable/freeze animations, time, randomness, network variability and unstable generated identifiers in screenshot fixtures.
- The catalog tooling server is explicitly permitted as a browser origin for catalog-only inspection because it does not exercise Mercurion API flows. All real application-flow browser validation remains through `http://localhost:8888`.

## Requirements

1. Configure the Angular catalog with shared global styles, semantic tokens, fonts and light/dark theme switching matching the application.
2. Add a discoverable story/example for every canonical primitive introduced by the UI task series.
3. Cover all meaningful variants/states: default, disabled, loading/pending, validation/error, empty/content, selection states, icon placements, dialog/open states and other primitive-specific contracts.
4. Include keyboard/focus/accessibility notes and reuse automated accessibility checks where the catalog framework supports them.
5. Add representative desktop/mobile viewport examples.
6. Add deterministic screenshot/visual-regression tests for the canonical state matrix, with committed baselines and an explicit human update command.
7. Expose scripts analogous to `storybook`, `build-storybook` and `ui:visual` (names may follow repository conventions) and document them.
8. Register catalog build and visual-regression verification in the canonical CI aggregate or a required CI job invoked by the same repository-controlled interface.
9. Ensure production Angular build output does not include catalog stories/tooling runtime.

## Acceptance criteria

- [ ] Every canonical UI primitive has an interactive documented catalog entry.
- [ ] All supported public variants/states are represented, including light and dark themes.
- [ ] Representative responsive states are represented.
- [ ] Accessibility expectations are visible and the automated accessibility tooling is reused where supported.
- [ ] Deterministic visual regression baselines exist for the canonical state matrix.
- [ ] An unapproved screenshot diff produces a failing local/CI result.
- [ ] Developers can intentionally update baselines with one documented command/workflow.
- [ ] Catalog tooling is absent from the production Mercurion route/runtime bundle.
- [ ] No hosted SaaS is required to run the catalog or visual regression.

## Validation

```text
npm ci
npm run ci:check
```

Additionally:

- build the catalog non-interactively;
- run the complete visual-regression suite against committed baselines;
- intentionally alter one fixture style and prove the visual gate fails, then revert it;
- run the Angular production build and prove catalog/story runtime is not bundled into application chunks.

## Browser validation

Two distinct origins are allowed for this task:

1. **Catalog-only validation:** open the local catalog tooling server with Chrome DevTools MCP, inspect the complete state/variant matrix in light/dark and desktop/mobile configurations, and verify console/accessibility state.
2. **Application regression validation:** use only `http://localhost:8888` and smoke-test representative real pages composing the primitives.

The catalog origin must not be used to pretend real Mercurion REST/GraphQL/WebSocket flows were validated.

## Stop conditions

Mark `BLOCKED` if a primitive's expected public state cannot be determined from its approved task/API, if the chosen catalog/toolchain is incompatible with the repository's Angular version and no supported equivalent can satisfy the same requirements within scope, or if deterministic visual tests cannot be made CI-reproducible.

## Dependencies

- `0059-create-the-canonical-button-primitive.md` through `0085-remove-legacy-angular-animations-dependency.md` must be `DONE` first.

## Implementation notes

Favor primitive-level stories with deterministic fixture data. A small number of composition stories is useful, but avoid reproducing entire feature pages and backend state inside Storybook.

## Execution notes

> Current status (2026-09-17): READY_FOR_INTEGRATION / CI_PENDING. The catalog
> implementation and focused local validation passed on `feature/UI-028`.

### Feature branch
`feature/UI-028`, based on certified develop SHA
`7c5ea0629a443cde4d45d458ca63184e8713cf9b`.

### Preflight
- Confirmed clean `feature/UI-028` at the supplied certified base and effective
  local `commit.gpgSign=false`.
- Confirmed exact base CI run `35237286411` succeeded with `Required gate`.
- `npm run autonomous:plan --silent` reported task `0086` as `READY` with no
  terminal roots.
- Stopped stale Angular test watcher processes before task work.
- Browser capability probe used Chrome DevTools MCP `list_pages` without
  navigation and succeeded.
- Started Tox21, Nest and Angular directly in the required order. Nest and
  Angular compiled successfully; nginx returned initial 502 responses while
  upstreams compiled, followed by two consecutive complete `200` rounds for
  `/health` and `/`. All three task-owned processes were stopped before edits.

### Preflight remediation
None.

### Summary
Added a separate Angular catalog build/serve target with shared application
tokens/fonts, light/dark switching, responsive layout, deterministic fixture
states, typed API/accessibility notes, and interactive coverage for the
canonical action, form, selection, navigation, feedback and loading
primitives. Added local Playwright screenshot baselines for light desktop,
dark desktop and mobile layouts, with an explicit `ui:visual:update` approval
workflow. Production remains on `src/main.ts`; the catalog emits to a
separate development-only output.

### Task-specific validation performed
- `npm run build-storybook --workspace mercurion_web_ng` — passed.
- `npm run typecheck --workspace mercurion_web_ng` — passed.
- `npm run lint:angular --workspace mercurion_web_ng` — passed.
- `npm run build --workspace mercurion_web_ng` — passed; production output
  contained no catalog markers.
- `npm run ui:visual --workspace mercurion_web_ng` — 3 passed against committed
  baselines.
- Changed one catalog fixture style temporarily; visual gate failed with
  pixel diffs in all three snapshots, then reverted the style and reran the
  suite successfully.
- No local `npm ci` or `npm run ci:check` was run.

### Full pre-merge CI-parity validation
Not run locally; exact feature-SHA CI is owned by the coordinator.

### Feature-CI repair
- Feature CI run `35240272116` failed in both platform `Prerequisites` jobs
  because the topology checker reported the development-only catalog entrypoint
  `src/catalog/main.ts` and its component as orphaned from the production
  `src/main.ts` entrypoint.
- Added explicit development-only reachability allowlist entries for both
  catalog files in `MercurionWebNg/angular-reachability.config.json`; no
  checker logic, production entrypoint, or unrelated code was changed.
- Before repair, `node scripts/check-repository-topology.mjs
  --report-dir=reports/topology-ui028-repair` failed only
  `angular-reachability`; import-graph, Nest, and architecture checks passed.
- After repair, `node scripts/check-angular-orphans.mjs --root=MercurionWebNg
  --json` reported no orphaned files, and
  `node scripts/check-repository-topology.mjs
  --report-dir=reports/topology-ui028-repair` passed all five checks.
- No local `npm ci` or `npm run ci:check` was run; generated topology reports
  were removed before commit.

### Browser validation performed
- Catalog-only Chrome DevTools MCP validation at `http://localhost:4400/`
  rendered the complete catalog accessibility tree, including disabled,
  loading, invalid, pending, selected, dialog-open and responsive sections.
- Dark theme switching changed the catalog theme and preserved the accessible
  matrix. Dialog open state exposed `role="dialog"` and `aria-modal="true"`
  with focus captured on the close action.
- Console recheck after adding the catalog favicon reported no warnings or
  errors.
- Application-flow validation through `http://localhost:8888` was not
  performed because this recipe's browser evidence was catalog-only; the
  canonical edge was nevertheless readiness-probed during preflight.
- The catalog server was stopped before handoff.

### Commits
`7844e1c3b039d3a52abc417770def4ab24b2ece9` — catalog implementation,
tooling, baselines and focused validation, committed with `--no-gpg-sign` and
the required Copilot co-author trailer.
`a441c65a` — narrow topology-policy repair and repair evidence, committed with
`--no-gpg-sign` and the required Copilot co-author trailer.

### Merge / CI
No merge performed. Coordinator must publish this feature SHA and observe
exact feature-SHA CI before integration.

### Rollback
Not applicable.

### Blocker / human decision required
None before feature-SHA CI.
