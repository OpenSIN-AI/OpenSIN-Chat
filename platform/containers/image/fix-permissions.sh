#!/usr/bin/env bash
# fix-permissions.sh — Ensure storage directories are owned by the container user (uid 1000)
# Run this on the host BEFORE starting docker-compose.
# Usage: bash docker/fix-permissions.sh
# Optional override: APP_UID=1001 APP_GID=1001 bash docker/fix-permissions.sh
set -euo pipefail

UID_TARGET="${APP_UID:-1000}"
GID_TARGET="${APP_GID:-1000}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "Fixing storage permissions for uid:gid ${UID_TARGET}:${GID_TARGET}..."

# Fix all mounted volume directories (must match docker-compose.yml volumes)
for dir in "$PROJECT_ROOT/server/storage-opensin" "$PROJECT_ROOT/collector/hotdir" "$PROJECT_ROOT/collector/outputs"; do
  if [ -d "$dir" ]; then
    echo "  Fixing $dir ..."
    chown -R "${UID_TARGET}:${GID_TARGET}" "$dir"
    # Group-writable (ug+rwX): the collector/server may run under a different
    # identity than the on-disk owner (uid drift between host and container).
    # Group-read-only (g=rX) here was the root cause of EACCES on direct-uploads.
    chmod -R ug+rwX "$dir"
  else
    mkdir -p "$dir"
    chown "${UID_TARGET}:${GID_TARGET}" "$dir"
  fi
done

# Create tmp if missing
mkdir -p "$PROJECT_ROOT/server/storage-opensin/tmp"
chown "${UID_TARGET}:${GID_TARGET}" "$PROJECT_ROOT/server/storage-opensin/tmp"

echo "Done. Storage directories are now owned by ${UID_TARGET}:${GID_TARGET}."
