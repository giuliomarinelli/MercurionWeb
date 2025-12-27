# Dockerfile (prod)

FROM node:24-alpine AS deps
WORKDIR /usr/src/app

RUN apk add --no-cache \
  bash \
  openssl \
  libc6-compat \
  python3 \
  make \
  g++

RUN corepack enable

COPY package.json package-lock.json ./
RUN npm install

FROM node:24-alpine AS build
WORKDIR /usr/src/app

RUN corepack enable

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Sottrazione: elimina qualsiasi file sensibile
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

FROM node:24-alpine AS runtime
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV APP_ENV=production

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules

CMD ["node", "dist/main.js"]
