# Mercurion architecture policy

This document is the human-readable contract for the canonical
`npm run ci:architecture` gate. The executable policy is versioned in
`scripts/architecture-policy.json`; the gate reuses the existing graph,
environment, persistence, GraphQL and Nest ownership scanners rather than
maintaining competing analyzers.

## Dependency directions

Angular production code is organized as reusable lower-level utilities and
configuration, shared components/services, and feature pages. Static imports
must not point from `utils` to application layers, from `config` to pages,
components or services, from reusable `components` to pages, or from services
to page implementation details. Type-only imports are still reviewed by the
normal ownership rules, but the existing auth model types remain outside this
structural check because they are not runtime dependencies.

Nest utilities, configuration, transport contracts and metadata are lower-level
boundaries and must not import domain modules under `app_modules`.

Dynamic imports are lazy entrypoints, not eager ownership edges. They remain in
the Angular and Nest graph scanners for cycle detection, while the layer
policy intentionally does not report a valid lazy boundary as a forbidden
static import or orphan.

## Canonical checks and exceptions

The gate runs the established scanners and their representative negative
fixtures for:

- Angular environment variants, browser persistence and production cycles;
- Nest module/configuration cycles, duplicate imports and provider ownership;
- private GraphQL imports and test-route policy;
- the explicit static layer rules above.

The policy has one narrow, named exception for the notification template
adapter edge in `config.model.ts`; it is recorded in
`scripts/architecture-policy.json` with the exact edge, reason and owner.
Future exceptions must use the same format; wildcard or directory-wide
exceptions are forbidden.
Diagnostics include the rule and violating path/edge so a maintainer can fix
the owning boundary.
