#!/bin/bash

# Check if STORAGE_DIR is set
if [ -z "$STORAGE_DIR" ]; then
    echo "================================================================"
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo ""
    echo "Not setting this will result in data loss on container restart since"
    echo "the application will not have a persistent storage location."
    echo "It can also result in weird errors in various parts of the application."
    echo ""
    echo "Please run the container with the official docker command at"
    echo "https://docs.openafd.com/installation-docker/quickstart"
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# ── Runtime safety guard (issue #102) ────────────────────────────────
# server/utils/paths.js is required by 31+ modules (EmbeddingEngines,
# AiProviders, DocumentManager, ...). If the baked image ever omits it
# (e.g. demo image built before the file was added) the server crashes
# at startup with `Cannot find module '../paths'`. This block idempotently
# recreates the file from an inlined source-of-truth on every container
# start, so a single missing file can never take the whole server down.
PATHS_FILE="/app/server/utils/paths.js"
if [ ! -f "$PATHS_FILE" ]; then
    echo "[entrypoint] WARNING: $PATHS_FILE missing — restoring from embedded source (issue #102)"
    mkdir -p "$(dirname "$PATHS_FILE")"
    cat > "$PATHS_FILE" <<'PATHS_EOF'
const path = require("path");
function getStoragePath(...subdirs) {
  const base = process.env.STORAGE_DIR || path.resolve(__dirname, "../../storage");
  return subdirs.length > 0 ? path.resolve(base, ...subdirs) : base;
}
module.exports = { getStoragePath };
PATHS_EOF
    chown openafd:openafd "$PATHS_FILE" 2>/dev/null || true
    echo "[entrypoint] Restored $PATHS_FILE"
fi
# ── End runtime safety guard ─────────────────────────────────────────

{
  cd /app/server/ &&
    # Disable Prisma CLI telemetry (https://www.prisma.io/docs/orm/tools/prisma-cli#how-to-opt-out-of-data-collection)
    export CHECKPOINT_DISABLE=1 &&
    npx prisma generate --schema=./prisma/schema.prisma &&
    npx prisma migrate deploy --schema=./prisma/schema.prisma &&
    node /app/server/index.js
} &
{ node /app/collector/index.js; } &
wait -n
exit $?
