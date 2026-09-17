# Mercurion UI catalog

The catalog is a development/test-only Angular entry point. It imports the
canonical primitives directly, uses fixture data only, and is emitted to
`MercurionWebNg/dist/mercurion-ui-catalog`; it is not reachable from the
production application route.

## Commands

From the repository root:

```text
npm run storybook --workspace mercurion_web_ng
npm run build-storybook --workspace mercurion_web_ng
npm run ui:visual --workspace mercurion_web_ng
npm run ui:visual:update --workspace mercurion_web_ng
```

`ui:visual` builds the catalog, serves the static output locally and compares
the deterministic light/dark desktop/mobile screenshots committed under
`playwright/catalog/catalog.spec.ts-snapshots/`. Use
`ui:visual:update` only when a deliberate design change has been reviewed;
the command is the explicit baseline approval workflow.

The catalog freezes network/data variability by using local fixture values,
avoiding timers in the rendered state, and disabling motion in the visual
harness. Accessibility expectations are visible in each section and the
canonical Angular axe fixture remains the automated accessibility gate.
