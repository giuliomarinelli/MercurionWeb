# Reusable Nest image targets: production, staging and test.

FROM node:22.16.0-alpine AS dependencies
WORKDIR /workspace

RUN apk add --no-cache \
  bash \
  openssl \
  libc6-compat \
  python3 \
  make \
  g++
RUN test "$(node --version)" = "v22.16.0" && test "$(npm --version)" = "10.9.2"

COPY package.json package-lock.json ./
COPY MercurionWebNg/package.json MercurionWebNg/package.json
COPY MercurionWebNode/package.json MercurionWebNode/package.json
COPY packages/rest-contracts/package.json packages/rest-contracts/package.json
COPY packages/socket-contracts/package.json packages/socket-contracts/package.json
RUN npm ci --ignore-scripts

FROM dependencies AS source
COPY packages/rest-contracts packages/rest-contracts
COPY packages/socket-contracts packages/socket-contracts
COPY MercurionWebNg/patches MercurionWebNg/patches
COPY MercurionWebNode ./MercurionWebNode
RUN npm run postinstall
WORKDIR /workspace/MercurionWebNode

FROM source AS build-staging
ENV NODE_ENV=production
ENV APP_ENV=staging
RUN find . -type f \( \
  -name "*.env" -o -name "*.env.*" -o \
  -name "*.pem" -o -name "*.key" -o \
  -name "*.p12" -o -name "*.pfx" \
\) -print -delete
RUN npm run build

FROM source AS build-test
ENV NODE_ENV=production
ENV APP_ENV=test
COPY docker_sl/docker-compose.yml /workspace/docker_sl/docker-compose.yml
COPY k8s/beta/mercurion-web-ng-deploy.yaml /workspace/k8s/beta/mercurion-web-ng-deploy.yaml
COPY k8s/beta/mercurion-web-node-deploy.yaml /workspace/k8s/beta/mercurion-web-node-deploy.yaml
COPY k8s/beta/redis-deploy.yaml /workspace/k8s/beta/redis-deploy.yaml
RUN npm run build && \
  mkdir -p dist/config && \
  cp -R src/config/keys dist/config/keys && \
  npm run test

FROM source AS build-production
ENV NODE_ENV=production
ENV APP_ENV=production
RUN find . -type f \( \
  -name "*.env" -o -name "*.env.*" -o \
  -name "*.pem" -o -name "*.key" -o \
  -name "*.p12" -o -name "*.pfx" \
\) -print -delete
RUN npm run build && \
  find dist -type f \( \
    -name "*.map" -o \
    -name "*.d.ts" -o \
    -name "*.ts" -o \
    -name "*.tsbuildinfo" \
  \) -print -delete && \
  find ../packages/rest-contracts/dist ../packages/socket-contracts/cjs ../packages/socket-contracts/esm \
    -type f \( -name "*.map" -o -name "*.d.ts" \) -print -delete

FROM dependencies AS production-dependencies
ENV NODE_ENV=production
RUN rm -rf node_modules && \
  npm ci --workspace mercurion_web_node --include-workspace-root=false --omit=dev --ignore-scripts && \
  npm rebuild argon2 --omit=dev

FROM node:22.16.0-alpine AS runtime
WORKDIR /usr/src/app
RUN addgroup -S -g 10001 mercurion && \
  adduser -S -D -H -u 10001 -G mercurion mercurion && \
  mkdir -p /tmp/mercurion && \
  chown 10001:10001 /tmp/mercurion
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
ENV NODE_ENV=production
ENV TMPDIR=/tmp
EXPOSE 8098
USER 10001:10001
CMD ["node", "dist/src/main.js"]

FROM runtime AS staging
ENV APP_ENV=staging
COPY --from=build-staging --chown=10001:10001 /workspace/MercurionWebNode/dist ./dist
COPY --from=build-staging --chown=10001:10001 /workspace/MercurionWebNode/package.json ./package.json
COPY --from=build-staging --chown=10001:10001 /workspace/node_modules ./node_modules
COPY --from=build-staging --chown=10001:10001 /workspace/packages/rest-contracts ./packages/rest-contracts
COPY --from=build-staging --chown=10001:10001 /workspace/packages/socket-contracts ./packages/socket-contracts
COPY --from=build-staging --chown=10001:10001 /workspace/MercurionWebNode/assets-root ./assets-root

FROM runtime AS test
ENV APP_ENV=test
COPY --from=build-test --chown=10001:10001 /workspace/MercurionWebNode/dist ./dist
COPY --from=build-test --chown=10001:10001 /workspace/MercurionWebNode/package.json ./package.json
COPY --from=build-test --chown=10001:10001 /workspace/node_modules ./node_modules
COPY --from=build-test --chown=10001:10001 /workspace/packages/rest-contracts ./packages/rest-contracts
COPY --from=build-test --chown=10001:10001 /workspace/packages/socket-contracts ./packages/socket-contracts

FROM runtime AS production
ENV APP_ENV=production
COPY --from=build-production --chown=10001:10001 /workspace/MercurionWebNode/dist ./dist
COPY --from=build-production --chown=10001:10001 /workspace/MercurionWebNode/package.json ./package.json
COPY --from=production-dependencies --chown=10001:10001 /workspace/node_modules ./node_modules
COPY --from=build-production --chown=10001:10001 /workspace/packages/rest-contracts/dist ./packages/rest-contracts/dist
COPY --from=build-production --chown=10001:10001 /workspace/packages/rest-contracts/package.json ./packages/rest-contracts/package.json
COPY --from=build-production --chown=10001:10001 /workspace/packages/socket-contracts/cjs ./packages/socket-contracts/cjs
COPY --from=build-production --chown=10001:10001 /workspace/packages/socket-contracts/esm ./packages/socket-contracts/esm
COPY --from=build-production --chown=10001:10001 /workspace/packages/socket-contracts/package.json ./packages/socket-contracts/package.json
COPY --from=build-production --chown=10001:10001 /workspace/MercurionWebNode/assets-root ./assets-root
