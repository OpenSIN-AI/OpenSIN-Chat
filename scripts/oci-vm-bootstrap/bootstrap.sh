#!/usr/bin/env bash
# SPDX-License-Identifier: MIT
#
# oci-vm-bootstrap.sh — one-shot installer that brings a freshly reimaged
# (or never-configured) OCI VM for sinchat.delqhi.com up to production-ready:
#
#   1. cloudflared system service installed + started
#   2. cloudflared-watchdog supervisor running (auto-restart on crash)
#   3. sinchat-healthcheck systemd timer running (5-min probe + alert)
#   4. /etc/opensin/healthcheck.env template written
#   5. cloudflared status verified, tunnel reachable
#
# Designed to be run from the OPERATOR's laptop (NOT from inside the agent
# sandbox). Reads SSH target from ~/.ssh/config (`sin-blackbox` alias).
#
# Usage:
#   bash scripts/oci-vm-bootstrap/bootstrap.sh
#   bash scripts/oci-vm-bootstrap/bootstrap.sh --ssh-host sin-blackbox --dry-run
#   bash scripts/oci-vm-bootstrap/bootstrap.sh \
#       --ssh-host sin-blackbox \
#       --cloudflared-tunnel-id daa59c37-b503-4a35-8b6d-60fbf2a755e4 \
#       --ntfy-topic opensin-alerts-PRIVATE-HASH
#
# Environment overrides:
#   SSH_HOST          default auto-detect sin-blackbox (or sin-chatbox, etc.)
#   CLOUDFLARED_TUNNEL default auto-detect latest non-archived json in ~/.cloudflared/

set -eu

# --- argument parsing ----------------------------------------------------
SSH_HOST="${SSH_HOST:-}"
CLOUDFLARED_TUNNEL="${CLOUDFLARED_TUNNEL:-}"
NTFY_TOPIC="${NTFY_TOPIC:-}"
DRY_RUN=0
VERBOSE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --ssh-host=*)           SSH_HOST="${1#*=}" ;;
    --ssh-host)             SSH_HOST="$2"; shift ;;
    --cloudflared-tunnel-id=*) CLOUDFLARED_TUNNEL="${1#*=}" ;;
    --cloudflared-tunnel-id)   CLOUDFLARED_TUNNEL="$2"; shift ;;
    --ntfy-topic=*)         NTFY_TOPIC="${1#*=}" ;;
    --ntfy-topic)           NTFY_TOPIC="$2"; shift ;;
    --dry-run)              DRY_RUN=1 ;;
    -v|--verbose)           VERBOSE=1 ;;
    --help|-h)
      sed -n '2,30p' "$0"
      exit 0 ;;
    *)  echo "unknown flag: $1" >&2; exit 2 ;;
  esac; shift
done

log() { printf '[bootstrap] %s\n' "$*"; }
dry() { if [ "$DRY_RUN" = 1 ]; then printf '\033[36m[dry]\033[0m → %s\n' "$*"; else eval "$@"; fi; }

# --- auto-detect SSH host -------------------------------------------------
if [ -z "$SSH_HOST" ]; then
  SSH_HOST="$(awk '/^[Hh]ost\s/{h=$2} /Hostname/{print h" → "$2; exit}' ~/.ssh/config 2>/dev/null | awk -F' → ' '$2 ~ /[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/ || /lightning/ {print $1}')"
  # Fallback: look for any Host ending with "sin-blackbox" / "chatbox" / "sinchat"
  if [ -z "$SSH_HOST" ]; then
    SSH_HOST="$(grep -E '^Host\s+.*sin' ~/.ssh/config 2>/dev/null | awk '{print $2}' | head -1)"
  fi
  if [ -z "$SSH_HOST" ]; then
    echo "could not auto-detect SSH host. Pass --ssh-host=sin-blackbox." >&2
    exit 3
  fi
fi
log "SSH host: $SSH_HOST"

# --- verify SSH non-destructive -----------------------------------------
log "probing SSH access..."
if ! ssh -o ConnectTimeout=8 -o BatchMode=yes "$SSH_HOST" 'echo ok >/dev/null; systemctl is-active cloudflared' 2>&1; then
  echo "SSH probe failed — cannot reach $SSH_HOST via the configured keys." >&2
  echo "Check ~/.ssh/config and key permissions (id_* must be mode 600)." >&2
  exit 4
fi

# --- auto-detect cloudflared tunnel -------------------------------------
if [ -z "$CLOUDFLARED_TUNNEL" ]; then
  CLOUDFLARED_TUNNEL="$(ls -t ~/.cloudflared/*.json 2>/dev/null \
    | grep -v 'cert.pem' | xargs -n1 basename 2>/dev/null \
    | sed -E 's/\.json$//' | grep -E '^[0-9a-f-]{36}$' | head -1 || true)"
fi
log "tunnel: ${CLOUDFLARED_TUNNEL:-<please set CLOUDFLARED_TUNNEL_ID below>}"

REPO="${REPO:-$(git -C "$(dirname "$0")/.." remote get-url origin 2>/dev/null \
  | sed -E 's#.*[:/]([^/]+/[^/]+)\.git#\1#' || echo opensin-chat)}"
log "repo: $REPO"

# --- transfer files ------------------------------------------------------
VM_FILES=/opt/opensin
log "transferring systemd units + scripts from $REPO to ${SSH_HOST}:${VM_FILES}"

remote_cp() {
  local src="$1" dst="$2"
  if [ "$DRY_RUN" = 1 ]; then
    printf '\033[36m[dry]\033[0m scp %s %s:%s\n' "$src" "$SSH_HOST" "$dst"
  else
    scp "$src" "${SSH_HOST}:${dst}"
  fi
}

