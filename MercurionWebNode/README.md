# MercurionWebNode

MercurionWebNode is the NestJS backend for the Mercurion platform. It exposes REST, GraphQL and WebSocket APIs using Fastify and integrates with NATS and Meilisearch.

## Features

- Authentication with JWT and multi-factor mechanisms
- User and session management
- Molecule search and synchronization via Meilisearch
- WebSocket gateway for real time updates

## Getting started

1. Copy one of the example files in `env/` to configure your environment variables.
2. Install dependencies with `npm install`.
3. Run the application in development mode:

```bash
npm run start:dev
```

## Testing

Execute the unit tests with:

```bash
npm test
```
