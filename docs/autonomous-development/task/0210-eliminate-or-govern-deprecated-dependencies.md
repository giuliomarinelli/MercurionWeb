# 0210 - Eliminate or govern deprecated dependencies

- [ ] DONE
- [ ] BLOCKED
- [ ] REVERTED
- [ ] SKIPPED_DEPENDENCY
## Objective

Remove or safely replace every audited deprecated/legacy direct dependency and make any unavoidable residual dependency an explicit time-bounded exception so clean install/build output contains no unaccepted deprecation warning.

Source: `QA-024` in Series `0001`.

## Context

The audit identified legacy Angular animations, Thumbmark v0, CommonJS Quill/RDKit paths, `subscriptions-transport-ws`, `scmp` and an old `nats` package among the dependency risks. Earlier domain tasks already establish the intended animation, fingerprint, bundle, GraphQL/WebSocket and NATS boundaries. This task consumes those stabilized abstractions, inspects the current post-refactor dependency graph and completes dependency replacement without reopening product protocols or hiding install/build diagnostics.

## Relevant files and modules

- root and project `package.json`/lockfile dependency graph
- Angular animation migration from `0085`
- fingerprint contract/adapter from `0014`
- Apollo GraphQL/WebSocket client configuration
- Quill and RDKit lazy adapters/bundle gate
- Nest comparison/cryptographic helpers currently using `scmp`
- typed NATS registry/adapters from `0146`/`0147`
- dependency policy and canonical CI scripts

## In scope

- Re-inventory direct/transitive deprecated packages and all clean-install/build deprecation warnings.
- Remove dependencies already made obsolete by earlier tasks.
- Upgrade or replace remaining direct legacy packages behind their canonical adapters/contracts.
- Migrate configuration/imports/protocol usage and remove obsolete compatibility code.
- Add focused behavioral, transport and browser tests for each material replacement.
- Maintain a narrow exception register for a residual package only when replacement is currently unsafe, with owner, reason, upstream reference and removal deadline/trigger.
- Fail CI on a new deprecated direct dependency or unregistered deprecation warning.

## Out of scope

- Do not perform unrelated blanket upgrades merely because newer versions exist.
- Do not replace a wire protocol without compatibility evidence from its current producer/consumer.
- Do not silence install/build warnings, pin an older npm, or hide packages from scanning to obtain green output.
- Do not keep both old and new libraries as permanent parallel implementations.
- Do not modify `../MercurionTox21`; it remains read-only.

## Decisions already made

- Audited legacy dependencies are removed when the earlier canonical boundary makes them unnecessary.
- A replacement must preserve observable behavior and wire compatibility through tests.
- Direct dependencies with no maintained/safe role are removed from manifests and lockfiles.
- Any unavoidable exception is exact-version scoped, owned, justified and time-bounded; an undocumented exception is a CI failure.
- Clean install/build diagnostics have zero unaccepted deprecation warnings.

## Requirements

1. Produce a current dependency/warning inventory identifying whether each audited package is direct, transitive, runtime or development-only and which code/config owns it.
2. Confirm legacy Angular animation dependencies are absent after `0085` and remove any residual direct provider/package ownership.
3. Upgrade/replace Thumbmark v0, legacy GraphQL subscription transport, `scmp` and old `nats` usage through the canonical fingerprint, transport, security and NATS adapters, with compatibility tests.
4. Resolve Quill/RDKit CommonJS entrypoints according to the bundle policy from `0203`, without reintroducing eager initial-bundle weight.
5. Remove obsolete imports/config/polyfills and regenerate the canonical lockfile only through the supported package-manager workflow.
6. For each material migration, add behavioral/contract coverage including failure paths and confirm no duplicate legacy implementation remains.
7. Add a machine-readable dependency exception policy and a deterministic check for deprecated direct packages, audited package names and unaccepted install/build warnings.
8. Register the dependency-deprecation gate in canonical CI and retain a concise dependency/warning report.

## Acceptance criteria

- [ ] None of the audited deprecated packages remains as an unexplained direct dependency.
- [ ] Replacements preserve fingerprint, GraphQL/WebSocket, scientific NATS and browser/editor behavior as applicable.
- [ ] Quill/RDKit changes do not regress the initial-bundle/CommonJS gate.
- [ ] Clean install and build emit zero unaccepted deprecation warnings.
- [ ] Every residual exception is exact, owned, justified and has a removal deadline/trigger.
- [ ] CI rejects a newly deprecated direct dependency or an unregistered warning.

## Validation

Run clean install with warning capture, dependency-tree/policy checks, focused migration tests, GraphQL/WebSocket and NATS contract/integration tests, Angular production bundle/CommonJS analysis, both builds and repository-wide CI parity.

## Browser validation

