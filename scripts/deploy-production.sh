#!/bin/bash
# SPDX-License-Identifier: MIT

set -euo pipefail

# Deploy OpenSIN-Chat to the OCI production VM (sin-supabase).
# Builds the frontend locally with apple/container (Node 22), then
# rsyncs dist/ to the server and restarts the Docker container there.
# No Docker build on the server — only the pre-built static assets
# are copied into the running container.
#
# Usage: ./scripts/deploy-production.sh

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="sin-supabase"
REMOTE_REPO_DIR="\${HOME}/OpenSIN-Chat"
HEALTH_URL="http://localhost:38471/api/ping"
BRANCH="main"

echo "[deploy] Building frontend locally (Node 22 via apple/container)..."
cd "${REPO_DIR}/frontend"

# Build inside a Node 22 container using apple/container
container run --rm \
  -v "$(pwd):/build" \
  -w /build \
  node:22-slim \
  sh -c "yarn install --frozen-lockfile && yarn build"

echo "[deploy] Frontend build complete. dist/ ready."

echo "[deploy] Syncing source + dist to ${SERVER}..."
ssh "${SERVER}" "cd ${REMOTE_REPO_DIR} && git fetch origin ${BRANCH} && git checkout -f origin/${BRANCH} -- . ':!server/storage' ':!server/storage-opensin' ':!collector/hotdir' ':!collector/outputs' ':!frontend/node_modules' ':!server/node_modules' ':!collector/node_modules'"

# rsync the freshly built dist into the server's repo
ssh "${SERVER}" "rm -rf ${REMOTE_REPO_DIR}/frontend/dist/*"
rsync -az --no-perms --exclude='.vite' --exclude='node_modules' "${REPO_DIR}/frontend/dist/" "${SERVER}:${REMOTE_REPO_DIR}/frontend/dist/"

echo "[deploy] Copying dist into running container and restarting..."
ssh "${SERVER}" "docker cp ${REMOTE_REPO_DIR}/frontend/dist/. opensin-app:/app/server/public/ && docker restart opensin-app"

echo "[deploy] Waiting for health endpoint..."
for i in {1..30}; do
  if ssh "${SERVER}" "curl -sS ${HEALTH_URL}" | grep -q '"online":true'; then
    echo "[deploy] Health check OK"
    echo "[deploy] Live check: $(curl -sS https://sinchat.delqhi.com/api/ping)"
    exit 0
  fi
  echo "[deploy] Health check pending (${i}/30)..."
  sleep 2
done

echo "[deploy] ERROR: Health check failed after 60s."
exit 1
