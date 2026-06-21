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
    echo "https://sinchat.delqhi.com/docs"
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# Ensure PDF analysis storage directory exists (healthcheck expects it)
mkdir -p "${STORAGE_DIR:-/app/server/storage}/pdf-analysis"
mkdir -p "${STORAGE_DIR:-/app/server/storage}/plugins"

# Fix ownership of files that may have been created as root during docker build
# or by a previous container run with different UID (issue: EPERM on chmod)
if [ -f "${STORAGE_DIR:-/app/server/storage}/plugins/openafd_mcp_servers.json" ]; then
    chown "$(id -u):$(id -g)" "${STORAGE_DIR:-/app/server/storage}/plugins/openafd_mcp_servers.json" 2>/dev/null || true
fi

# Defense-in-depth runtime guard for issue #114: the native embedder crashes
# with a cryptic Node module error when /app/server/utils/paths.js is missing.
# If the file is not present, fail loudly and tell the operator to rebuild.
if [ ! -f /app/server/utils/paths.js ]; then
    echo "================================================================"
    echo "RUNTIME ERROR: /app/server/utils/paths.js is missing!"
    echo "The native embedder will crash. Please rebuild the image so that"
    echo "server/utils/paths.js is included in the Docker image."
    echo "================================================================"
    exit 1
fi

# Track child PIDs for graceful shutdown
SERVER_PID=""
COLLECTOR_PID=""

shutdown() {
  echo "[entrypoint] Received shutdown signal, forwarding to children…"
  [ -n "$SERVER_PID" ] && kill -TERM "$SERVER_PID" 2>/dev/null
  [ -n "$COLLECTOR_PID" ] && kill -TERM "$COLLECTOR_PID" 2>/dev/null
  # Give children 10s to finish, then force-kill
  sleep 10
  [ -n "$SERVER_PID" ] && kill -KILL "$SERVER_PID" 2>/dev/null
  [ -n "$COLLECTOR_PID" ] && kill -KILL "$COLLECTOR_PID" 2>/dev/null
  exit 0
}

trap shutdown SIGTERM SIGINT

{
  cd /app/server/ &&
    # Disable Prisma CLI telemetry (https://www.prisma.io/docs/orm/tools/prisma-cli#how-to-opt-out-of-data-collection)
    export CHECKPOINT_DISABLE=1 &&
    # Set DATABASE_URL for SQLite if not already set (needed by schema.prisma env())
    if [ -z "$DATABASE_URL" ]; then
      export DATABASE_URL="file:../storage/openafd.db?connection_limit=1"
    fi &&
    npx prisma generate --schema=./prisma/schema.prisma &&
    npx prisma migrate deploy --schema=./prisma/schema.prisma &&
    node /app/server/index.js
} &
SERVER_PID=$!
{ node /app/collector/index.js; } &
COLLECTOR_PID=$!
wait -n
exit $?
