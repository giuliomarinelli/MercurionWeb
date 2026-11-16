# Application/model contents retain the parent Tox21 revision. Only fixed OS
# packages change; export, runtime audit and strict scanning remain mandatory.
FROM mercurion-vm045-tox21-parent:e816fb97709f@sha256:e816fb97709fb05db82ecacaef69cb7c1e23389474d7cc7a7688d47d37a283d4
USER 0:0
RUN apk add --no-cache glibc-2.44=2.44-r16 glibc-2.44-locale-posix=2.44-r16 \
    ld-linux-2.44=2.44-r16 libcrypt1-2.44=2.44-r16
USER 10021:10021
