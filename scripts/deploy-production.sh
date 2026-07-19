#!/bin/bash
# SPDX-License-Identifier: MIT

set -euo pipefail

# Deploy OpenSIN-Chat to the OCI production VM (sin-supabase).
# Builds the frontend locally (Node 22 via nvm/path, fallback apple/container),
# rsyncs dist/ to the server, copies assets into the running container, and
# syncs public/index.js so MetaGenerator modulepreloads match the new build.
#
# Usage: ./scripts/deploy-production.sh

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="sin-supabase"
REMOTE_REPO_DIR="\${HOME}/OpenSIN-Chat"
CONTAINER_NAME="opensin-app"
HEALTH_URL="http://localhost:38471/api/ping"
PUBLIC_HEALTH_URL="https://sinchat.delqhi.com/api/ping"
BRANCH="main"

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

echo "[deploy] Syncing source + dist to ${SERVER}..."
ssh "${SERVER}" "cd ${REMOTE_REPO_DIR} && git fetch origin ${BRANCH} && git checkout -f origin/${BRANCH} -- . ':!server/storage' ':!server/storage-opensin' ':!collector/hotdir' ':!collector/outputs' ':!frontend/node_modules' ':!server/node_modules' ':!collector/node_modules' ':!frontend/dist'"

# Ensure remote dist is writable (previous docker cp can leave root-owned files).
ssh "${SERVER}" "sudo chown -R ubuntu:ubuntu ${REMOTE_REPO_DIR}/frontend/dist 2>/dev/null || true; sudo rm -rf ${REMOTE_REPO_DIR}/frontend/dist; mkdir -p ${REMOTE_REPO_DIR}/frontend/dist"

rsync -az --delete --no-perms --exclude='.vite' --exclude='node_modules' \
  "${REPO_DIR}/frontend/dist/" "${SERVER}:${REMOTE_REPO_DIR}/frontend/dist/"

echo "[deploy] Copying dist into ${CONTAINER_NAME} (incl. index.js preload map)..."
ssh "${SERVER}" "docker cp ${REMOTE_REPO_DIR}/frontend/dist/. ${CONTAINER_NAME}:/app/server/public/ && docker cp ${REMOTE_REPO_DIR}/frontend/dist${ENTRY_JS} ${CONTAINER_NAME}:/app/server/public/index.js && docker restart ${CONTAINER_NAME}"

echo "[deploy] Waiting for health endpoint..."
for i in {1..30}; do
  if ssh "${SERVER}" "curl -sS ${HEALTH_URL}" | grep -q '"online":true'; then
    echo "[deploy] Health check OK"
    echo "[deploy] Live check: $(curl -sS --max-time 15 "${PUBLIC_HEALTH_URL}" || true)"
    exit 0
  fi
  echo "[deploy] Health check pending (${i}/30)..."
  sleep 2
done

echo "[deploy] ERROR: Health check failed after 60s."
exit 1
