#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# cloudflared-watchdog.sh — supervisor that keeps cloudflared alive on the
# OCI VM. Restarts it via systemctl if it dies, and rate-limits to 10
# restarts per 10-min window so a broken host never burns CPU in a loop.
#
# Designed to run as a systemd service (Type=simple, Restart=always) so the
# Linux kernel also restarts THIS watchdog if it ever dies.

set -u

CHECK_INTERVAL_SECONDS=30
MAX_RESTARTS=10
RESTART_WINDOW_SECONDS=600   # 10 min sliding window

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" \
    >> /var/log/cloudflared-watchdog.log
}

is_active() {
  systemctl is-active --quiet cloudflared
}

# Rebuild the restart timestamp queue, keeping only entries within the
# sliding window. Appends $1 (a unix timestamp) at the end.
# Sets global RETRY_COUNT and LAST_CLEAR via simple text file (avoiding
# bash 4.4+ sparse-array footguns).
record_and_should_restart() {
  local now="$1"
  local file="/var/run/cloudflared-watchdog.restarts"
  local cutoff=$((now - RESTART_WINDOW_SECONDS))

  # Drop expired entries (newline-delimited timestamps).
  if [ -f "$file" ]; then
    local tmp
    tmp="$(mktemp)"
    while IFS= read -r ts; do
      [ -n "$ts" ] && [ "$ts" -gt "$cutoff" ] && printf '%s\n' "$ts" >> "$tmp"
    done < "$file"
    mv "$tmp" "$file"
  fi

  local count
  count=$(wc -l < "$file" 2>/dev/null | tr -d ' ' || echo 0)

  if [ "$count" -ge "$MAX_RESTARTS" ]; then
    log "RATE-LIMIT: $count restarts within ${RESTART_WINDOW_SECONDS}s — backing off. Manual intervention required."
    return 1
  fi

  printf '%s\n' "$now" >> "$file"
  return 0
}

restart_cloudflared() {
  if ! record_and_should_restart "$(date +%s)"; then
    return 1
  fi
  log "cloudflared is down — invoking: systemctl restart cloudflared"
  systemctl restart cloudflared
  sleep 5
  if is_active; then
    log "cloudflared restarted successfully"
    return 0
  else
    log "cloudflared still down after restart (status: $(systemctl is-active cloudflared))"
    return 1
  fi
}

log "watchdog started (PID=$$)"

while true; do
  if ! is_active; then
    restart_cloudflared || true
  fi
  sleep "$CHECK_INTERVAL_SECONDS"
done
