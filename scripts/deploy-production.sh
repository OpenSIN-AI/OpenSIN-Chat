#!/bin/bash
# SPDX-License-Identifier: MIT

set -euo pipefail

# Deploy OpenSIN-Chat to the OCI production VM (sin-supabase).
# 1) Build frontend locally (Node 22)
# 2) git checkout origin/main on the server (keeps storage mounts)
# 3) Sync server JS into the running container (no more manual docker cp drift)
# 4) Optional full image rebuild: REBUILD_IMAGE=1 ./scripts/deploy-production.sh
# 5) Copy frontend dist + restart, health-check
#
# Usage:
#   ./scripts/deploy-production.sh
#   REBUILD_IMAGE=1 ./scripts/deploy-production.sh

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="sin-supabase"
REMOTE_REPO_DIR="\${HOME}/OpenSIN-Chat"
CONTAINER_NAME="opensin-app"
COMPOSE_DIR="docker-opensin"
COMPOSE_SERVICE="opensin-chat"
HEALTH_URL="http://localhost:38471/api/ping"
PUBLIC_HEALTH_URL="https://sinchat.delqhi.com/api/ping"
BRANCH="main"
REBUILD_IMAGE="${REBUILD_IMAGE:-0}"

echo "[deploy] Building frontend (Node 22)..."
cd "${REPO_DIR}/frontend"

if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' 2>/dev/null; then
  yarn install --frozen-lockfile
  yarn build
elif command -v container >/dev/null 2>&1; then
  echo "[deploy] Local Node <22 — building via apple/container node:22-slim"
  container run --rm \
    -v "$(pwd):/build" \
    -w /build \
    node:22-slim \
    sh -c "yarn install --frozen-lockfile && yarn build"
else
  echo "[deploy] ERROR: need Node >=22 or apple/container for the frontend build" >&2
  exit 1
fi

if [ ! -f dist/_index.html ]; then
  echo "[deploy] ERROR: dist/_index.html missing after build" >&2
  exit 1
fi

ENTRY_JS="$(grep -oE '/assets/index-[A-Za-z0-9_-]+\.js' dist/_index.html | head -1 || true)"
if [ -z "${ENTRY_JS}" ] || [ ! -f "dist${ENTRY_JS}" ]; then
  echo "[deploy] ERROR: could not resolve entry JS from dist/_index.html" >&2
  exit 1
fi
echo "[deploy] Entry bundle: ${ENTRY_JS}"

echo "[deploy] Syncing git source on ${SERVER}..."
ssh "${SERVER}" "cd ${REMOTE_REPO_DIR} && git fetch origin ${BRANCH} && git checkout -f origin/${BRANCH} -- . ':!server/storage' ':!server/storage-opensin' ':!collector/hotdir' ':!collector/outputs' ':!frontend/node_modules' ':!server/node_modules' ':!collector/node_modules' ':!frontend/dist' && git reset --soft origin/${BRANCH} && git update-ref HEAD origin/${BRANCH}"

ssh "${SERVER}" "sudo chown -R ubuntu:ubuntu ${REMOTE_REPO_DIR}/frontend/dist 2>/dev/null || true; sudo rm -rf ${REMOTE_REPO_DIR}/frontend/dist; mkdir -p ${REMOTE_REPO_DIR}/frontend/dist"

echo "[deploy] Rsync frontend dist..."
rsync -az --delete --no-perms --exclude='.vite' --exclude='node_modules' \
  -e "ssh -o ConnectTimeout=30 -o ServerAliveInterval=15" \
  "${REPO_DIR}/frontend/dist/" "${SERVER}:${REMOTE_REPO_DIR}/frontend/dist/"

if [ "${REBUILD_IMAGE}" = "1" ]; then
  echo "[deploy] REBUILD_IMAGE=1 — rebuilding ${CONTAINER_NAME} image on server..."
  ssh "${SERVER}" "set -e
    cd ${REMOTE_REPO_DIR}/${COMPOSE_DIR}
    docker compose -f docker-compose.yml -f docker-compose.production.yml build ${COMPOSE_SERVICE} 2>/dev/null \
      || docker compose build ${COMPOSE_SERVICE}
    docker compose -f docker-compose.yml -f docker-compose.production.yml up -d ${COMPOSE_SERVICE} 2>/dev/null \
      || docker compose up -d ${COMPOSE_SERVICE}
  "
else
  echo "[deploy] Syncing server source into running container..."
  ssh "${SERVER}" "set -e
    cd ${REMOTE_REPO_DIR}
    for path in \
      server/endpoints \
      server/models \
      server/utils \
      server/jobs \
      server/prisma
    do
      if [ -d \"\$path\" ]; then
        docker cp \"\$path/.\" ${CONTAINER_NAME}:/app/\$path/
      fi
    done
  "
fi

echo "[deploy] Copying dist into ${CONTAINER_NAME}..."
ssh "${SERVER}" "docker cp ${REMOTE_REPO_DIR}/frontend/dist/. ${CONTAINER_NAME}:/app/server/public/ && docker cp ${REMOTE_REPO_DIR}/frontend/dist${ENTRY_JS} ${CONTAINER_NAME}:/app/server/public/index.js && docker restart ${CONTAINER_NAME}"

echo "[deploy] Waiting for health endpoint..."
for i in {1..45}; do
  if ssh "${SERVER}" "curl -sS ${HEALTH_URL}" | grep -q '"online":true'; then
    echo "[deploy] Health check OK"
    echo "[deploy] Live check: $(curl -sS --max-time 15 "${PUBLIC_HEALTH_URL}" || true)"
    exit 0
  fi
  echo "[deploy] Health check pending (${i}/45)..."
  sleep 2
done

echo "[deploy] ERROR: Health check failed after 90s."
exit 1
