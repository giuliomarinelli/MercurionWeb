# Dockerfile (prod)

FROM node:22.16.0-alpine AS deps
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

FROM node:22.16.0-alpine AS build
WORKDIR /workspace

RUN test "$(node --version)" = "v22.16.0" && test "$(npm --version)" = "10.9.2"

ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

COPY --from=deps /workspace/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY MercurionWebNode/package.json MercurionWebNode/package.json
COPY packages/rest-contracts packages/rest-contracts
COPY packages/socket-contracts packages/socket-contracts
COPY MercurionWebNg/patches MercurionWebNg/patches
COPY MercurionWebNode ./MercurionWebNode
RUN npm run postinstall
WORKDIR /workspace/MercurionWebNode

RUN find . -type f \( \
  -name "*.env" -o -name "*.env.*" -o \
  -name "*.pem" -o -name "*.key" -o \
  -name "*.p12" -o -name "*.pfx" \
\) -print -delete

ENV NODE_ENV=production
ENV APP_ENV=production

RUN npm run build && \
  mkdir -p dist/app_modules/notification && \
  cp -R src/app_modules/notification/email-templates dist/app_modules/notification/email-templates

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
ENV APP_ENV=production

COPY --from=build --chown=10001:10001 /workspace/MercurionWebNode/dist ./dist
COPY --from=build --chown=10001:10001 /workspace/MercurionWebNode/package.json ./package.json
COPY --from=build --chown=10001:10001 /workspace/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /workspace/packages/rest-contracts ./packages/rest-contracts
COPY --from=build --chown=10001:10001 /workspace/packages/socket-contracts ./packages/socket-contracts

ENV TMPDIR=/tmp
EXPOSE 8098
USER 10001:10001
CMD ["node", "dist/src/main.js"]
