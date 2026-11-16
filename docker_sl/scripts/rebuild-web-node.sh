#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔄 Rebuilding mercurion_web_node..."

docker compose stop mercurion_web_node
docker compose build mercurion_web_node --no-cache
docker compose up -d mercurion_web_node
