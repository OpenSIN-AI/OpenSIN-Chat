#!/usr/bin/env bash
set -euo pipefail

TIMERS=(
  "cloudflared-watchdog"
  "sinchat-healthcheck"
  "sinchat-external-monitor"
  "backup-verify.timer"
)

for timer in "${TIMERS[@]}"; do
  STATUS=$(systemctl is-active "$timer" 2>/dev/null || echo "inactive")
  LAST_RUN=$(systemctl show "$timer" --property=LastTriggerUSecRealtime 2>/dev/null | cut -d= -f2)
  echo "$timer: $STATUS (last: $LAST_RUN)"
done

systemctl is-active cloudflared-opensin-chat 2>/dev/null && echo "cloudflared: active" || echo "cloudflared: INACTIVE"

docker ps --filter name=opensin-app --format "{{.Names}}: {{.Status}}" 2>/dev/null || echo "container: unable to check"

curl -s -o /dev/null -w "uptime-kuma: HTTP %{http_code}\n" https://status.delqhi.com 2>/dev/null || echo "uptime-kuma: unreachable"
