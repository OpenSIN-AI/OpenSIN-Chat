#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
# Purpose: Legacy fail-closed systemd service recovery helper.
# Private host, user, key, service, and health URL values must come from the
# operator environment or an ignored file under .local/operations/.

set -Eeuo pipefail

required=(TARGET_HOST TARGET_SYSTEMD_SERVICE TARGET_HEALTH_URL)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "[recover] ERROR: ${name} is required." >&2
    exit 2
  fi
done

TARGET_USER="${TARGET_USER:-}"
TARGET_KEY="${TARGET_KEY:-}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

ssh_target="${TARGET_HOST}"
[[ -n "${TARGET_USER}" ]] && ssh_target="${TARGET_USER}@${TARGET_HOST}"

ssh_args=(-o BatchMode=yes -o ConnectTimeout=10)
if [[ -n "${TARGET_KEY}" ]]; then
  [[ -f "${TARGET_KEY}" ]] || {
    echo "[recover] ERROR: TARGET_KEY does not exist." >&2
    exit 2
  }
  ssh_args+=(-i "${TARGET_KEY}")
fi

run() {
  if [[ "${DRY_RUN}" == 1 ]]; then
    printf '[dry-run]'
    printf ' %q' "$@"
    printf '\n'
  else
    "$@"
  fi
}

run ssh "${ssh_args[@]}" "${ssh_target}" true
run ssh "${ssh_args[@]}" "${ssh_target}" \
  sudo systemctl restart "${TARGET_SYSTEMD_SERVICE}"
run ssh "${ssh_args[@]}" "${ssh_target}" \
  systemctl is-active --quiet "${TARGET_SYSTEMD_SERVICE}"
run curl --fail --silent --show-error --max-time 15 "${TARGET_HEALTH_URL}" \
  --output /dev/null

printf '[recover] configured service recovery verification passed\n'
