#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Fail-closed recovery helper for a private OpenSIN deployment.
# Docs: docs/INCIDENT-RESPONSE.md

set -Eeuo pipefail

required=(DEPLOY_HOST REMOTE_REPO_DIR COMPOSE_SERVICE LOCAL_HEALTH_URL PUBLIC_HEALTH_URL)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "[recover] ERROR: ${name} is required." >&2
    exit 2
  fi
done

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-opensin-chat}"
COMPOSE_FILE="${COMPOSE_FILE:-platform/containers/compose/docker-compose.yml}"
COMPOSE_OVERRIDE_FILE="${COMPOSE_OVERRIDE_FILE:-platform/containers/compose/docker-compose.production.yml}"
TUNNEL_SERVICE="${TUNNEL_SERVICE:-}"
SSH_OPTIONS=(-o BatchMode=yes -o ConnectTimeout=10)

remote() {
  ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" "$@"
}

printf '[recover] probing configured deployment target\n'
remote 'echo reachable' >/dev/null

printf '[recover] checking compose service\n'
if ! remote bash -s -- \
  "${REMOTE_REPO_DIR}" \
  "${COMPOSE_PROJECT_NAME}" \
  "${COMPOSE_FILE}" \
  "${COMPOSE_OVERRIDE_FILE}" \
  "${COMPOSE_SERVICE}" <<'REMOTE_CHECK'
set -Eeuo pipefail
repo_dir="$1"
project="$2"
base_file="$3"
override_file="$4"
service="$5"

case "$repo_dir" in
  /*) ;;
  *) repo_dir="${HOME}/${repo_dir}" ;;
esac

cd "$repo_dir"
docker compose \
  -p "$project" \
  -f "$base_file" \
  -f "$override_file" \
  ps --status running "$service" \
  | grep -q "$service"
REMOTE_CHECK
then
  printf '[recover] service is not running; starting existing immutable image\n'
  remote bash -s -- \
    "${REMOTE_REPO_DIR}" \
    "${COMPOSE_PROJECT_NAME}" \
    "${COMPOSE_FILE}" \
    "${COMPOSE_OVERRIDE_FILE}" \
    "${COMPOSE_SERVICE}" <<'REMOTE_START'
set -Eeuo pipefail
repo_dir="$1"
project="$2"
base_file="$3"
override_file="$4"
service="$5"

case "$repo_dir" in
  /*) ;;
  *) repo_dir="${HOME}/${repo_dir}" ;;
esac

cd "$repo_dir"
docker compose \
  -p "$project" \
  -f "$base_file" \
  -f "$override_file" \
  up -d --no-build --no-deps "$service"
REMOTE_START
fi

printf '[recover] checking private health endpoint\n'
remote curl --fail --silent --show-error --max-time 10 "${LOCAL_HEALTH_URL}" >/dev/null

if [[ -n "${TUNNEL_SERVICE}" ]]; then
  printf '[recover] checking configured tunnel service\n'
  if ! remote systemctl is-active --quiet "${TUNNEL_SERVICE}"; then
    remote sudo systemctl restart "${TUNNEL_SERVICE}"
    remote systemctl is-active --quiet "${TUNNEL_SERVICE}"
  fi
fi

printf '[recover] checking public health endpoint\n'
curl --fail --silent --show-error --max-time 20 "${PUBLIC_HEALTH_URL}" >/dev/null
printf '[recover] recovery verification passed\n'
