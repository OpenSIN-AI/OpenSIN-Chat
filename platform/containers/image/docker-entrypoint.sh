#!/bin/bash
# SPDX-License-Identifier: MIT

set -o pipefail

# Source /app/.env if it exists (persistent secrets mounted as read-only volume).
# This ensures secrets survive container recreation even without --env-file.
# Only sets variables that are not already in the environment (docker run -e wins).
if [ -f /app/.env ]; then
  while IFS='=' read -r key raw_value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^[[:space:]]*# ]] && continue
    [[ -z "$key" ]] && continue
    # Trim and validate the key before indirect variable access/export.
    key=$(echo "$key" | xargs)
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    # Trim value: strip CRLF, then leading/trailing whitespace
    value=$(printf '%s' "$raw_value" | sed 's/\r$//')
    value="${value#"${value%%[![:space:]]*}"}"
    value="${value%"${value##*[![:space:]]}"}"
    # Strip matching surrounding quotes (single or double)
    if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
      value="${BASH_REMATCH[1]}"
    fi
    # Only set if not already present in the environment. An explicitly empty
    # Docker variable still wins over the file value.
    if [[ ! -v "$key" ]]; then
      export "$key=$value"
    fi
  done < /app/.env
fi

# Persistent storage is mandatory in production. Starting without it creates a
# deceptively healthy but data-losing container, so fail closed.
if [ -z "$STORAGE_DIR" ]; then
    echo "RUNTIME ERROR: STORAGE_DIR is required. Refusing to start without persistent storage."
    exit 1
fi

# Ensure PDF analysis storage directory exists (healthcheck expects it)
mkdir -p "${STORAGE_DIR:-/app/server/storage}/pdf-analysis"
mkdir -p "${STORAGE_DIR:-/app/server/storage}/plugins"

# Fix ownership of files that may have been created as root during docker build
# or by a previous container run with different UID (issue: EPERM on chmod)
if [ -f "${STORAGE_DIR:-/app/server/storage}/plugins/opensin_mcp_servers.json" ]; then
    chown "$(id -u):$(id -g)" "${STORAGE_DIR:-/app/server/storage}/plugins/opensin_mcp_servers.json" 2>/dev/null || true
fi

# Ensure the collector hotdir + outputs are present and writable by the runtime
# user. These are bind-mounted from the host (see docker-compose.yml), so their
# ownership comes from the host filesystem — NOT the image. When the host dir is
# owned by a different UID than the container user, document uploads fail at
# write time with a cryptic "Invalid file upload. EACCES: permission denied,
# open '/app/collector/hotdir/<uuid>_<name>'". We mkdir (idempotent), attempt a
# best-effort chown (a no-op unless the container has the privilege), then probe
# writability and fail loudly with an actionable message instead of letting the
# error surface later at upload time. Operators can also pre-fix ownership on the
# host with `bash platform/containers/image/fix-permissions.sh`.
for collector_dir in /app/collector/hotdir /app/collector/outputs; do
    mkdir -p "$collector_dir" 2>/dev/null || true
    chown "$(id -u):$(id -g)" "$collector_dir" 2>/dev/null || true
    if ! ( : > "$collector_dir/.write-test" ) 2>/dev/null; then
        echo "================================================================"
        echo "RUNTIME ERROR: $collector_dir is not writable by uid=$(id -u) gid=$(id -g)."
        echo ""
        echo "This directory is bind-mounted from the host, so its ownership"
        echo "comes from the host filesystem. Document uploads will fail with"
        echo "'Invalid file upload. EACCES: permission denied' until this is fixed."
        echo ""
        echo "Fix it on the host, then restart the container:"
        echo "  bash platform/containers/image/fix-permissions.sh"
        echo "  # or manually:"
        echo "  sudo chown -R $(id -u):$(id -g) ./apps/worker/hotdir ./apps/worker/outputs"
        echo "================================================================"
        exit 1
    else
        rm -f "$collector_dir/.write-test" 2>/dev/null || true
    fi
done

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
SHUTTING_DOWN=0

shutdown() {
  [ "$SHUTTING_DOWN" -eq 1 ] && return
  SHUTTING_DOWN=1
  echo "[entrypoint] Received shutdown signal, forwarding to children…"
  [ -n "$SERVER_PID" ] && kill -TERM "$SERVER_PID" 2>/dev/null || true
  [ -n "$COLLECTOR_PID" ] && kill -TERM "$COLLECTOR_PID" 2>/dev/null || true

  # Exit as soon as both children stop; force-kill only processes that remain
  # after the grace period instead of sleeping for ten seconds unconditionally.
  for _ in {1..10}; do
    server_alive=0
    collector_alive=0
    [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null && server_alive=1
    [ -n "$COLLECTOR_PID" ] && kill -0 "$COLLECTOR_PID" 2>/dev/null && collector_alive=1
    [ "$server_alive" -eq 0 ] && [ "$collector_alive" -eq 0 ] && break
    sleep 1
  done

  [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null && kill -KILL "$SERVER_PID" 2>/dev/null || true
  [ -n "$COLLECTOR_PID" ] && kill -0 "$COLLECTOR_PID" 2>/dev/null && kill -KILL "$COLLECTOR_PID" 2>/dev/null || true
  [ -n "$SERVER_PID" ] && wait "$SERVER_PID" 2>/dev/null || true
  [ -n "$COLLECTOR_PID" ] && wait "$COLLECTOR_PID" 2>/dev/null || true
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
    yarn prisma:migrate &&
    node /app/server/index.js
} &
SERVER_PID=$!
{ node /app/collector/index.js; } &
COLLECTOR_PID=$!

# Both processes are required for a healthy product. If either exits, terminate
# the other process and propagate the failing exit code to Docker.
while true; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    wait "$SERVER_PID"
    EXIT_CODE=$?
    echo "[entrypoint] API process exited with code $EXIT_CODE"
    kill -TERM "$COLLECTOR_PID" 2>/dev/null || true
    wait "$COLLECTOR_PID" 2>/dev/null || true
    exit "$EXIT_CODE"
  fi
  if ! kill -0 "$COLLECTOR_PID" 2>/dev/null; then
    wait "$COLLECTOR_PID"
    EXIT_CODE=$?
    echo "[entrypoint] Document worker exited with code $EXIT_CODE"
    kill -TERM "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    exit "$EXIT_CODE"
  fi
  sleep 2
done
