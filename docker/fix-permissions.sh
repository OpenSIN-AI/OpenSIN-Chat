#!/usr/bin/env bash
# fix-permissions.sh — Ensure storage directories are owned by the container user (uid 1000)
# Run this on the host BEFORE starting docker-compose.
# Usage: bash docker/fix-permissions.sh
set -euo pipefail

UID_TARGET="${UID:-1000}"
GID_TARGET="${GID:-1000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Fixing storage permissions for uid:gid ${UID_TARGET}:${GID_TARGET}..."

# OpenSIN storage
if [ -d "$PROJECT_ROOT/server/storage" ]; then
  echo "  Fixing $PROJECT_ROOT/server/storage ..."
  chown -R "${UID_TARGET}:${GID_TARGET}" "$PROJECT_ROOT/server/storage"
  chmod -R u=rwX,g=rX,o=rX "$PROJECT_ROOT/server/storage"
fi

# Create tmp if missing
mkdir -p "$PROJECT_ROOT/server/storage/tmp"
chown "${UID_TARGET}:${GID_TARGET}" "$PROJECT_ROOT/server/storage/tmp"

echo "Done. Storage directories are now owned by ${UID_TARGET}:${GID_TARGET}."
