#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# emergency-recover.sh — when sinchat.delqhi.com throws Cloudflare Error
# 1033 ("Cloudflare is currently unable to resolve it"), do EXACTLY these
# steps in order. Designed to be run by the operator (NOT the agent
# environment) because the agent sandbox cannot SSH.
#
# Goal: bring tunnel up in under 60 seconds without nuking state.
#
# Usage:  bash scripts/oci-vm-bootstrap/emergency-recover.sh
#         bash scripts/oci-vm-bootstrap/emergency-recover.sh --tunnel daa59c37-b503-4a35-8b6d-60fbf2a755e4
#
# Exit codes:
#   0  tunnel reachable from outside
#   1  SSH unreachable (network/DNS/VM down)
#   2  cloudflared not running after interventions
#   3  tunnel returned non-2xx from outside (probably config mismatch)

set -eu

SSH_HOST="${SSH_HOST:-$(grep -E '^Host\s+(sin-blackbox|sin-chatbox|sinchat)' ~/.ssh/config 2>/dev/null | awk '{print $2}' | head -1)}"
TUNNEL="${1:-}"

if [ -z "$SSH_HOST" ]; then
  echo "FATAL: cannot detect SSH host. Pass --ssh-host=sin-blackbox." >&2
  exit 1
fi
echo "[recover] ssh host: $SSH_HOST"

# ------------------------------------------------------------------
# Step 1 — is the VM itself reachable?
# ------------------------------------------------------------------
echo "[recover] step 1/5: VM reachable?"
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SSH_HOST" 'echo pong' >/dev/null; then
  echo "  VM not reachable — escalate to OCI Console (cloud.oracle.com)"
  echo "   - confirm VM 'sin-blackbox' is RUNNING (not STOPPED)"
  echo "   - if STOPPED: Start it; the public IP is preserved"
  echo "   - if TERMINATED: you lost state; re-run oci-vm-bootstrap.sh on a new VM"
  exit 1
fi
echo "  ✓ VM reachable"

# ------------------------------------------------------------------
# Step 2 — is cloudflared installed?
# ------------------------------------------------------------------
echo "[recover] step 2/5: cloudflared binary"
if ! ssh "$SSH_HOST" 'command -v cloudflared >/dev/null'; then
  echo "  cloudflared not installed — installing"
  ssh "$SSH_HOST" 'set -eux
    ARCH=$(uname -m | sed s/aarch64/arm64/ | sed s/x86_64/amd64/)
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}.deb" -o /tmp/cfd.deb
    sudo dpkg -i /tmp/cfd.deb
    cloudflared --version
  '
fi

# ------------------------------------------------------------------
# Step 3 — does the systemd unit exist?
# ------------------------------------------------------------------
echo "[recover] step 3/5: cloudflared systemd unit"
ssh "$SSH_HOST" 'test -f /etc/systemd/system/cloudflared.service && echo OK || (
  sudo tee /etc/systemd/system/cloudflared.service >/dev/null <<EOF
[Unit]
Description=cloudflared
After=network.target

[Service]
Type=simple
User=ubuntu
ExecStart=/usr/local/bin/cloudflared --no-autoupdate tunnel run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
)'
ssh "$SSH_HOST" 'sudo systemctl enable cloudflared.service'

# ------------------------------------------------------------------
# Step 4 — is the config + creds file present?
# ------------------------------------------------------------------
echo "[recover] step 4/5: /etc/cloudflared/{config.yml,TUNNEL_ID.json}"
if [ -z "$TUNNEL" ]; then TUNNEL="$(ls -t ~/.cloudflared/*.json 2>/dev/null | grep -v cert.pem | head -1 | xargs basename 2>/dev/null | sed 's/\.json$//')"; fi
if [ -z "$TUNNEL" ]; then
  echo "  no tunnel creds found locally. Either:"
  echo "   - create new tunnel: cloudflared tunnel login && cloudflared tunnel create sinchat"
  echo "   - or copy from another backup VM"
  exit 2
fi

if ! ssh "$SSH_HOST" "test -f /etc/cloudflared/${TUNNEL}.json"; then
  ssh "$SSH_HOST" "sudo mkdir -p /etc/cloudflared"
  scp "$HOME/.cloudflared/${TUNNEL}.json" "${SSH_HOST}:/etc/cloudflared/${TUNNEL}.json"
  ssh "$SSH_HOST" "sudo chmod 600 /etc/cloudflared/${TUNNEL}.json"
fi

ssh "$SSH_HOST" "test -f /etc/cloudflared/config.yml || \
  sudo tee /etc/cloudflared/config.yml >/dev/null <<EOF
tunnel: ${TUNNEL}
credentials-file: /etc/cloudflared/${TUNNEL}.json
ingress:
  - hostname: sinchat.delqhi.com
    service: http://localhost:3001
  - service: http_status:404
EOF
"

# ------------------------------------------------------------------
# Step 5 — start cloudflared, verify external reach
# ------------------------------------------------------------------
echo "[recover] step 5/5: start + verify external reach"
ssh "$SSH_HOST" 'sudo systemctl restart cloudflared || sudo systemctl start cloudflared
  sleep 6
  systemctl is-active cloudflared && echo CLOUDFLARED_OK
'
echo "  probing https://sinchat.delqhi.com/ from outside..."
if curl -sS -o /dev/null -w "HTTP %{http_code}\n" -m 15 https://sinchat.delqhi.com/ | grep -q '^[H]TTP 2[0-9][0-9]\|HTTP 3[0-9][0-9]'; then
  echo "  ✓ tunnel is reachable externally. sinchat.delqhi.com is back."
  echo "  NEXT: run scripts/oci-vm-bootstrap/bootstrap.sh to install the watchdog"
  echo "         so we never have to do this by hand again."
  exit 0
else
  echo "  ✗ tunnel not reachable externally."
  echo "    Try: ssh $SSH_HOST 'journalctl -u cloudflared -n 50 --no-pager'"
  exit 3
fi
