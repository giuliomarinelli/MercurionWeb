# Preview infrastructure. Runtime bases and pgvector source are immutable.
FROM postgres@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139 AS pgvector-build
RUN apk add --no-cache build-base
COPY pgvector.tar.gz /tmp/pgvector.tar.gz
RUN echo '83d673c3b287cddbf3879f86215f043f2c2b56c69d37b2a77504910db1ed6e56  /tmp/pgvector.tar.gz' | sha256sum -c - \
    && mkdir /tmp/pgvector \
    && tar -xzf /tmp/pgvector.tar.gz -C /tmp/pgvector --strip-components=1 \
    && make -C /tmp/pgvector -j2 OPTFLAGS='' with_llvm=no \
    && make -C /tmp/pgvector DESTDIR=/out OPTFLAGS='' with_llvm=no install

FROM postgres@sha256:aa6cb33cf4c19c765cefcf48d96176258800870a9a1e930ad126200f9d825139 AS postgres
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="postgres"
RUN apk add --no-cache --upgrade zlib=1.4-r0 libxslt=1.1.43-r4 krb5-libs=1.22.3-r0 && rm /usr/local/bin/gosu
COPY --from=pgvector-build /out/usr/local/lib/postgresql/vector.so /usr/local/lib/postgresql/vector.so
COPY --from=pgvector-build /out/usr/local/share/postgresql/extension/ /usr/local/share/postgresql/extension/
LABEL org.mercurion.postgres.version="16.15" org.mercurion.pgvector.revision="f37c13f68b57d2c3472b2214fbcff699d6d34876"
USER 70:70

FROM redis@sha256:82403a0812a51faf6779f8d0dbe25ea85279ec7d49d24a3c78a65e9d8a87fa5f AS redis
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="redis"
RUN apk add --no-cache --upgrade zlib=1.4-r0 && chown 999:1000 /data
USER 999:1000

FROM getmeili/meilisearch@sha256:9600db22be3fcbf3d506176d3a73dd70a65c5719d9aa1d2837355b75afb8f4fb AS meilisearch
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="meilisearch"
RUN apk add --no-cache --upgrade zlib=1.4-r0 && chown 10001:10001 /meili_data
USER 10001:10001
ENTRYPOINT ["/bin/meilisearch"]

FROM nginx@sha256:583b7f2fce1cdb8da5ad5c39ebd3c33b98b87d493190e548bdee1fa8c619c311 AS edge
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="edge"
RUN apk add --no-cache --upgrade zlib=1.4-r0 libxslt=1.1.43-r4 \
    && addgroup -S -g 10101 mercurion \
    && adduser -S -D -H -u 10101 -G mercurion mercurion
USER 10101:10101
