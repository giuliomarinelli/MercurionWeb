# Angular semantic design tokens

The Angular UI uses Tailwind 4 as its compile-time styling engine. Semantic
roles, breakpoints, typography, spacing, radii, shadows and static palette
values are defined in the `@theme inline` block of
`MercurionWebNg/src/styles.css`. Theme-dependent role values live in the
`:root` and `.dark` blocks of the same stylesheet. Runtime variables use the
`--m-` prefix so they do not collide with Tailwind's reserved `@theme`
namespaces such as `--color-*` and `--breakpoint-*`.

## Token taxonomy

- **Color**: `surface-*`, `on-surface-*`, `accent-*`, `control-*`,
  `status-*`, `token-border`, and `token-focus`.
- **Spacing**: `token-1`, `token-2`, `token-3`, `token-4`, and `token-6`.
- **Radius**: `token-control`, `token-surface`, and `token-pill`.
- **Shadow**: `token-control` and `token-surface`.
- **Typography**: `token-body`, `token-body-sm`, `token-heading`, and the
  `spacegrotesk` family.

Component contracts consume semantic roles. They do not select light or dark
values themselves. The token-usage check covers the canonical primitives and
is also usable against a temporary source root for deterministic negative
testing.

## Exceptions

The machine-readable exception file is
`docs/autonomous-development/angular-design-token-exceptions.json`. It is
intentionally empty for production UI code; assets and third-party styles are
outside the governed Angular source roots.
