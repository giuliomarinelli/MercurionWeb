#!/bin/sh
# Used by the upstream entrypoint only for a new, empty PostgreSQL cluster.
# Password travels on the psql stdin pipe, never argv or an SQL file.
set -eu
task_app_password=$(cat /run/mercurion/application-password)
case "$task_app_password" in
  ''|*[!A-Za-z0-9+/=]*) echo 'Invalid application password format' >&2; exit 1 ;;
esac
printf "CREATE ROLE mercurion_preview LOGIN PASSWORD '%s';\n" "$task_app_password" | psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres
unset task_app_password
createdb --username "$POSTGRES_USER" --owner mercurion_preview mercurion_preview
psql -X -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname mercurion_preview -c 'CREATE EXTENSION vector;'
