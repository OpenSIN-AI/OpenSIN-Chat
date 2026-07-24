#!/usr/bin/env bash
# SPDX-License-Identifier: MIT

set -eu

SERVICE_NAME="com.opensintunnel.healthcheck"
TIMER_NAME="com.opensintunnel.healthcheck"
SCRIPT_NAME="tunnel-health-check-launchd.sh"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

SYSTEMD_DIR="/etc/systemd/system"
OPT_DIR="/opt/opensin"
LOG_FILE="/var/log/opensin-tunnel-health.log"
STATE_DIR="/var/run/opensin-tunnel-healthcheck"

if [ "$(uname -s)" != "Linux" ]; then
  echo "ERROR: This installer is for Linux (systemd). Detected: $(uname -s)"
  echo "On macOS, use launchd plist instead."
  exit 1
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "ERROR: Run with sudo: sudo $0"
  exit 1
fi

echo "=== OpenSIN Tunnel Health Check — systemd installer ==="
echo

echo "[1/7] Creating $OPT_DIR ..."
mkdir -p "$OPT_DIR"

echo "[2/7] Installing health check script ..."
install -m 755 "$SCRIPT_DIR/$SCRIPT_NAME" "$OPT_DIR/$SCRIPT_NAME"

echo "[3/7] Installing systemd unit files ..."
install -m 644 "$SCRIPT_DIR/$SERVICE_NAME.service" "$SYSTEMD_DIR/$SERVICE_NAME.service"
install -m 644 "$SCRIPT_DIR/$TIMER_NAME.timer" "$SYSTEMD_DIR/$TIMER_NAME.timer"

echo "[4/7] Creating log file and state directory ..."
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
mkdir -p "$STATE_DIR"
chmod 755 "$STATE_DIR"

echo "[5/7] Removing old cron entries for tunnel health check ..."
CRON_MATCHED=0
if crontab -l 2>/dev/null | grep -qiE 'tunnel|cloudflared|sinchat.*health|opensin.*health'; then
  crontab -l 2>/dev/null | grep -viE 'tunnel|cloudflared|sinchat.*health|opensin.*health' | crontab -
  CRON_MATCHED=1
  echo "  Removed tunnel/cloudflared/sinchat-health cron entries."
else
  echo "  No tunnel-related cron entries found — nothing to remove."
fi

echo "[6/7] Reloading systemd and enabling timer ..."
systemctl daemon-reload
systemctl enable "$TIMER_NAME.timer"
systemctl start "$TIMER_NAME.timer"

echo "[7/7] Verifying installation ..."
echo
echo "--- Timer status ---"
systemctl status "$TIMER_NAME.timer" --no-pager 2>/dev/null || true
echo
echo "--- Timer schedule ---"
systemctl list-timers "$TIMER_NAME.timer" --no-pager 2>/dev/null || true
echo
echo "--- Service unit file ---"
systemctl cat "$SERVICE_NAME.service" --no-pager 2>/dev/null || true
echo

echo "=== Installation complete ==="
echo
echo "Log file:       $LOG_FILE"
echo "Check interval: 30 seconds (OnUnitActiveSec=30s)"
echo
echo "The new unified health check replaces both:"
echo "  - cloudflared-watchdog (process poll + restart)"
echo "  - sinchat-healthcheck.timer (5-min URL probe)"
echo
echo "To disable the old units (optional, the new one supersedes them):"
echo "  sudo systemctl disable --now cloudflared-watchdog.service"
echo "  sudo systemctl disable --now sinchat-healthcheck.timer"
echo
echo "To test manually:"
echo "  sudo systemctl start $SERVICE_NAME.service"
echo "  sudo journalctl -u $SERVICE_NAME.service -n 20 --no-pager"
echo "  tail -f $LOG_FILE"
