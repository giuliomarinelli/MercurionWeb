# Coverage policy

Coverage is a deterministic regression floor, not a substitute for behavioral,
integration, or browser assertions. The canonical policy is
`config/coverage-policy.json`; `scripts/check-coverage-gates.mjs` produces a
machine-readable gate report under `reports/coverage/`.

## Local commands

The project commands collect maintained Angular and Nest source coverage and
fail when the configured global or high-risk thresholds regress:

```text
npm run test:coverage --workspace mercurion_web_ng
npm run test:coverage --workspace mercurion_web_node
```

Each project publishes HTML, LCOV, Cobertura, JSON, and text-summary output.
The canonical CI workflow uploads those directories and the gate report as
artifacts. The root `ci:test:angular` and `ci:test:nest` commands invoke the
same coverage commands, so the required CI gate cannot silently omit them.

## Risk rules and exclusions

Auth/session/MFA policy, transaction context, session codecs, and maintained
mapping paths use an 80% branch/function floor unless the policy records a
named exception. Every exception has an owner, a measurable baseline, a
reason, and a review action. Generated artifacts, migration entrypoints,
framework bootstrap glue, and environment constants are excluded only when
their rationale is listed in the policy; broad production-code globs are not
permitted.

## Ratcheting

1. Run both coverage commands and record the report metrics for the exact
   branch under review.
2. Increase the relevant `global` or high-risk rule threshold to the next
   honest whole percentage at or below the measured baseline, or higher when
   the tests justify it.
3. Never lower a configured threshold to make a failing build green. The
   gate rejects global thresholds below the immutable `minimums` in the
   policy and rejects high-risk branch/function rules below 80% without an
   exception.
4. Replace an exception with an 80% rule when the missing behavioral,
   integration, or contract fixture is added. New exclusions require a
   narrow file pattern, rationale, and review owner in the same change.
5. Review threshold and exclusion changes as CI-control-plane changes; the
   exact feature-SHA and merge-SHA required gates remain authoritative.
