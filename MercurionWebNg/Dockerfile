# Dockerfile (prod)

# ====== STAGE 1: build Angular ======
FROM node:22.16.0-alpine AS build
WORKDIR /workspace

ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

RUN test "$(node --version)" = "v22.16.0" && test "$(npm --version)" = "10.9.2"

COPY package.json package-lock.json ./
COPY MercurionWebNg/package.json MercurionWebNg/package.json
COPY MercurionWebNode/package.json MercurionWebNode/package.json
COPY packages/rest-contracts/package.json packages/rest-contracts/package.json
COPY packages/socket-contracts/package.json packages/socket-contracts/package.json
COPY MercurionWebNg/patches ./MercurionWebNg/patches
RUN npm ci --ignore-scripts

COPY packages/rest-contracts packages/rest-contracts
COPY packages/socket-contracts packages/socket-contracts
COPY MercurionWebNg ./MercurionWebNg
RUN npm run postinstall

WORKDIR /workspace/MercurionWebNg
# build in configurazione "production"
RUN npm run build -- --configuration=production

# ====== STAGE 2: Nginx statico ======
FROM nginx:1.27-alpine

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

WORKDIR /usr/share/nginx/html
RUN addgroup -S -g 10101 mercurion && \
  adduser -S -D -H -u 10101 -G mercurion mercurion && \
  rm -rf ./* && \
  mkdir -p /tmp/nginx && \
  chown 10101:10101 /tmp/nginx

COPY --from=build --chown=10101:10101 /workspace/MercurionWebNg/dist/mercurion-web-ng/browser/ ./

COPY MercurionWebNg/nginx.mercurion_web_ng.prod.conf /etc/nginx/conf.d/default.conf
COPY MercurionWebNg/nginx.runtime.conf /etc/nginx/nginx.conf

EXPOSE 3497
USER 10101:10101
CMD ["nginx", "-g", "daemon off;"]
