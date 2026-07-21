#!/bin/bash
# SPDX-License-Identifier: MIT

set -euo pipefail

# Deploy OpenSIN-Chat to the OCI production VM (sin-supabase).
# 1) Build frontend locally (Node 22)
# 2) git checkout origin/main on the server (keeps storage mounts)
# 3) Slim-rsync dist (no .br/.gz — regenerate on server; tunnel-friendly)
# 4) Sync server JS into the running container (no more manual docker-cp drift)
# 5) Optional full image rebuild: REBUILD_IMAGE=1 ./scripts/deploy-production.sh
# 6) Copy frontend dist + restart, health-check
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

# Prefer nvm Node 22 when the default shell node is too old.
if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "${HOME}/.nvm/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || true
fi
export PATH="${HOME}/.nvm/versions/node/v22.22.1/bin:${PATH:-/usr/bin}"

echo "[deploy] Building frontend (Node 22)..."
cd "${REPO_DIR}/frontend"

if command -v node >/dev/null 2>&1 && node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' 2>/dev/null; then
  echo "[deploy] using $(node -v) at $(command -v node)"
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
ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o BatchMode=yes "${SERVER}" \
  "cd ${REMOTE_REPO_DIR} && git fetch origin ${BRANCH} && git checkout -f origin/${BRANCH} -- . ':!server/storage' ':!server/storage-opensin' ':!collector/hotdir' ':!collector/outputs' ':!frontend/node_modules' ':!server/node_modules' ':!collector/node_modules' ':!frontend/dist' && git reset --soft origin/${BRANCH} && git update-ref HEAD origin/${BRANCH}"

# Ensure remote dist is writable (previous docker cp can leave root-owned files).
ssh -o ConnectTimeout=30 -o BatchMode=yes "${SERVER}" \
  "sudo chown -R ubuntu:ubuntu ${REMOTE_REPO_DIR}/frontend/dist 2>/dev/null || true; mkdir -p ${REMOTE_REPO_DIR}/frontend/dist"

echo "[deploy] Rsync frontend dist (slim — exclude precompressed companions)..."
# Transferring .br/.gz (~2× size) routinely kills the OCI SSH tunnel. Rebuild
# them on the server after rsync (CPU is free; bandwidth is not).
RSYNC_OK=0
for attempt in 1 2 3 4 5; do
  if rsync -az --delete --partial --timeout=240 --no-perms \
    --exclude='.vite' --exclude='node_modules' --exclude='stats.html' \
    --exclude='*.br' --exclude='*.gz' \
    -e "ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=12 -o BatchMode=yes -o TCPKeepAlive=yes" \
    "${REPO_DIR}/frontend/dist/" "${SERVER}:${REMOTE_REPO_DIR}/frontend/dist/"; then
    RSYNC_OK=1
    echo "[deploy] rsync OK (attempt ${attempt})"
    break
  fi
  echo "[deploy] rsync failed (attempt ${attempt}) — retrying..."
  sleep 5
done
if [ "${RSYNC_OK}" != "1" ]; then
  echo "[deploy] ERROR: rsync failed after retries" >&2
  exit 1
fi

echo "[deploy] Precompressing assets on server..."
ssh -o ConnectTimeout=30 -o ServerAliveInterval=15 -o BatchMode=yes "${SERVER}" "node <<'NODE'
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');
const { createGzip, createBrotliCompress, constants } = require('zlib');
const dir = path.join(process.env.HOME, 'OpenSIN-Chat/frontend/dist/assets');
const EXT = new Set(['.js','.css','.mjs','.json','.svg','.html','.txt','.xml','.map','.wasm']);
(async () => {
  let done = 0;
  if (!fs.existsSync(dir)) { console.log('no assets dir'); return; }
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.br') || name.endsWith('.gz')) continue;
    const abs = path.join(dir, name);
    let st; try { st = fs.statSync(abs); } catch { continue; }
    if (!st.isFile() || st.size < 1024) continue;
    if (!EXT.has(path.extname(name).toLowerCase())) continue;
    if (!fs.existsSync(abs + '.gz'))
      await pipeline(createReadStream(abs), createGzip({ level: 6 }), createWriteStream(abs + '.gz'));
    if (!fs.existsSync(abs + '.br'))
      await pipeline(createReadStream(abs), createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }), createWriteStream(abs + '.br'));
    done++;
  }
  console.log('precompressed', done);
})().catch((e) => { console.error(e); process.exit(1); });
NODE"

if [ "${REBUILD_IMAGE}" = "1" ]; then
  echo "[deploy] REBUILD_IMAGE=1 — rebuilding ${CONTAINER_NAME} image on server (SKIP_CHROMIUM=1)..."
  ssh -o ConnectTimeout=30 -o BatchMode=yes "${SERVER}" "set -e
    cd ${REMOTE_REPO_DIR}/${COMPOSE_DIR}
    export SKIP_CHROMIUM=1
    docker compose build ${COMPOSE_SERVICE}
    docker compose up -d ${COMPOSE_SERVICE}
  "
else
  echo "[deploy] Syncing server source into running container (avoids stale docker-cp drift)..."
  ssh -o ConnectTimeout=30 -o BatchMode=yes "${SERVER}" "set -e
    cd ${REMOTE_REPO_DIR}
    for path in server/endpoints server/models server/utils server/jobs server/prisma; do
      if [ -d \"\$path\" ]; then
        docker cp \"\$path/.\" ${CONTAINER_NAME}:/app/\$path/
      fi
    done
    docker cp server/app.js ${CONTAINER_NAME}:/app/server/app.js
  "
fi

echo "[deploy] Copying dist into ${CONTAINER_NAME} (incl. index.js preload map)..."
ssh -o ConnectTimeout=30 -o BatchMode=yes "${SERVER}" \
  "docker cp ${REMOTE_REPO_DIR}/frontend/dist/. ${CONTAINER_NAME}:/app/server/public/ && docker cp ${REMOTE_REPO_DIR}/frontend/dist${ENTRY_JS} ${CONTAINER_NAME}:/app/server/public/index.js && docker restart ${CONTAINER_NAME}"

echo "[deploy] Waiting for health endpoint..."
for i in {1..45}; do
  if ssh -o ConnectTimeout=15 -o BatchMode=yes "${SERVER}" "curl -sS ${HEALTH_URL}" | grep -q '"online":true'; then
    echo "[deploy] Health check OK"
    echo "[deploy] Live check: $(curl -sS --max-time 15 "${PUBLIC_HEALTH_URL}" || true)"
    exit 0
  fi
  echo "[deploy] Health check pending (${i}/45)..."
  sleep 2
done

echo "[deploy] ERROR: Health check failed after 90s."
exit 1
