# Candidate recipes only. Adoption requires strict scan and isolated compatibility evidence.
# Keep the historical runtime/Dockerfile intact for existing release recovery.
FROM redis@sha256:5f2e6a105b2a8cc721911d5d29aadb032c25fe55b43e829e3d03413753ff47c2 AS redis
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="redis"
RUN apk add --no-cache --upgrade apk-tools=2.14.13-r0 musl=1.2.5-r13 musl-utils=1.2.5-r13 \
    libcrypto3=3.5.9-r0 libssl3=3.5.9-r0 alpine-release=3.22.8-r0 \
    ca-certificates-bundle=20261020-r0 zlib=1.4-r0 libapk2=2.14.13-r0 tzdata=2026f-r0 \
    && chown 999:1000 /data
USER 999:1000

FROM getmeili/meilisearch@sha256:8cd411ba5d9ec2dfce02e241305208eebacce0fd74a72bece21cadd03dc566ce AS meili-binary
FROM alpine@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS meilisearch
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="meilisearch" org.mercurion.server.version="1.14.0"
RUN apk add --no-cache --upgrade zlib=1.4-r0 libgcc=15.2.0-r5 ca-certificates=20261020-r0 \
    && mkdir /meili_data && chown 10001:10001 /meili_data
COPY --from=meili-binary /bin/meilisearch /bin/meilisearch
WORKDIR /meili_data
ENV MEILI_HTTP_ADDR=0.0.0.0:7700 MEILI_NO_ANALYTICS=true
EXPOSE 7700
USER 10001:10001
ENTRYPOINT ["/bin/meilisearch"]
