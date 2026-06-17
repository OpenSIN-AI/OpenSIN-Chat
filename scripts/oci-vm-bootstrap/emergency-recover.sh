#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# emergency-recover.sh — when sinchat.delqhi.com is down (1033/502/503),
# do EXACTLY these steps in order.
#
# Target: sin-supabase (92.5.60.87) — OpenSIN-Chat + cloudflared-opensin-chat
# (Previously targeted sin-blackbox — corrected 2026-06-17)
#
# Usage:  bash scripts/oci-vm-bootstrap/emergency-recover.sh
#
# Exit codes:
#   0  sinchat.delqhi.com reachable from outside (HTTP 2xx/3xx)
#   1  SSH unreachable (network/DNS/VM down)
#   2  OpenSIN-Chat container not running after interventions
#   3  tunnel returned non-2xx from outside

set -eu

SSH_HOST="${SSH_HOST:-sin-supabase}"

echo "[recover] ssh host: $SSH_HOST (sin-supabase / 92.5.60.87)"

# ------------------------------------------------------------------
# Step 1 — is the VM itself reachable?
# ------------------------------------------------------------------
echo "[recover] step 1/5: VM reachable?"
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" 'echo pong' >/dev/null 2>&1; then
  echo "  VM not reachable — escalate to OCI Console (cloud.oracle.com)"
  echo "   - confirm VM 'sin-supabase' is RUNNING (not STOPPED)"
  echo "   - if STOPPED: Start it; the public IP is preserved"
  echo "   - if TERMINATED: re-provision and redeploy OpenSIN-Chat"
  exit 1
fi
echo "  OK: VM reachable"

# ------------------------------------------------------------------
# Step 2 — is OpenSIN-Chat container running?
# ------------------------------------------------------------------
echo "[recover] step 2/5: OpenSIN-Chat container"
if ! ssh "$SSH_HOST" 'docker ps --format "{{.Names}}" | grep -q opensin-app'; then
  echo "  Container not running — starting..."
  ssh "$SSH_HOST" 'cd /home/ubuntu/OpenSIN-Chat/docker && docker compose -p opensin up -d --build opensin-chat'
  sleep 15
fi
if ! ssh "$SSH_HOST" 'docker ps --format "{{.Names}}" | grep -q opensin-app'; then
  echo "  FAIL: opensin-app still not running after start attempt"
  echo "  Check logs: ssh $SSH_HOST 'docker logs --tail 50 opensin-app'"
  exit 2
fi
echo "  OK: opensin-app running"

# ------------------------------------------------------------------
# Step 3 — is the container responding on localhost:38471?
# ------------------------------------------------------------------
echo "[recover] step 3/5: localhost:38471 health"
LOCAL_HTTP=$(ssh "$SSH_HOST" 'curl -sS -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:38471 2>/dev/null || echo 000')
echo "  localhost:38471 -> HTTP $LOCAL_HTTP"
if [ "$LOCAL_HTTP" = "000" ]; then
  echo "  Container not responding — restarting..."
  ssh "$SSH_HOST" 'docker restart opensin-app'
  sleep 10
  LOCAL_HTTP=$(ssh "$SSH_HOST" 'curl -sS -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:38471 2>/dev/null || echo 000')
  echo "  After restart: HTTP $LOCAL_HTTP"
  if [ "$LOCAL_HTTP" = "000" ]; then
    echo "  FAIL: container still not responding"
    exit 2
  fi
fi
echo "  OK: container responding (HTTP $LOCAL_HTTP)"

# ------------------------------------------------------------------
# Step 4 — is cloudflared-opensin-chat running?
# ------------------------------------------------------------------
echo "[recover] step 4/5: cloudflared-opensin-chat"
if ! ssh "$SSH_HOST" 'systemctl is-active --quiet cloudflared-opensin-chat'; then
  echo "  cloudflared-opensin-chat not active — restarting..."
  ssh "$SSH_HOST" 'sudo systemctl restart cloudflared-opensin-chat'
  sleep 5
fi
if ! ssh "$SSH_HOST" 'systemctl is-active --quiet cloudflared-opensin-chat'; then
  echo "  FAIL: cloudflared-opensin-chat still not active"
  echo "  Check: ssh $SSH_HOST 'journalctl -u cloudflared-opensin-chat -n 50 --no-pager'"
  exit 2
fi
echo "  OK: cloudflared-opensin-chat active"

# ------------------------------------------------------------------
# Step 5 — verify external reach
# ------------------------------------------------------------------
echo "[recover] step 5/5: external reachability"
echo "  probing https://sinchat.delqhi.com/ ..."
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -m 15 https://sinchat.delqhi.com/ 2>/dev/null || echo 000)
echo "  sinchat.delqhi.com -> HTTP $HTTP_CODE"
if echo "$HTTP_CODE" | grep -qE '^(2|3)[0-9][0-9]$'; then
  echo "  OK: sinchat.delqhi.com is back (HTTP $HTTP_CODE)"
  echo "  Watchdog + healthcheck timers should auto-recover future outages."
  exit 0
else
  echo "  FAIL: sinchat.delqhi.com still down (HTTP $HTTP_CODE)"
  echo "  Manual investigation needed:"
  echo "    ssh $SSH_HOST 'docker logs --tail 30 opensin-app'"
  echo "    ssh $SSH_HOST 'sudo journalctl -u cloudflared-opensin-chat -n 30 --no-pager'"
  echo "    ssh $SSH_HOST 'cat /home/ubuntu/.cloudflared/config-opensin.yml'"
  exit 3
fi
