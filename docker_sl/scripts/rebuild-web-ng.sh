#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔄 Rebuilding mercurion_web_ng..."

docker compose stop mercurion_web_ng
docker compose build mercurion_web_ng --no-cache
docker compose up -d mercurion_web_ng
