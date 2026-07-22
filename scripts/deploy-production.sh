#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

set -Eeuo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-}"
REMOTE_REPO_DIR="${REMOTE_REPO_DIR:-OpenSIN-Chat}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

COMPOSE_SERVICE="${COMPOSE_SERVICE:-opensin-chat}"
COMPOSE_PORT="${COMPOSE_PORT:-43939}"
COMPOSE_BIND_ADDRESS="${COMPOSE_BIND_ADDRESS:-127.0.0.1}"

OPENSIN_IMAGE_REPOSITORY="${OPENSIN_IMAGE_REPOSITORY:-opensin-chat}"
PUBLIC_HEALTH_URL="${PUBLIC_HEALTH_URL:-}"

if [[ -z "${DEPLOY_HOST}" ]]; then
  echo "[deploy] ERROR: DEPLOY_HOST is required." >&2
  echo "[deploy] Example: DEPLOY_HOST=production ./scripts/deploy-production.sh" >&2
  exit 1
fi

if [[ "${REMOTE_REPO_DIR}" =~ [[:space:]] ]]; then
  echo "[deploy] ERROR: REMOTE_REPO_DIR must not contain whitespace." >&2
  exit 1
fi

if [[ "${DEPLOY_BRANCH}" =~ [[:space:]] ]]; then
  echo "[deploy] ERROR: DEPLOY_BRANCH must not contain whitespace." >&2
  exit 1
fi

SSH_OPTIONS=(
  -o BatchMode=yes
  -o ConnectTimeout=30
  -o ServerAliveInterval=15
  -o ServerAliveCountMax=8
  -o TCPKeepAlive=yes
)

echo "[deploy] Host: ${DEPLOY_HOST}"
echo "[deploy] Branch: ${DEPLOY_BRANCH}"
echo "[deploy] Remote repository: ${REMOTE_REPO_DIR}"
echo "[deploy] Service: ${COMPOSE_SERVICE}"

ssh "${SSH_OPTIONS[@]}" "${DEPLOY_HOST}" \
  bash -s -- \
  "${REMOTE_REPO_DIR}" \
  "${DEPLOY_BRANCH}" \
  "${COMPOSE_SERVICE}" \
  "${COMPOSE_PORT}" \
  "${COMPOSE_BIND_ADDRESS}" \
  "${OPENSIN_IMAGE_REPOSITORY}" \
  "${PUBLIC_HEALTH_URL}" <<'REMOTE_SCRIPT'
set -Eeuo pipefail

remote_repo_input="$1"
deploy_branch="$2"
compose_service="$3"
compose_port="$4"
compose_bind_address="$5"
image_repository="$6"
public_health_url="$7"