Through `http://localhost:8888`, exercise every browser-facing dependency migration: fingerprint-dependent authentication, GraphQL subscription/realtime behavior, rich-text/editor and RDKit rendering where affected. Inspect lazy chunks, network reconnect behavior and relevant console errors.

## Stop conditions

Mark `BLOCKED` if replacing an audited dependency requires an unresolved public wire-format, scientific-runtime or product-behavior decision, or if the only maintained replacement introduces a material compatibility/security tradeoff not settled by an earlier task. Record the exact package and decision; do not hide the warning.

## Dependencies

- `0014-canonicalize-fingerprint-contract.md` and `0085-remove-legacy-angular-animations-dependency.md` must be `DONE`.
- `0104-encapsulate-ketcher-and-rdkit-behind-lazy-adapters.md`, `0146-define-typed-versioned-nats-contract-registry.md` and `0147-apply-bounded-failure-policy-to-scientific-rpc-adapters.md` should be `DONE`.
- `0203-enforce-angular-bundle-and-commonjs-gates.md` must be `DONE`.

## Implementation notes

Evaluate the current graph, not only the original audit list. A removed direct package may still be pulled transitively; classify that accurately and constrain only what the repository actually controls.

## Execution notes

> Current status (2026-09-18): PENDING. The planner classified this recipe
> `READY`; the historical dependency-skip text below is retained only for
> traceability and is not an execution result.

### Feature branch
`feature/QA-024` from base `514953820b4572256e000ff81c8bad431e3d09e4`.
### Preflight
Exact base-SHA Actions run `35297549970` completed successfully for
`514953820b4572256e000ff81c8bad431e3d09e4`, including `Required gate`.
The authoritative planner reported `0210` as `READY` with no errors, cycles or
stale skips. The feature branch was clean and matched the supplied base SHA.
Focused unchanged checks passed (`git diff --check` and local signing policy
was `commit.gpgSign=false`). No local `npm ci` or `npm run ci:check` was run.

The pre-change browser/runtime capability probe started Tox21, Nest and Angular
in canonical order with live handles. After startup, two initial nginx rounds
returned retryable `502` responses while the workspaces compiled, followed by
two consecutive `200` responses from `http://localhost:8888/health` and
`http://localhost:8888/`. Chrome DevTools MCP was callable without navigation,
and a fresh ordinary login through `http://localhost:8888/login` reached the
protected dashboard. All task-owned processes were stopped before mutation.
### Preflight remediation
_None._
### Summary
Replaced the stale dependency-skip narrative with a current inventory and
machine-readable policy. The policy rejects deprecated audited packages as
direct dependencies, requires exact approved versions for the canonical
fingerprint/NATS/lazy editor and chemistry adapters, and records only
time-bounded transitive exceptions for package-manager-owned compatibility
metadata. A deterministic warning report and CI gate now reject unregistered
warnings or unexplained direct ownership.
### Task-specific validation performed
Passed:

- `npm run ci:dependencies` — 126 direct packages, three registered
  transitive exceptions, zero unaccepted warnings, plus the negative policy
  probe.
- `npm run ci:angular:legacy-animations`.
- `npm run ci:graphql`.
- `npm run lint:angular --workspace mercurion_web_ng`.
- `npm run typecheck --workspace mercurion_web_ng`.
- `npm run ci:lint:nest`.
- `npm run ci:typecheck:nest`.
- `npm run ci:build:angular` — initial bundle `918602` bytes under the
  `1000000` byte gate; Quill and RDKit remained lazy.
- `git diff --check`.
### Full pre-merge CI-parity validation
Not run locally by policy. Exact feature-SHA CI is coordinator-owned.
### Browser validation performed
Using Chrome DevTools MCP through `http://localhost:8888`:

- Protected runtime state was available through the authenticated account API
  with HTTP 200 after the pre-change fresh ordinary login.
- The lazy Ketcher editor loaded at
  `/molecules/editor?mode=create`, including its editor iframe and lazy
  resources.
- The molecule-detail route loaded and showed the expected unavailable-record
  error rather than a route, bundle or navigation failure.
- No console errors were reported on the editor page.
- Two consecutive post-change readiness rounds returned HTTP 200 from
  `/health` and `/`; all task-owned processes were stopped afterward.
### Commits
_Pending implementation commit._
### Merge / CI
_Not started._
### Rollback
_Not applicable._
### Blocker / human decision required
Direct terminal prerequisite: 0085 (UI-027), `SKIPPED_DEPENDENCY`.
Transitive root: 0076 (UI-018), `BLOCKED`; its preserved feature branch
remains deliberately frozen.

### Dependency skip

Direct terminal prerequisite: `0085` (`UI-027`), `SKIPPED_DEPENDENCY`; its
transitive root is `0071` (`UI-013`), `BLOCKED`. Materialized on 2026-09-13.
