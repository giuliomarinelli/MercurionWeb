# MercurionWeb

MercurionWeb is the source repository for the Mercurion web application: an Angular SPA, a
NestJS/Fastify API, shared REST and Socket.IO contracts, and two standalone supporting
projects. The browser-facing local stack is intentionally exposed through the nginx edge at
`http://localhost:8888`; do not use the Angular upstream port as the application origin.

## Repository map

| Project | Ownership | Entry point and output |
| --- | --- | --- |
| `MercurionWebNg` | Angular 20 SPA; GraphQL client, browser UI and Socket.IO client | `src/main.ts`; `dist/mercurion_web_ng` |
| `MercurionWebNode` | NestJS 11/Fastify 5 API, GraphQL, REST, WebSocket gateway and NATS clients | `src/main.ts`; `dist` |
| `packages/rest-contracts` | Versioned REST error/contract types shared by API and SPA | TypeScript package; `dist` |
| `packages/socket-contracts` | Versioned Socket.IO event types and policy | TypeScript package; `dist` |
| `MercurionData` | Standalone NestJS data service; not a root workspace member | Its own `src`, `dist`, lockfile and package scripts |
| `MercurionLandingFactory` | Standalone Angular 21 SSR/static landing and error-page build | `src`, `dist/MercurionLandingFactory/browser` |
| `../MercurionTox21` | Read-only sibling runtime used by the local inference/RDKit NATS subjects | `.venv/Scripts/python.exe -m main` |

`MercurionData` and `MercurionLandingFactory` are maintained projects but are not included in
the root workspace or the canonical root CI aggregate. Their own manifests are authoritative
for their commands. Autonomous MercurionWeb work must not modify `../MercurionTox21`.

## Prerequisites

- Node.js `22.16.0` and npm `10.9.2` for the root workspace.
- Docker Desktop for PostgreSQL/pgvector, Redis, NATS, Meilisearch and nginx.
- Python with the sibling Tox21 repository's checked-in `.venv` when exercising inference.
- A local configuration file at `MercurionWebNode/env/.env.development`, created from
  `MercurionWebNode/env/.env.example`. Replace every placeholder with a local value; never
  commit the file or real credentials. The schema in
  [`MercurionWebNode/src/config/config.schema.ts`](MercurionWebNode/src/config/config.schema.ts)
  is authoritative.

## Install and configure

```bash
npm install
copy MercurionWebNode\env\.env.example MercurionWebNode\env\.env.development
```

The root `postinstall` builds both shared contract packages and applies the Angular patch
directory. A clean install is performed by GitHub Actions with `npm ci`; autonomous local
sessions must reuse the existing dependency tree and must not run `npm ci`.

Configuration groups, required environments and secret classifications are listed in
[`docs/configuration.md`](docs/configuration.md). The example contains placeholders only.
Development uses PostgreSQL on `5431`, Redis on `6378`, NATS on `4223`, Meilisearch on `7700`,
Nest on `8099`, Angular on `3498`, and nginx on `8888`. The ports are upstream/runtime
configuration, not alternate browser origins.

## Canonical commands

From the repository root:

```bash
npm run ci:check
npm run ci:lint
npm run ci:typecheck
npm run ci:test
npm run ci:build
npm run ci:graphql
npm run ci:static
npm run ci:containers
npm run autonomous:plan
npm run ci:docs
```

`npm run ci:check` is the aggregate used by CI. GitHub Actions owns clean-install and
aggregate validation; local focused checks should use the existing installation.

For development, start the services in this order when browser evidence is required:

```text
../MercurionTox21 (cwd): .venv/Scripts/python.exe -m main
MercurionWebNode:      APP_ENV=development LOCAL_DUMMY_AUTH=false npm run start:dev --workspace mercurion_web_node
MercurionWebNg:         npm run start:dev --workspace mercurion_web_ng
```

Then open only `http://localhost:8888`. nginx routes `/api/*`, `/api/graphql` and
`/socket.io/*` to Nest and all other SPA routes/assets to Angular. `/health` is the public
readiness endpoint. The Angular Apollo client uses `/api/graphql`; contract versioning is
provided by `@mercurion/rest-contracts`.

## Tests, builds and diagnostics

| Layer | Command | Result/diagnostics |
| --- | --- | --- |
| Angular lint/typecheck/unit | `npm run ci:lint:angular`, `npm run ci:typecheck:angular`, `npm run ci:test:angular` | `MercurionWebNg/coverage` and test output |
| Nest lint/typecheck/unit | `npm run ci:lint:nest`, `npm run ci:typecheck:nest`, `npm run ci:test:nest` | `MercurionWebNode/coverage`, `test-results` |
| Nest E2E | `npm run ci:test:nest:e2e` | `MercurionWebNode/test-results` |
| GraphQL/generated artifacts | `npm run ci:graphql` | schema/codegen drift diagnostics |
| Static/architecture/contracts | `npm run ci:static` | policy-specific diagnostics |
| Builds | `npm run ci:build` | `MercurionWebNg/dist`, `MercurionWebNode/dist` |
| Containers | `npm run ci:containers`, `npm run ci:container-runtime`, `npm run smoke:container-runtime` | container contract/runtime smoke checks |
| Documentation | `npm run ci:docs` | broken links, missing paths/scripts and scaffold markers |

The `.github/workflows/ci.yml` maps these checks to the two-platform prerequisites, Angular
unit, Nest unit, Nest E2E, build and container jobs, with one `Required gate`.

## Contracts and generated artifacts

- REST routes and error envelopes are owned by `MercurionWebNode` and shared types in
  `packages/rest-contracts`; route compatibility and ownership checks are part of `ci:static`.
- GraphQL is served at `/api/graphql` by Mercurius. The committed schema is generated with
  `npm run graphql:schema:update --workspace mercurion_web_node`; drift is checked with
  `npm run graphql:schema:check --workspace mercurion_web_node`.
- Angular GraphQL documents and typed artifacts are generated/validated by
  `npm run graphql:generate --workspace mercurion_web_ng` and
  `npm run graphql:check --workspace mercurion_web_ng`.
- Socket.IO event names and payloads are owned by `packages/socket-contracts`; its policy and
  negative checks run through `npm run ci:socket-contracts`.
- NATS is an internal transport for Tox21 inference/RDKit and other service integrations.
  It is not a browser-facing contract.

## Deployment and containers

`docker_sl/docker-compose.yml` is the local development/test dependency stack. The Angular
and Nest Dockerfiles define `production`, `staging` and `test` targets. Kubernetes manifests
under `k8s/` are deployment configuration, not a substitute for the local nginx edge.
Container builds and standalone runtime smoke tests are authoritative for container support.

## Further reading

- [Angular project](MercurionWebNg/README.md)
- [Nest/API project](MercurionWebNode/README.md)
- [Data project](MercurionData/README.md)
- [Landing factory](MercurionLandingFactory/README.md)
- [Configuration reference](docs/configuration.md)
- [Autonomous-development protocol](docs/autonomous-development/README.md)
- [Runtime topology](docs/autonomous-development/RUNTIME.md)