if [[ "${remote_repo_input}" = /* ]]; then
  repo_dir="${remote_repo_input}"
else
  repo_dir="${HOME}/${remote_repo_input}"
fi

compose_dir="${repo_dir}/docker-opensin"
base_compose="${compose_dir}/docker-compose.yml"
production_compose="${compose_dir}/docker-compose.production.yml"

if [[ ! -d "${repo_dir}/.git" ]]; then
  echo "[deploy] ERROR: ${repo_dir} is not a Git repository." >&2
  exit 1
fi

if [[ ! -f "${base_compose}" || ! -f "${production_compose}" ]]; then
  echo "[deploy] ERROR: Docker Compose files are missing." >&2
  exit 1
fi

cd "${repo_dir}"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "[deploy] ERROR: Remote repository contains tracked modifications." >&2
  git status --short
  exit 1
fi

untracked_files="$(git ls-files --others --exclude-standard)"
if [[ -n "${untracked_files}" ]]; then
  echo "[deploy] ERROR: Remote repository contains untracked source files:" >&2
  printf '%s\n' "${untracked_files}" >&2
  exit 1
fi

echo "[deploy] Fetching origin/${deploy_branch}..."
git fetch --prune origin "${deploy_branch}"

target_sha="$(git rev-parse "origin/${deploy_branch}")"
short_sha="${target_sha:0:12}"

echo "[deploy] Target commit: ${target_sha}"

git checkout -B "${deploy_branch}" "origin/${deploy_branch}"
git reset --hard "${target_sha}"

export COMPOSE_PORT="${compose_port}"
export COMPOSE_BIND_ADDRESS="${compose_bind_address}"
export OPENSIN_IMAGE_REPOSITORY="${image_repository}"
export OPENSIN_IMAGE_TAG="${target_sha}"

compose=(
  docker compose
  --project-directory "${compose_dir}"
  -f "${base_compose}"
  -f "${production_compose}"
)

previous_container="$("${compose[@]}" ps -q "${compose_service}" || true)"
previous_image_id=""
rollback_tag=""

if [[ -n "${previous_container}" ]]; then
  previous_image_id="$(
    docker inspect \
      --format='{{.Image}}' \
      "${previous_container}" \
      2>/dev/null || true
  )"
fi

if [[ -n "${previous_image_id}" ]]; then
  rollback_tag="rollback-$(date +%Y%m%d-%H%M%S)"
  docker image tag \
    "${previous_image_id}" \
    "${image_repository}:${rollback_tag}"

  echo "[deploy] Rollback image: ${image_repository}:${rollback_tag}"
fi

wait_for_health() {
  local attempts="${1:-60}"
  local health_url="http://127.0.0.1:${compose_port}/api/ping"

  for ((attempt = 1; attempt <= attempts; attempt++)); do
    payload="$(
      curl \
        --fail \
        --silent \
        --show-error \
        --max-time 5 \
        "${health_url}" \
        2>/dev/null || true
    )"

    if grep -Eq \
      '"online"[[:space:]]*:[[:space:]]*true' \
      <<<"${payload}"; then
      echo "[deploy] Internal health check passed."
      return 0
    fi

    echo "[deploy] Waiting for health (${attempt}/${attempts})..."
    sleep 2
  done

  return 1
}

rollback() {
  local original_exit="$?"
  trap - ERR

  echo "[deploy] Deployment failed." >&2

  if [[ -n "${rollback_tag}" ]]; then
    echo "[deploy] Rolling back to ${image_repository}:${rollback_tag}..." >&2

    export OPENSIN_IMAGE_TAG="${rollback_tag}"

    "${compose[@]}" up \
      -d \
      --no-build \
      --no-deps \
      "${compose_service}"

    if wait_for_health 45; then
      echo "[deploy] Rollback completed successfully." >&2
    else
      echo "[deploy] CRITICAL: rollback health check failed." >&2
    fi
  else
    echo "[deploy] No previous image was available for rollback." >&2
  fi

  exit "${original_exit}"
}

trap rollback ERR

echo "[deploy] Building immutable image ${image_repository}:${target_sha}..."

"${compose[@]}" build \
  --pull \
  "${compose_service}"

echo "[deploy] Starting image ${image_repository}:${target_sha}..."

"${compose[@]}" up \
  -d \
  --no-deps \
  "${compose_service}"

wait_for_health 60

if [[ -n "${public_health_url}" ]]; then
  echo "[deploy] Checking public endpoint..."

  public_payload="$(
    curl \
      --fail \
      --silent \
      --show-error \
      --max-time 20 \
      "${public_health_url}"
  )"

  grep -Eq \
    '"online"[[:space:]]*:[[:space:]]*true' \
    <<<"${public_payload}"

  echo "[deploy] Public health check passed."
fi

running_container="$("${compose[@]}" ps -q "${compose_service}")"
running_image="$(
  docker inspect \
    --format='{{.Config.Image}}' \
    "${running_container}"
)"

trap - ERR

echo "[deploy] Deployment successful."
echo "[deploy] Commit: ${target_sha}"
echo "[deploy] Image: ${running_image}"
echo "[deploy] Short SHA: ${short_sha}"
REMOTE_SCRIPT
