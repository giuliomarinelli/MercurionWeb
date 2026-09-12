# Angular semantic design tokens

The Angular UI uses Tailwind as its compile-time styling engine. Semantic
roles are defined in `MercurionWebNg/tailwind.config.js` and mapped to CSS
variables in `MercurionWebNg/src/styles.css` only where the light/dark theme
must change at runtime.

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
