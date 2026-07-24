#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

set -u

CLOUDFLARED_SERVICE="${CLOUDFLARED_SERVICE:-cloudflared}"
TARGET_URL="${TARGET_URL:-https://sinchat.delqhi.com/}"
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"
RESTART_WAIT="${RESTART_WAIT:-5}"
LOG_FILE="${LOG_FILE:-/var/log/opensin-tunnel-health.log}"
STATE_DIR="${STATE_DIR:-/var/run/opensin-tunnel-healthcheck}"
MAX_RESTARTS="${MAX_RESTARTS:-10}"
RESTART_WINDOW="${RESTART_WINDOW:-600}"

mkdir -p "$STATE_DIR" 2>/dev/null || true
touch "$LOG_FILE" 2>/dev/null || true

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" >> "$LOG_FILE" 2>/dev/null || true
}

is_tunnel_running() {
  systemctl is-active --quiet "$CLOUDFLARED_SERVICE" 2>/dev/null
}

should_restart() {
  local now file cutoff count tmp ts
  now=$(date +%s)
  file="$STATE_DIR/restarts"
  cutoff=$((now - RESTART_WINDOW))

  if [ -f "$file" ]; then
    tmp=$(mktemp)
    while IFS= read -r ts; do
      [ -n "$ts" ] && [ "$ts" -gt "$cutoff" ] && printf '%s\n' "$ts" >> "$tmp"
    done < "$file"
    mv "$tmp" "$file"
  else
    : > "$file"
  fi

  count=$(wc -l < "$file" 2>/dev/null | tr -d ' ' || echo 0)

  if [ "$count" -ge "$MAX_RESTARTS" ]; then
    log "RATE-LIMIT: $count restarts within ${RESTART_WINDOW}s — backing off, manual intervention required"
    return 1
  fi

  printf '%s\n' "$now" >> "$file"
  return 0
}

restart_tunnel() {
  if ! should_restart; then
    return 1
  fi
  log "cloudflared is down — invoking: systemctl restart $CLOUDFLARED_SERVICE"
  systemctl restart "$CLOUDFLARED_SERVICE" 2>/dev/null
  sleep "$RESTART_WAIT"
  if is_tunnel_running; then
    log "cloudflared restarted successfully"
    return 0
  else
    log "cloudflared still down after restart (status: $(systemctl is-active "$CLOUDFLARED_SERVICE" 2>/dev/null))"
    return 1
  fi
}

probe_url() {
  local code
  code=$(curl -sS -o /dev/null -m "$CURL_TIMEOUT" -w '%{http_code}' \
    -L --retry 1 --retry-connrefused \
    "$TARGET_URL" 2>/dev/null || echo 000)
  case "$code" in
    2*|3*) return 0 ;;
    *) log "URL probe returned HTTP $code for $TARGET_URL"; return 1 ;;
  esac
}

main() {
  if ! is_tunnel_running; then
    log "CHECK: cloudflared process is DOWN"
    if ! restart_tunnel; then
      log "FAIL: could not restart cloudflared — exiting 1"
      exit 1
    fi
  else
    log "CHECK: cloudflared process is UP"
  fi

  if probe_url; then
    log "OK: $TARGET_URL responds (HTTP 2xx/3xx)"
    exit 0
  fi

  log "FAIL: $TARGET_URL not responding — cloudflared is running, attempting restart"
  if restart_tunnel; then
    sleep "$RESTART_WAIT"
    if probe_url; then
      log "OK: $TARGET_URL responds after tunnel restart"
      exit 0
    fi
  fi

  log "FAIL: $TARGET_URL still unreachable after all recovery attempts — exiting 1"
  exit 1
}

main "$@"
