#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Poll a Git branch and deploy an immutable local image tagged by commit SHA.

set -Eeuo pipefail

REPO_DIR="${OPENSIN_REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
BRANCH="${OPENSIN_BRANCH:-main}"
COMPOSE_SERVICE="${OPENSIN_COMPOSE_SERVICE:-opensin-chat}"
IMAGE_REPOSITORY="${OPENSIN_IMAGE_REPOSITORY:-opensin-chat}"
HEALTH_URL="${OPENSIN_HEALTH_URL:-http://127.0.0.1:43939/api/ping}"
LOCK_DIR="${OPENSIN_LOCK_DIR:-${TMPDIR:-/tmp}/opensin-chat-auto-deploy.lock}"
LOG_FILE="${OPENSIN_LOG_FILE:-${REPO_DIR}/.local/logs/auto-deploy.log}"

mkdir -p "$(dirname "${LOG_FILE}")"
log() { printf '[%s] %s\n' "$(date -u +%FT%TZ)" "$*" | tee -a "${LOG_FILE}"; }

if ! mkdir "${LOCK_DIR}" 2>/dev/null; then
  log "another deploy is active; skipping"
  exit 0
fi
cleanup() { rmdir "${LOCK_DIR}" 2>/dev/null || true; }
trap cleanup EXIT

cd "${REPO_DIR}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  log "tracked worktree changes present; refusing deploy"
  exit 1
fi
if [[ -n "$(git ls-files --others --exclude-standard)" ]]; then
  log "untracked source files present; refusing deploy"
  exit 1
fi

git fetch --prune origin "${BRANCH}" --quiet
current_sha=$(git rev-parse HEAD)
target_sha=$(git rev-parse "origin/${BRANCH}")

if [[ "${current_sha}" == "${target_sha}" ]]; then
  log "already at ${target_sha}"
  exit 0
fi

compose_dir="${REPO_DIR}/platform/containers/compose"
compose=(
  docker compose
  --project-directory "${compose_dir}"
  -f "${compose_dir}/docker-compose.yml"
  -f "${compose_dir}/docker-compose.production.yml"
)

previous_container=$("${compose[@]}" ps -q "${COMPOSE_SERVICE}" || true)
previous_image_id=""
rollback_tag=""
if [[ -n "${previous_container}" ]]; then
  previous_image_id=$(docker inspect --format '{{.Image}}' "${previous_container}" 2>/dev/null || true)
fi
if [[ -n "${previous_image_id}" ]]; then
  rollback_tag="rollback-$(date -u +%Y%m%d-%H%M%S)"
  docker image tag "${previous_image_id}" "${IMAGE_REPOSITORY}:${rollback_tag}"
fi

wait_for_health() {
  local attempts="${1:-60}"
  for ((attempt = 1; attempt <= attempts; attempt++)); do
    if curl --fail --silent --show-error --max-time 5 "${HEALTH_URL}" \
      | grep -Eq '"online"[[:space:]]*:[[:space:]]*true'; then
      return 0
    fi
    sleep 2
  done
  return 1
}

rollback() {
  local rc=$?
  trap - ERR
  if [[ -n "${rollback_tag}" ]]; then
    log "deploy failed; restoring ${IMAGE_REPOSITORY}:${rollback_tag}"
    OPENSIN_IMAGE_REPOSITORY="${IMAGE_REPOSITORY}" \
    OPENSIN_IMAGE_TAG="${rollback_tag}" \
      "${compose[@]}" up -d --no-build --no-deps "${COMPOSE_SERVICE}"
    wait_for_health 45 || log "rollback health verification failed"
  else
    log "deploy failed and no rollback image is available"
  fi
  exit "${rc}"
}
trap rollback ERR

git checkout -B "${BRANCH}" "origin/${BRANCH}" --quiet
git reset --hard "${target_sha}" --quiet

export OPENSIN_IMAGE_REPOSITORY="${IMAGE_REPOSITORY}"
export OPENSIN_IMAGE_TAG="${target_sha}"

log "normalizing persistent volume permissions"
"${compose[@]}" run -T --rm --no-deps fix-permissions </dev/null

log "building immutable image ${IMAGE_REPOSITORY}:${target_sha}"
"${compose[@]}" build --pull "${COMPOSE_SERVICE}"

log "starting immutable image ${IMAGE_REPOSITORY}:${target_sha}"
"${compose[@]}" up -d --no-deps "${COMPOSE_SERVICE}"
wait_for_health 60

running_container=$("${compose[@]}" ps -q "${COMPOSE_SERVICE}")
running_image=$(docker inspect --format '{{.Config.Image}}' "${running_container}")
expected_image="${IMAGE_REPOSITORY}:${target_sha}"
if [[ "${running_image}" != "${expected_image}" ]]; then
  log "unexpected running image: ${running_image}"
  exit 1
fi

trap - ERR
log "deploy complete commit=${target_sha} image=${running_image}"
