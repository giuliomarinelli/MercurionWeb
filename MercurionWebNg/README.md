# MercurionWebNg

The supported browser client is an Angular 20.3 application. It renders the Mercurion SPA,
uses Apollo Angular for GraphQL, Socket.IO for realtime events, and the shared REST/Socket
contract packages. Its development server listens on `3498`; browser validation goes through
the repository nginx edge at `http://localhost:8888`.

## Commands

Run from this directory unless a root command is shown:

```bash
npm run start:dev
npm run build
npm run test:ci
npm run lint
npm run typecheck
npm run graphql:generate
npm run graphql:check
npm run chemistry:check-lazy
npm run bundle:check
```

The root equivalents are `npm run ci:lint:angular`, `npm run ci:typecheck:angular`,
`npm run ci:test:angular` and `npm run ci:build:angular`. `test:ci` runs Karma without a
watcher. Build output is under `dist`; generated GraphQL artifacts are under `src/generated`
and must be refreshed through the generator rather than edited by hand.

## Runtime and transport

`src/app/app.config.ts` configures Apollo to call `/api/graphql` and adds the current REST
contract-major header. nginx sends `/api/*` and `/socket.io/*` to Nest, so direct access to
`http://localhost:3498` is not equivalent to the supported runtime. The UI also consumes
assets and lazy chunks from the Angular dev server through nginx.

The client has no independent secret configuration file. API URLs are same-origin by design;
credentials and server configuration belong to `MercurionWebNode/env/.env.development`.

## Generated and checked artifacts

Use `graphql:generate` when GraphQL documents or the server schema changes. Use `graphql:check`
to validate the catalog, documents and code generation without changing tracked artifacts.
`bundle:check` and `chemistry:check-lazy` protect the production bundle and RDKit lazy loading.
The complete client checks are registered in the root `ci:check`.
