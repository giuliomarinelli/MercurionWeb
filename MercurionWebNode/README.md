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
Aggiornare il progetto Nest 11 + Apollo GraphQL a Fastify 5
Questa guida descrive tutti i passi effettivamente necessari (e funzionanti) per clonare il repo, installare le dipendenze e far partire l’app con Fastify 5 nonostante l’integrazione ufficiale Apollo-Fastify sia ferma a Fastify 4.

1 – Prerequisiti
Strumento	Versione minima
Node.js	20 (consigliato 22 LTS)
npm	9

2 – Clona il progetto
bash
Copia
Modifica
git clone <repo-url> my-app
cd my-app
3 – Allinea le versioni Nest 11 e Fastify 5
bash
Copia
Modifica
# core Nest
npm install @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-fastify@^11 \
             @nestjs/config@^4 @nestjs/jwt@^11 @nestjs/mongoose@^11 \
             @nestjs/typeorm@^11 @nestjs/websockets@^11 \
             @nestjs/microservices@^11 @nestjs/testing@^11 \
             @nestjs/apollo@^13 @nestjs/graphql@^13 --save

# fastify 5 + plugin
npm install fastify@^5 @fastify/cookie@^11 @fastify/middie@^9 \
             @fastify/multipart@latest --save
4 – Aggiungi patch-package
bash
Copia
Modifica
npm install -D patch-package postinstall-postinstall
Nel package.json, dentro "scripts":

jsonc
Copia
Modifica
"postinstall": "patch-package"
5 – Patch di @as-integrations/fastify
bash
Copia
Modifica
npx patch-package @as-integrations/fastify
5.1 package.json del modulo
Modifica la peer-dependency:

diff
Copia
Modifica
- "fastify": "^4.4.0",
+ "fastify": "^5.0.0",
5.2 plugin.js (sostituisci TUTTO)
js
Copia
Modifica
'use strict';

const fp = require('fastify-plugin');
const { Readable } = require('node:stream');
const { HeaderMap } = require('@apollo/server');

/**
 * Fastify-5 adapter per Apollo Server 4.
 *
 * @param {import('@apollo/server').ApolloServer} apollo
 * @param {{ path?: string; context?: Function|object }} [opts]
 */
function fastifyApollo(apollo, opts = {}) {
  const routePath = opts.path ?? '/graphql';

  return fp(async function (fastify) {
    await apollo.start();

    fastify.route({
      method: ['GET', 'POST', 'OPTIONS'],
      url: routePath,
      async handler(req, reply) {
        const res = await apollo.executeHTTPGraphQLRequest({
          httpGraphQLRequest: {
            method : req.method,
            headers: new HeaderMap(Object.entries(req.headers)),
            body   : req.body,
            search : req.url.split('?')[1] ?? '',
          },
          context:
            typeof opts.context === 'function'
              ? () => opts.context(req, reply)
              : () => opts.context ?? {},
        });

        res.headers.forEach((v, k) => reply.header(k, v));
        reply.code(res.status ?? 200);

        return res.body.kind === 'complete'
          ? res.body.string
          : reply.send(Readable.from(res.body.asyncIterator));
      },
    });
  }, { name: '@as-integrations/fastify', fastify: '^5.x' });
}

module.exports = fastifyApollo;            // default export
module.exports.fastifyApollo = fastifyApollo; // named export
Salva → patch-package crea patches/@as-integrations-fastify+2.1.1.patch.

6 – Installazione finale
Il primo giro richiede di ignorare i peer-deps (la patch li corregge subito dopo):

bash
Copia
Modifica
npm install --legacy-peer-deps
7 – Bootstrap Fastify 5
Nel tuo main.ts assicurati che l’ascolto sia:

ts
Copia
Modifica
await app.listen({ port: 3000 });
Fastify 5 non accetta più la forma listen(3000).

8 – Avvia l’app
bash
Copia
Modifica
npm run start:dev
Output atteso:

csharp
Copia
Modifica
🚀  Application is running on: http://localhost:3000/graphql
GraphiQL/Apollo-Studio raggiungibile, nessun errore “package is missing”.

Note
patch-package applica automaticamente la patch dopo ogni npm install grazie allo script postinstall.

Quando Apollo rilascerà @as-integrations/fastify v3 con supporto Fastify 5:

bash
Copia
Modifica
rm -r patches
npm uninstall patch-package postinstall-postinstall
npm install @as-integrations/fastify@^3
e rimuovi la riga "postinstall": "patch-package".

Fine. Progetto operativo su Nest 11 + Fastify 5 + Apollo Server 4.