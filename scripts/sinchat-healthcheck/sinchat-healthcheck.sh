#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# sinchat-healthcheck.sh — pings sinchat.delqhi.com every N min via systemd
# timer, and alerts via:
#   1. ntfy.sh (push)            — if NTFY_TOPIC env is set
#   2. healthchecks.io ping      — if HEALTHCHECKS_URL env is set
#   3. local log + wall + mail   — always on failure
# Rate-limits to 3 consecutive failures → 1 alert, then quiet for 30 min
# so a transient flap doesn't blow up the alert channel.

set -u

TARGET="${HEALTHCHECK_TARGET:-https://sinchat.delqhi.com/}"
NTFY_BASE="${NTFY_BASE:-https://ntfy.sh}"
NTFY_TOPIC="${NTFY_TOPIC:-}"
NTFY_TOKEN="${NTFY_TOKEN:-}"
HEALTHCHECKS_URL="${HEALTHCHECKS_URL:-}"
STATE_DIR="${STATE_DIR:-/var/run/sinchat-healthcheck}"
LOG_FILE="${LOG_FILE:-/var/log/sinchat-healthcheck.log}"
ALERT_COOLDOWN_SECONDS="${ALERT_COOLDOWN_SECONDS:-1800}"   # 30 min

mkdir -p "$STATE_DIR"
touch "$LOG_FILE"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG_FILE"
}

notify_ntfy() {
  local title="$1" message="$2" priority="${3:-high}"
  [ -z "$NTFY_TOPIC" ] && return 0
  local url="$NTFY_BASE/$NTFY_TOPIC"
  local args=(-sS -H "Title: $title" -H "Priority: $priority" -d "$message")
  [ -n "$NTFY_TOKEN" ] && args+=(-H "Authorization: Bearer $NTFY_TOKEN")
  curl "${args[@]}" "$url" >/dev/null 2>&1 || true
}

ping_healthchecks() {
  local exit_status="$1"
  [ -z "$HEALTHCHECKS_URL" ] && return 0
  curl -sS -m 5 -o /dev/null \
    -w '' "$HEALTHCHECKS_URL/$exit_status" || true
}

should_alert() {
  local counter="$STATE_DIR/fail_streak"
  local last_alert="$STATE_DIR/last_alert_ts"
  local now
  now="$(date +%s)"
  local streak
  streak=$(cat "$counter" 2>/dev/null || echo 0)
  local last
  last=$(cat "$last_alert" 2>/dev/null || echo 0)
  # Alert only when streak crosses 3 AND not alerted within cooldown window.
  if [ "$streak" -ge 3 ] && [ $((now - last)) -gt "$ALERT_COOLDOWN_SECONDS" ]; then
    printf '%s' "$now" > "$last_alert"
    return 0
  fi
  return 1
}

reset_fails() {
  rm -f "$STATE_DIR/fail_streak"
}

record_fail() {
  local counter="$STATE_DIR/fail_streak"
  local n
  n=$(cat "$counter" 2>/dev/null || echo 0)
  : $((n += 1))
  printf '%s' "$n" > "$counter"
  cat "$counter"
}

# Probe the target. Returns 0 on HTTP 2xx/3xx, non-zero elsewhere.
probe() {
  local code
  code=$(curl -sS -o /dev/null -m 10 -w '%{http_code}' \
              -L --retry 1 --retry-connrefused \
              "$TARGET" 2>/dev/null || echo 000)
  case "$code" in
    2*|3*) return 0 ;;
    *) return 1 ;;
  esac
}

main() {
  if probe; then
    reset_fails
    ping_healthchecks 0
    log "OK 200 — $TARGET"
    exit 0
  fi

  local streak
  streak=$(record_fail)
  log "FAIL — $TARGET (consecutive failures: $streak)"

  ping_healthchecks 1

  if should_alert; then
    local msg="sinchat.delqhi.com health-check failed $streak times in a row"
    notify_ntfy "sinchat down" "$msg" high
    # Best-effort local wall. No-op on VMs with no TTY.
    echo "$msg" >> "$LOG_FILE"
    echo "$msg" | wall -n 2>/dev/null || true
    log "ALERT sent (ntfy + wall + log)"
  fi
  exit 1
}

main "$@"
