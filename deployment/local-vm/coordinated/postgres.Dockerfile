#
# NOTE: THIS DOCKERFILE IS GENERATED VIA "apply-templates.sh"
#
# Mercurion derived recipe; upstream attribution in postgres-upstream.LICENSE.
# Upstream revision: 9d15534160ade17f2b6c455a39ee967c49b1937d
# Changes: pinned base/source; 16.16; no gosu; bounded compilation; pgvector.
#

FROM alpine@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS postgres-build

# 70 is the standard uid/gid for "postgres" in Alpine
# https://git.alpinelinux.org/aports/tree/main/postgresql-common/postgresql-common.pre-install?h=3.22-stable
RUN set -eux; \
	addgroup -g 70 -S postgres; \
	adduser -u 70 -S -D -G postgres -H -h /var/lib/postgresql -s /bin/sh postgres; \
# also create the postgres user's home directory with appropriate permissions
# see https://github.com/docker-library/postgres/issues/274
	install --verbose --directory --owner postgres --group postgres --mode 1777 /var/lib/postgresql

# Runtime starts as UID 70, so root-to-user gosu is not shipped.

# make the "en_US.UTF-8" locale so postgres will be utf-8 enabled by default
# alpine doesn't require explicit locale-file generation
ENV LANG en_US.utf8

RUN mkdir /docker-entrypoint-initdb.d

ENV PG_MAJOR 16
ENV PG_VERSION 16.16
ENV PG_SHA256 9d5cd8633043b75740d5d59749c6b7365e6aeb53c47098b1a5e80bb18f87881a

ENV DOCKER_PG_LLVM_DEPS \
		llvm21-dev \
		clang21

COPY postgresql-16.16.tar.bz2 /tmp/postgresql-16.16.tar.bz2
RUN set -eux; \
	\
	cp /tmp/postgresql-16.16.tar.bz2 postgresql.tar.bz2; \
	echo "$PG_SHA256 *postgresql.tar.bz2" | sha256sum -c -; \
	mkdir -p /usr/src/postgresql; \
	tar \
		--extract \
		--file postgresql.tar.bz2 \
		--directory /usr/src/postgresql \
		--strip-components 1 \
	; \
	rm postgresql.tar.bz2 /tmp/postgresql-16.16.tar.bz2; \
	\
	apk add --no-cache --virtual .build-deps \
		$DOCKER_PG_LLVM_DEPS \
		bison \
		coreutils \
		dpkg-dev dpkg \
		flex \
		g++ \
		gcc \
		krb5-dev \
		libc-dev \
		libedit-dev \
		libxml2-dev \
		libxslt-dev \
		linux-headers \
		make \
		openldap-dev \
		openssl-dev \
		perl-dev \
		perl-ipc-run \
		perl-utils \
		python3-dev \
		tcl-dev \
		util-linux-dev \
		zlib-dev \
# https://www.postgresql.org/docs/10/static/release-10.html#id-1.11.6.9.5.13
		icu-dev \
# https://www.postgresql.org/docs/14/release-14.html#id-1.11.6.5.5.3.7
		lz4-dev \
# https://www.postgresql.org/docs/15/release-15.html "--with-zstd to enable Zstandard builds"
		zstd-dev \
	; \
	\
	cd /usr/src/postgresql; \
# update "DEFAULT_PGSOCKET_DIR" to "/var/run/postgresql" (matching Debian)
# see https://anonscm.debian.org/git/pkg-postgresql/postgresql.git/tree/debian/patches/51-default-sockets-in-var.patch?id=8b539fcb3e093a521c095e70bdfa76887217b89f
	awk '$1 == "#define" && $2 == "DEFAULT_PGSOCKET_DIR" && $3 == "\"/tmp\"" { $3 = "\"/var/run/postgresql\""; print; next } { print }' src/include/pg_config_manual.h > src/include/pg_config_manual.h.new; \
	grep '/var/run/postgresql' src/include/pg_config_manual.h.new; \
	mv src/include/pg_config_manual.h.new src/include/pg_config_manual.h; \
	gnuArch="$(dpkg-architecture --query DEB_BUILD_GNU_TYPE)"; \
	\
# https://git.alpinelinux.org/aports/tree/community/postgresql15/APKBUILD?h=3.22-stable#n176 ("export LLVM_CONFIG")
	export LLVM_CONFIG="/usr/lib/llvm21/bin/llvm-config"; \
# https://git.alpinelinux.org/aports/tree/community/postgresql15/APKBUILD?h=3.22-stable#n180 ("older clang versions don't have a 'clang' exe anymore.")
	export CLANG=clang-21; \
	\
# configure options mostly copying Debian:
# https://salsa.debian.org/postgresql/postgresql-common/-/blob/6e26b5107295170cc8731a3acbf13228ea15941e/server/postgresql.mk#L32
	./configure \
		--enable-option-checking=fatal \
		--build="$gnuArch" \
# "/usr/src/postgresql/src/backend/access/common/tupconvert.c:105: undefined reference to `libintl_gettext'"
#		--enable-nls \
		--enable-integer-datetimes \
		--enable-thread-safety \
		--enable-tap-tests \
# skip debugging info -- we want tiny size instead
#		--enable-debug \
		--disable-rpath \
		--with-uuid=e2fs \
		--with-pgport=5432 \
		--with-system-tzdata=/usr/share/zoneinfo \
		--prefix=/usr/local \
		--with-includes=/usr/local/include \
		--with-libraries=/usr/local/lib \
		--with-gssapi \
		--with-icu \
		--with-ldap \
		--with-libxml \
		--with-libxslt \
		--with-llvm \
		--with-lz4 \
		--with-openssl \
