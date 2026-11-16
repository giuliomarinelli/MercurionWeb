# Maintained-source duplication gate

`npm run ci:duplication` runs the repository-pinned `jscpd` 4.0.5 detector
through `scripts/check-code-duplication.mjs`. The detector compares the
maintained Angular and Nest source trees with a five-line/fifty-token minimum
and emits the HTML report at `reports/duplication/html/`. CI uploads that
directory from each quality runner.

The scan includes:

- TypeScript in `MercurionWebNg/src` and `MercurionWebNode/src`
- Angular HTML templates in those trees
- Angular CSS in those trees

The paths are deliberately limited to the two production source roots, so
workspace `node_modules`, build `dist`, and coverage output cannot enter the
measurement. The configuration also explicitly excludes test files, generated
source, GraphQL document/schema files, and generated/static assets. These are
named exclusions rather than a broad source-directory suppression.

The initial post-Series-refactor measurement was 92 clones, 1,019 duplicated
TypeScript lines, and 11,546 duplicated TypeScript tokens (1.84% of the
TypeScript group). The remediation centralizes the Help resolver's pagination
flattening and the authentication controller's session/login-cookie policy.
The current measurement is 91 clones, 1,001 duplicated TypeScript lines, and
11,422 duplicated TypeScript tokens (1.81% of the TypeScript group; 1.79% when
the three scanned language groups are combined). CI fails at `1.82%`, leaving a small
conservative rounding margin while preventing regression. Future improvements
should lower `threshold` in `.jscpd.json` and update this record after a
verified measurement; they must not widen the exclusions to make the metric
pass.
