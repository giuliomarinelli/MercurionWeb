# NATS v2.15.2 + upstream crypto module split fixing GO-2026-5932.
# Context contains only this recipe and the verified upstream source archive.
FROM golang@sha256:fa3d596898d9f126af7c01d14ee7597bab3f39cccf392ef36b69fe77cd681f18 AS build
WORKDIR /src
COPY nats-source.tar.gz /tmp/nats-source.tar.gz
RUN echo 'd67ddd88f4a0ba9482bd17cb1e5f4764e77cac365d13369d0e43ebe8bbadf8ed  /tmp/nats-source.tar.gz' | sha256sum -c - \
    && tar -xzf /tmp/nats-source.tar.gz --strip-components=1 \
    && go mod edit -require=golang.org/x/crypto@v0.58.1-0.20261009181718-2f1f834330b2 \
    && GOTOOLCHAIN=local go mod tidy \
    && go mod verify \
    && CGO_ENABLED=0 GOTOOLCHAIN=local go build -trimpath -ldflags='-s -w' -o /out/nats-server .

FROM scratch
LABEL org.opencontainers.image.source="https://github.com/nats-io/nats-server" \
      org.opencontainers.image.revision="5a815f11a911efa2c88fd1dbfb18ed89a449bfc1" \
      org.opencontainers.image.version="2.15.2-mercurion-crypto.1" \
      org.mercurion.crypto.revision="2f1f834330b2d36ab3db8bfb33aaa1ac16794588"
COPY --from=build /out/nats-server /nats-server
USER 10021:10021
ENTRYPOINT ["/nats-server"]
