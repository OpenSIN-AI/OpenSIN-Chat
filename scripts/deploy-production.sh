#!/bin/bash
set -euo pipefail

# Deploy OpenSIN-Chat to the OCI production VM (sin-supabase).
# This script is intended to run ON the VM via SSH, not from the agent environment.
# Example: ssh sin-supabase 'bash -s' < scripts/deploy-production.sh

REPO_DIR="${HOME}/OpenSIN-Chat"
COMPOSE_DIR="${REPO_DIR}/docker-opensin"
HEALTH_URL="http://localhost:38471/api/ping"
BRANCH="main"

cd "${REPO_DIR}"

echo "[deploy] Fetching latest ${BRANCH}..."
git fetch origin "${BRANCH}"
git reset --hard "origin/${BRANCH}"

cd "${COMPOSE_DIR}"

echo "[deploy] Building production image (no cache)..."
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache

echo "[deploy] Starting/restarting production container..."
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

echo "[deploy] Container status:"
docker compose -f docker-compose.yml -f docker-compose.production.yml ps

echo "[deploy] Waiting for health endpoint..."
for i in {1..30}; do
  if curl -sS "${HEALTH_URL}" | grep -q '"online":true'; then
    echo "[deploy] Health check OK: ${HEALTH_URL}"
    exit 0
  fi
  echo "[deploy] Health check pending (${i}/30)..."
  sleep 2
done

echo "[deploy] ERROR: Health check failed after 60s."
exit 1
