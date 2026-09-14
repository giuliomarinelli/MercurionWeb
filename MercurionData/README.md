# MercurionData

MercurionData is a standalone NestJS 11 data service with its own package manifest,
lockfile and `src`/`test` trees. It is not a member of the root npm workspace and is not
started by the canonical MercurionWeb browser runtime. Its PostgreSQL/Meilisearch/NATS
integration and configuration are owned by this project.

## Commands

Run from `MercurionData`:

```bash
npm install
npm run start:dev
npm run build
npm run lint
npm run test
npm run test:e2e
npm run test:cov
```

`npm install` and all configuration values are local to this standalone project. Check its
own manifest and source configuration before adding it to a deployment or the root CI
aggregate; this README does not claim a supported root-workspace integration.
