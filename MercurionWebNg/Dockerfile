# Reusable Angular image targets: production, staging and test.

FROM node:22.16.0-alpine AS dependencies
WORKDIR /workspace

RUN test "$(node --version)" = "v22.16.0" && test "$(npm --version)" = "10.9.2"

COPY package.json package-lock.json ./
COPY MercurionWebNg/package.json MercurionWebNg/package.json
COPY MercurionWebNode/package.json MercurionWebNode/package.json
COPY packages/rest-contracts/package.json packages/rest-contracts/package.json
COPY packages/socket-contracts/package.json packages/socket-contracts/package.json
COPY MercurionWebNg/patches ./MercurionWebNg/patches
RUN npm ci --ignore-scripts

FROM dependencies AS source
COPY packages/rest-contracts packages/rest-contracts
COPY packages/socket-contracts packages/socket-contracts
COPY MercurionWebNg ./MercurionWebNg
RUN npm run postinstall

FROM source AS build-production
WORKDIR /workspace/MercurionWebNg
ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
RUN npm run build -- --configuration=production

FROM source AS build-staging
WORKDIR /workspace/MercurionWebNg
ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
RUN npm run build -- --configuration=staging

FROM source AS build-test
WORKDIR /workspace/MercurionWebNg
ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
RUN npm run build -- --configuration=testing

FROM nginx:1.27-alpine AS runtime
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION
WORKDIR /usr/share/nginx/html
RUN addgroup -S -g 10101 mercurion && \
  adduser -S -D -H -u 10101 -G mercurion mercurion && \
  rm -rf ./* && \
  mkdir -p /tmp/nginx && \
  chown 10101:10101 /tmp/nginx
COPY MercurionWebNg/nginx.runtime.conf /etc/nginx/nginx.conf
EXPOSE 3497
USER 10101:10101
CMD ["nginx", "-g", "daemon off;"]

FROM runtime AS staging
COPY --from=build-staging --chown=10101:10101 /workspace/MercurionWebNg/dist/mercurion-web-ng/browser/ ./
COPY MercurionWebNg/nginx.mercurion_web_ng.staging.conf /etc/nginx/conf.d/default.conf

FROM runtime AS test
COPY --from=build-test --chown=10101:10101 /workspace/MercurionWebNg/dist/mercurion-web-ng/browser/ ./
COPY MercurionWebNg/nginx.mercurion_web_ng.testing.conf /etc/nginx/conf.d/default.conf

FROM runtime AS production
COPY --from=build-production --chown=10101:10101 /workspace/MercurionWebNg/dist/mercurion-web-ng/browser/ ./
COPY MercurionWebNg/nginx.mercurion_web_ng.prod.conf /etc/nginx/conf.d/default.conf
