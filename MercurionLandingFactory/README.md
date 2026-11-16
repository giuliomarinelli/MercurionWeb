# MercurionLandingFactory

MercurionLandingFactory is a standalone Angular 21 SSR/static project. It produces the
landing and error-page assets consumed by the nginx container; it is not the Angular SPA in
`MercurionWebNg` and is not a root workspace member.

## Commands

Run from this directory:

```bash
npm install
npm run start
npm run build
npm run watch
npm run test
npm run serve:ssr:MercurionLandingFactory
```

The build writes browser/server output below `dist/MercurionLandingFactory`. The local
development nginx compose configuration mounts the browser output for edge error pages.
This project has no API credentials; server configuration for MercurionWeb remains owned by
`MercurionWebNode`.