#		--with-pam \
		--with-perl \
		--with-python \
		--with-tcl \
		--with-zstd \
	; \
	make -j2 world-bin; \
	make install-world-bin; \
	make -C contrib install; \
	\
	runDeps="$( \
		scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \
			| tr ',' '\n' \
			| sort -u \
			| awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }' \
# Remove plperl, plpython and pltcl dependencies by default to save image size
# To use the pl extensions, those have to be installed in a derived image
			| grep -v -e perl -e python -e tcl \
	)"; \
	apk add --no-cache --virtual .postgresql-rundeps \
		$runDeps \
		bash \
		tzdata \
		zstd \
# https://wiki.alpinelinux.org/wiki/Release_Notes_for_Alpine_3.16.0#ICU_data_split
		icu-data-full \
# https://git.alpinelinux.org/aports/tree/community/nss_wrapper/APKBUILD?h=3.22-stable#n7 ("ppc64le: test case segfaults")
		$([ "$(apk --print-arch)" != 'ppc64le' ] && echo 'nss_wrapper') \
	; \
	apk del --no-network .build-deps; \
	cd /; \
	rm -rf \
		/usr/src/postgresql \
		/usr/local/share/doc \
		/usr/local/share/man \
	; \
	\
	postgres --version

# make the sample config easier to munge (and "correct by default")
RUN set -eux; \
	cp -v /usr/local/share/postgresql/postgresql.conf.sample /usr/local/share/postgresql/postgresql.conf.sample.orig; \
	sed -ri "s!^#?(listen_addresses)\s*=\s*\S+.*!\1 = '*'!" /usr/local/share/postgresql/postgresql.conf.sample; \
	grep -F "listen_addresses = '*'" /usr/local/share/postgresql/postgresql.conf.sample

RUN install --verbose --directory --owner postgres --group postgres --mode 3777 /var/run/postgresql

ENV PGDATA /var/lib/postgresql/data
# this 1777 will be replaced by 0700 at runtime (allows semi-arbitrary "--user" values)
RUN install --verbose --directory --owner postgres --group postgres --mode 1777 "$PGDATA"
VOLUME /var/lib/postgresql/data

COPY --chmod=755 docker-entrypoint.sh docker-ensure-initdb.sh /usr/local/bin/
RUN ln -sT docker-ensure-initdb.sh /usr/local/bin/docker-enforce-initdb.sh
ENTRYPOINT ["docker-entrypoint.sh"]

# We set the default STOPSIGNAL to SIGINT, which corresponds to what PostgreSQL
# calls "Fast Shutdown mode" wherein new connections are disallowed and any
# in-progress transactions are aborted, allowing PostgreSQL to stop cleanly and
# flush tables to disk.
#
# See https://www.postgresql.org/docs/current/server-shutdown.html for more details
# about available PostgreSQL server shutdown signals.
#
# See also https://www.postgresql.org/docs/current/server-start.html for further
# justification of this as the default value, namely that the example (and
# shipped) systemd service files use the "Fast Shutdown mode" for service
# termination.
#
STOPSIGNAL SIGINT
#
# An additional setting that is recommended for all users regardless of this
# value is the runtime "--stop-timeout" (or your orchestrator/runtime's
# equivalent) for controlling how long to wait between sending the defined
# STOPSIGNAL and sending SIGKILL.
#
# The default in most runtimes (such as Docker) is 10 seconds, and the
# documentation at https://www.postgresql.org/docs/current/server-start.html notes
# that even 90 seconds may not be long enough in many instances.

EXPOSE 5432
CMD ["postgres"]

FROM postgres-build AS pgvector-build
RUN apk add --no-cache build-base
COPY pgvector.tar.gz /tmp/pgvector.tar.gz
RUN echo '83d673c3b287cddbf3879f86215f043f2c2b56c69d37b2a77504910db1ed6e56  /tmp/pgvector.tar.gz' | sha256sum -c - \
    && mkdir /tmp/pgvector && tar -xzf /tmp/pgvector.tar.gz -C /tmp/pgvector --strip-components=1 \
    && make -C /tmp/pgvector -j2 OPTFLAGS='' with_llvm=no \
    && make -C /tmp/pgvector DESTDIR=/out OPTFLAGS='' with_llvm=no install

FROM postgres-build AS postgres
ARG BUILD_REVISION
LABEL org.opencontainers.image.source="https://github.com/giuliomarinelli/MercurionWeb" org.opencontainers.image.revision=$BUILD_REVISION org.mercurion.runtime.role="postgres" \
      org.mercurion.postgres.version="16.16" org.mercurion.pgvector.revision="f37c13f68b57d2c3472b2214fbcff699d6d34876"
RUN apk add --no-cache --upgrade zlib=1.4-r0 libxslt=1.1.43-r4 krb5-libs=1.22.3-r0
COPY --from=pgvector-build /out/usr/local/lib/postgresql/vector.so /usr/local/lib/postgresql/vector.so
COPY --from=pgvector-build /out/usr/local/share/postgresql/extension/ /usr/local/share/postgresql/extension/
# Preserve explicit creation/restore of the existing catalog version; no ALTER EXTENSION.
COPY vector--0.8.1.sql /usr/local/share/postgresql/extension/vector--0.8.1.sql
USER 70:70
