# Minimal engine update within the existing 2.12 line, not a supported-line claim.
# Requires the exact upstream archive below; no application source or credentials.
FROM golang@sha256:0a5f7fe796599ff487605987432e7619ae45beeb2fba4c2ce0b907879932aebf AS build
WORKDIR /src
COPY nats-source.tar.gz /tmp/nats-source.tar.gz
RUN echo '0eb53a7b71a5a749224a42a117c4889982c9a015c648236d325d0b54c59f53eb  /tmp/nats-source.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/nats-source.tar.gz --strip-components=1 \
    && go mod edit -require=golang.org/x/crypto@v0.58.1-0.20261009181718-2f1f834330b2 \
    && GOTOOLCHAIN=local go mod tidy && go mod verify \
    && CGO_ENABLED=0 GOTOOLCHAIN=local go build -trimpath -ldflags='-s -w' -o /out/nats-server .
FROM scratch
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="nats" \
      org.mercurion.nats.revision="8460a428cf3b27c8627595d630f1ccad55786d13" \
      org.mercurion.server.version="2.12.15" org.mercurion.crypto.revision="2f1f834330b2d36ab3db8bfb33aaa1ac16794588"
COPY --from=build /out/nats-server /nats-server
USER 10021:10021
ENTRYPOINT ["/nats-server"]
