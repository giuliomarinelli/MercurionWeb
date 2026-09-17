# MercurionWebNode

MercurionWebNode is the NestJS 11 API on Fastify 5. It owns authentication and sessions,
REST controllers, the Mercurius GraphQL API, Socket.IO gateway, PostgreSQL persistence,
Redis capabilities, Meilisearch integration, mail/SMS/SSO adapters, and NATS clients for
Tox21/RDKit services.

The source entry point is `src/main.ts`; the development listener is `0.0.0.0:8099`.
The public edge is nginx at `http://localhost:8888`, where `/api/*`, `/api/graphql`,
`/socket.io/*` and `/health` are proxied to this service.

## Source naming convention

Nest source directories and files use lowercase kebab-case. Backend model trees
use `models/` and `models/dto/`, and the realtime module uses `socket-io/`.
TypeScript symbols retain conventional PascalCase names such as
`SecurityService` and `RecoverCredentialsDTO`; legacy misspellings are not
exported as aliases.

## Configuration and dependencies

Copy `env/.env.example` to `env/.env.development` and fill every placeholder with local
values. `src/config/config.schema.ts` validates the complete environment before bootstrap.
Do not commit that file, test-account credentials, tokens, private keys or production values.
See the repository [configuration reference](../docs/configuration.md).

The local stack supplies PostgreSQL/pgvector, Redis, NATS, Meilisearch and nginx through
`docker_sl/docker-compose.yml`. Tox21 is a read-only sibling repository and is reached via
NATS subjects; this project does not own or modify it.

## Commands

```bash
npm run start:dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run test:ci
npm run test:e2e:ci
npm run graphql:schema:check
npm run graphql:schema:update
npm run contracts:check
```

Root CI wrappers are `npm run ci:lint:nest`, `npm run ci:typecheck:nest`,
`npm run ci:test:nest`, `npm run ci:test:nest:e2e` and `npm run ci:build:nest`.
Unit/E2E diagnostics are written to `coverage` and `test-results` by the CI variants.

## Contracts

- REST controllers are under `src/app_modules` and `src/*.controller.ts`; route ownership,
  compatibility and error-envelope policies are checked by root static gates.
- Mercurius serves the GraphQL schema at `/api/graphql`. `graphql:schema:update` regenerates
  the committed SDL; `graphql:schema:check` fails on drift.
- Socket.IO is configured by `src/app_modules/socket-io` and shares event types with
  `packages/socket-contracts`.
- NATS is internal service transport. Tox21 inference and RDKit subjects require the local
  NATS service and the sibling Tox21 process.

## Runtime behavior

Use `APP_ENV=development LOCAL_DUMMY_AUTH=false` for the supported local browser stack.
The deprecated dummy-auth route is not a validation workflow. When protected browser state
is needed, use the ordinary login page and the local test account documented by the runtime
policy; never copy its values into this README or Git.