remote_install() {
  local svc="$1" timer="${2:-}"
  if [ "$DRY_RUN" = 1 ]; then
    printf '\033[36m[dry]\033[0m ssh %s install %s\n' "$SSH_HOST" "$svc"
  else
    ssh "$SSH_HOST" "set -eux
      sudo install -m 644 /tmp/${svc##*/} /etc/systemd/system/${svc##*/}
      [ -n \"$timer\" ] && sudo install -m 644 /tmp/${timer##*/} /etc/systemd/system/${timer##*/}
      sudo systemctl daemon-reload
      sudo systemctl enable --now ${svc}
      [ -n \"$timer\" ] && sudo systemctl enable --now ${timer}
      sudo systemctl status --no-pager ${svc} | head -10
    "
  fi
}

# Stage locally copy
TMP=$(mktemp -d -t opensin-bootstrap)
trap 'rm -rf "$TMP"' EXIT
cp "$(dirname "$0")/../cloudflared-watchdog/cloudflared-watchdog.sh"        "$TMP/"
cp "$(dirname "$0")/../cloudflared-watchdog/cloudflared-watchdog.service"   "$TMP/"
cp "$(dirname "$0")/../sinchat-healthcheck/sinchat-healthcheck.sh"          "$TMP/"
cp "$(dirname "$0")/../sinchat-healthcheck/sinchat-healthcheck.service"     "$TMP/"
cp "$(dirname "$0")/../sinchat-healthcheck/sinchat-healthcheck.timer"        "$TMP/"

# Push to /tmp/ on the VM, then ssh installs from there
for f in "$TMP"/*; do
  base="$(basename "$f")"
  remote_cp "$f" "/tmp/${base}"
done

# also copy the runtime scripts to /opt/opensin/
[ "$DRY_RUN" = 1 ] || \
  ssh "$SSH_HOST" "sudo mkdir -p ${VM_FILES} && sudo chown \$USER:\$USER ${VM_FILES} && \
    sudo cp /tmp/cloudflared-watchdog.sh /tmp/sinchat-healthcheck.sh ${VM_FILES}/ && \
    sudo chmod 755 ${VM_FILES}/cloudflared-watchdog.sh ${VM_FILES}/sinchat-healthcheck.sh"

# --- install systemd units ----------------------------------------------
remote_install cloudflared-watchdog.service ''
remote_install sinchat-healthcheck.service         sinchat-healthcheck.timer

# --- write /etc/opensin/healthcheck.env --------------------------------
log "writing /etc/opensin/healthcheck.env (template)"
ESCAPED_TOPIC="${NTFY_TOPIC:-REPLACE-WITH-PRIVATE-NTFY-TOPIC}"
dry "ssh $SSH_HOST 'sudo mkdir -p /etc/opensin && printf \"HEALTHCHECK_TARGET=https://sinchat.delqhi.com/\\nNTFY_BASE=https://ntfy.sh\\nNTFY_TOPIC=$ESCAPED_TOPIC\\nNTFY_TOKEN=\\nHEALTHCHECKS_URL=\\n\" | sudo tee /etc/opensin/healthcheck.env >/dev/null && sudo chmod 600 /etc/opensin/healthcheck.env'"

# --- ensure cloudflared is alive ----------------------------------------
log "ensuring cloudflared is active"
dry "ssh $SSH_HOST 'sudo systemctl enable --now cloudflared.service || sudo systemctl restart cloudflared.service'"

# --- write /etc/cloudflared/config.yml if missing ----------------------
if [ -n "$CLOUDFLARED_TUNNEL" ]; then
  log "writing /etc/cloudflared/config.yml (tunnel=$CLOUDFLARED_TUNNEL)"
  dry "ssh $SSH_HOST 'sudo mkdir -p /etc/cloudflared && printf \"tunnel: $CLOUDFLARED_TUNNEL\\ncredentials-file: /etc/cloudflared/${CLOUDFLARED_TUNNEL}.json\\n\" | sudo tee /etc/cloudflared/config.yml >/dev/null'"
  # also push the cert.json
  remote_cp "$HOME/.cloudflared/${CLOUDFLARED_TUNNEL}.json" "/tmp/${CLOUDFLARED_TUNNEL}.json"
  dry "ssh $SSH_HOST 'sudo cp /tmp/${CLOUDFLARED_TUNNEL}.json /etc/cloudflared/ && sudo chmod 600 /etc/cloudflared/${CLOUDFLARED_TUNNEL}.json && sudo systemctl restart cloudflared'"
fi

# --- final verification -------------------------------------------------
log "post-install verification"
if [ "$DRY_RUN" = 1 ]; then
  printf '\033[36m[dry]\033[0m ssh %s verification\n' "$SSH_HOST"
else
  ssh "$SSH_HOST" 'set -eux
    echo "=== cloudflared ==="
    systemctl is-active cloudflared || true
    echo "=== cloudflared-watchdog ==="
    systemctl is-active cloudflared-watchdog || true
    echo "=== sinchat-healthcheck timer ==="
    systemctl list-timers sinchat-healthcheck.timer || true
    echo "=== last watchdog log line ==="
    tail -3 /var/log/cloudflared-watchdog.log 2>/dev/null || true
    echo "=== curl https://sinchat.delqhi.com/ ==="
    curl -sS -o /dev/null -w "HTTP %{http_code} in %{time_total}s\n" https://sinchat.delqhi.com/
  '
fi

log "done ✓"
[ "$DRY_RUN" = 1 ] && log "(dry run — no actual ssh scp/service changes were made)"
