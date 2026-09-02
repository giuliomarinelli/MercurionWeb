# Series 0001 recipe audit

Audit date: 2026-09-01

Scope: Series `0001`, executable recipes `0001`–`0220`

## Result

The Series registry and executable queue are structurally coherent:

- 220 contiguous task numbers;
- 220 unique Source identifiers;
- one exact Series-to-task Source mapping per number;
- one `DONE`, `BLOCKED`, `REVERTED`, and `SKIPPED_DEPENDENCY` marker per recipe, mutually exclusive, with no task currently terminal;
- all mandatory recipe sections present;
- all full task-file references resolve to current filenames;
- every forward dependency reference is explicitly advisory, so the hard-dependency graph remains acyclic by construction.

Run the repeatable audit with:

```text
node docs/autonomous-development/tools/validate-recipes.mjs
```

## Corrections made

1. Corrected renamed/stale dependency filenames in 19 recipes. Numeric identities were preserved; no intended prerequisite was removed. This includes the semantic correction from the obsolete `0119-keep-domain-repositories-private.md` reference to the actual owning task `0120-keep-typeorm-repositories-private-to-owning-domains.md`.
2. Marked coordination/future-registration references as `Advisory` in `0011`, `0012`, `0018`, `0189` and `0202`. This removes apparent cycles without weakening their real hard prerequisites.
3. Closed the initial CI bootstrap gap outside the numbered workload: the permanent baseline creates the root workspace, canonical root `npm ci` plus `npm run ci:check` interface, and exact-SHA GitHub Actions workflow; task `0008` extends it with GraphQL/generated-artifact drift checks.
4. Made the green baseline a session invariant. No SYS-001 or later recipe starts until the separate baseline change proves the complete repository gate set green.
5. Resolved SYS-001 to a versioned framework-neutral shared package. Angular consumes portable wire contracts; necessary Nest `class-validator` DTOs remain non-breaking, parity-checked boundary adapters rather than being forced into Angular or duplicated as another canonical source.
6. Resolved blocked-task progression: preserve and freeze the divergent feature branch, restore and prove exact-SHA green `develop`, record `BLOCKED`, then continue only with a later task whose hard dependencies are all `DONE`.
7. Classified a revert that does not restore the pre-merge tree/green CI as a session-fatal baseline or upstream incident. A later task must never inherit or conceal that condition.
8. Split terminal outcomes into `BLOCKED` (attempted, stopped before merge), `REVERTED` (merged then rolled back), and `SKIPPED_DEPENDENCY` (never attempted because a hard prerequisite is terminal non-`DONE`) so the final report preserves materially different evidence.

## Intentional late-series lifecycle transition

Task `0218` intentionally changes integration from direct `develop` pushes to protected pull requests with an independent review. This is not normalized away: the task must update the repository-wide protocol/runner before protection becomes effective and must block if administration permission or an eligible independent reviewer is unavailable. Tasks `0219` and `0220` remain hard-dependent on that protected lifecycle; no autonomous bypass is allowed.

## Audit boundary

This audit proves recipe identity, linkage and workflow consistency. It does not claim that future implementation-specific product, security, legal, production-topology or credential decisions are already available. Each recipe's stop conditions remain authoritative and convert those missing authorities into an explicit `BLOCKED` result.
