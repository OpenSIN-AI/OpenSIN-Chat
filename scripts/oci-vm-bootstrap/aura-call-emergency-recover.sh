#!/usr/bin/env bash
# Purpose: Recovery one-shot for Aura-Call VM (92.5.30.252), parallel to sinchat emergency-recover.sh.
# Docs: ../skill-oci-oracle-cloud SKILL.md §10.x
# AUDIENCE: Operator on their Mac (NOT agent sandbox — Priority 20).
# USAGE: bash scripts/oci-vm-bootstrap/aura-call-emergency-recover.sh [--dry-run]

set -euo pipefail

SSH_ALIAS=""
SSH_IP="92.5.30.252"
SSH_USER="ubuntu"
SSH_KEY="$HOME/.ssh/aura-call-vm-key"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

log() { printf '%s\n' "[$(date +%FT%T%z)] $*"; }
err() { printf '%s\n' "[$(date +%FT%T%z)] $*" >&2; }
run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    log "[dry-run] would: $*"
  else
    log "running: $*"
    eval "$@"
  fi
}

# 1) preflight on operator machine
log "=== Aura-Call emergency-recover (VM 92.5.30.252) ==="
[ -f "$SSH_KEY" ] || { err "[err] SSH key missing: $SSH_KEY — check ~/.ssh/aura-call-vm-key?"; exit 1; }
[ "$(stat -f '%Lp' "$SSH_KEY")" = "600" ] || { err "[err] $SSH_KEY must be mode 0600 (current: $(stat -f '%Lp' "$SSH_KEY"))"; exit 1; }
log "OK  SSH key present + mode 0600"

# 2) Probe the VM (5 s timeout — agent priority 20 still applies: this is operator-Mac-only)
log "Probe TCP/22 connectivity …"
run "nc -z -w5 $SSH_IP 22 && echo reachable || echo unreachable"

# 3) On-VM checks: aura-call.service + journal tail
log "On-VM: systemctl status aura-call …"
run "ssh -o ConnectTimeout=5 -i $SSH_KEY $SSH_USER@$SSH_IP 'sudo systemctl is-active aura-call && sudo systemctl status aura-call --no-pager | head -15'"

# 4) Restart if down
log "On-VM: restart aura-call (safe only if up-version is dead) …"
run "ssh -o ConnectTimeout=5 -i $SSH_KEY $SSH_USER@$SSH_IP 'sudo systemctl restart aura-call 2>&1 || sudo systemctl start aura-call 2>&1 || true'"

# 5) On-VM disk check (the BUG-OCI-001 trigger pattern)
log "On-VM: df -h /  +  oci-space-guardian.sh if available …"
run "ssh -o ConnectTimeout=5 -i $SSH_KEY $SSH_USER@$SSH_IP 'df -h / | tail -2 && echo --- && sudo test -x /usr/local/bin/oci-space-guardian.sh && sudo /usr/local/bin/oci-space-guardian.sh || echo [info] oci-space-guardian not installed yet'"

# 6) Re-probe HTTP /api/docs (Aura-Call is exposed directly via public IP, NOT via Cloudflared)
log "HTTP probe: http://92.5.30.252/api/docs …"
run "curl -sS --max-time 8 http://$SSH_IP/api/docs -o /dev/null -w 'HTTP %{http_code}\\n' || true"

# 7) If healthy, suggest deploy-watchdog install
log "If still down: see SKILL.md §7.2 (Aura-Call setup) + run scripts/aura-call-watchdog-install.sh"
log "=== done — DH (sinchat mirror) ==="
log "Persistent prevention: scripts/aura-call-watchdog/ (parallel to sinchat watchdog)"
exit 0
