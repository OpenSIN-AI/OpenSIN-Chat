#!/bin/bash

# OpenShift runs containers with an arbitrary UID that may not exist in /etc/passwd.
# Many tools (npm, prisma, git, etc.) expect a passwd entry for the running user.
# If the current UID has no entry, dynamically add one using nss_wrapper-style injection.
if ! whoami &> /dev/null 2>&1; then
  if [ -w /etc/passwd ]; then
    echo "opensin:x:$(id -u):0:OpenSIN Chat User:/app:/bin/bash" >> /etc/passwd
  fi
fi
export HOME=/app

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
    echo "https://docs.opensin.delqhi.com/installation-docker/quickstart"
    echo ""
    echo "⚠️  ⚠️  ⚠️  WARNING: STORAGE_DIR environment variable is not set! ⚠️  ⚠️  ⚠️"
    echo "================================================================"
fi

# Ensure PDF analysis storage directory exists (healthcheck expects it)
mkdir -p "${STORAGE_DIR:-/app/server/storage}/pdf-analysis"
mkdir -p "${STORAGE_DIR:-/app/server/storage}/plugins"

# Track child PIDs for graceful shutdown
SERVER_PID=""
COLLECTOR_PID=""

shutdown() {
  echo "[entrypoint] Received shutdown signal, forwarding to children…"
  [ -n "$SERVER_PID" ] && kill -TERM "$SERVER_PID" 2>/dev/null
  [ -n "$COLLECTOR_PID" ] && kill -TERM "$COLLECTOR_PID" 2>/dev/null
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
      export DATABASE_URL="file:../storage/opensin.db?connection_limit=1"
    fi &&
    npx prisma generate --schema=./prisma/schema.prisma &&
    npx prisma migrate deploy --schema=./prisma/schema.prisma &&
    node /app/server/index.js
} &
SERVER_PID=$!
{ node /app/collector/index.js; } &
COLLECTOR_PID=$!
# Wait specifically for the SERVER process — a collector crash must NOT
# take down the server.  Only exit when the server exits; clean up the
# collector if it is still running.
wait "$SERVER_PID"
EXIT_CODE=$?
[ -n "$COLLECTOR_PID" ] && kill -TERM "$COLLECTOR_PID" 2>/dev/null
exit $EXIT_CODE
