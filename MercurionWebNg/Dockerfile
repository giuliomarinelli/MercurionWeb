# Dockerfile (prod)

# ====== STAGE 1: build Angular ======
FROM node:22-alpine AS build
WORKDIR /app

ARG APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

COPY package*.json ./
COPY ./patches ./patches

RUN npm config set legacy-peer-deps=true
RUN npm ci

COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY tailwind.config.js ./

# build in configurazione "production"
RUN npm run build -- --configuration production

# ====== STAGE 2: Nginx statico ======
FROM nginx:1.27-alpine

ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
LABEL org.opencontainers.image.version=$APP_VERSION

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

RUN mkdir -p m
COPY --from=build /app/dist/mercurion-web-ng/browser/ ./m/

COPY nginx.mercurion_web_ng.production.conf /etc/nginx/conf.d/default.conf

EXPOSE 3497
CMD ["nginx", "-g", "daemon off;"]
