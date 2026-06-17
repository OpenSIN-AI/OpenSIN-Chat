# OpenSIN-Chat — Incident Response Playbook

> Single source of truth for "service is down, what now?"
> Entry script: `scripts/oci-vm-bootstrap/emergency-recover.sh`
> Bootstrap script: `scripts/oci-vm-bootstrap/bootstrap.sh`

This document is the canonical answer to any incident on `sinchat.delqhi.com`
(Cloudflare Tunnel + OCI VM + OpenSIN-Chat container). It is meant to be
read by humans AND by agents. Every step is copy-pasteable.

---

## TL;DR — full recovery in 1 command

From the operator's laptop, run:

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/emergency-recover.sh
```

If that fails, follow the **[Manual Recovery](#manual-recovery)** section.

---

## 1. Detect — what is the actual symptom?

| HTTP / behaviour | Likely root cause | Jump to |
|---|---|---|
| `Error 1033` "Cloudflare is currently unable to resolve it" | Tunnel down — `cloudflared` not running on the OCI VM | § Manual Recovery |
| `Error 521` "Web server is down" | Tunnel up, but `sin-code` container dead | § Backend recovery |
| `Error 522` "Connection timed out" | Tunnel packets dropped, OCI VM network down | OCI Console |
| `Error 523` "Origin is unreachable" | Tunnel up, container up, but hostname / port mismatch | § Backend recovery |
| `Error 1000` "DNS points to prohibited IP" | DNS record changed to non-Cloudflare IP | Cloudflare DNS |

Each mapping uses the official Cloudflare error-code list
(https://developers.cloudflare.com/support/troubleshooting/http-status-codes/).

---

## 2. SSH access — connection metadata

The OCI VM that fronts sinchat is known as **`sin-blackbox`** in `~/.ssh/config`.

| Field | Value |
|---|---|
| Canonical host alias | `sin-blackbox` |
| Public IP | **92.5.116.158** |
| SSH user | `ubuntu` |
| Primary SSH key | `~/.ssh/id_ed25519` (ed25519) |
| OCI SDK API key (NOT an SSH key) | `~/.ssh/oci-vm3` (RSA, comment `oci-api-recovery-20251228`) — used by `oci compute` SDK to start/stop/list instances, NOT for SSH-ing into any VM |
| Aura-Call VM SSH key | `~/.ssh/aura-call-vm-key` |
| Cloudflared cert | `~/.cloudflared/cert.pem` |
| Latest tunnel creds | `ls -t ~/.cloudflared/*.json \| head -1` (one is currently `daa59c37-b503-4a35-8b6d-60fbf2a755e4.json`) |
| Infisical workspace | `fa7758b4-f84c-4297-966e-710056d531ef` @ `https://eu.infisical.com/api` |

Backup VM (different host, different app — DO NOT recover sinchat here):
- `Aura-Call` at `92.5.30.252` (Aura-Call telephony app)

---

## 3. Healthy state checklist

A working `sinchat.delqhi.com` VM has all of these green:

- `systemctl is-active cloudflared`              → `active`
- `systemctl is-active cloudflared-watchdog`     → `active`
- `systemctl list-timers sinchat-healthcheck.timer` → shows next run ~5 min from now
- `journalctl -u cloudflared --since='-5 min'`    → no errors
- `curl -I https://sinchat.delqhi.com/`          → `HTTP 2xx` or `HTTP 3xx`
- `dig sinchat.delqhi.com CNAME`                 → `sinchat.delqhi.com.cdn.cloudflare.net.`

---

## 4. Manual Recovery — copy-paste

### 4.1 Verify SSH works (safe, non-destructive)

```bash
ssh -o ConnectTimeout=8 -o BatchMode=yes sin-blackbox \
  'systemctl is-active cloudflared'
```

- `active` → cloudflared is up. The 1033 error is elsewhere (Cloudflare dashboard, DNS, TTL). Skip to §4.4.
- `inactive` / `failed` / `unknown` → cloudflared is the issue. Continue with §4.2.
- Permission denied / Connection refused / timed out → VM or network is the issue. Jump to §4.5.

### 4.2 Restart cloudflared (it has a watchdog but maybe watchdog is dead too)

```bash
ssh sin-blackbox 'sudo systemctl restart cloudflared && sleep 4 && systemctl is-active cloudflared'
```

If still down: see `emergency-recover.sh` step 3 (re-install the systemd unit if missing) and step 4 (push the tunnel `.json` credential).

### 4.3 If cloudflared's systemd unit is missing or broken

Run the bootstrap script:

```bash
bash /Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/bootstrap.sh
```

This transfers the systemd units + scripts from the OpenSIN-Chat repo and installs them on the VM.

### 4.4 Tunnel up but origin returns 5xx

```bash
ssh sin-blackbox 'docker ps --format "{{.Names}}\t{{.Status}}" | grep -E "opensin|server"'
# if no container: ssh sin-blackbox 'cd /opt/opensin && docker compose up -d'
# if container running but unhealthy: ssh sin-blackbox 'docker logs --tail=100 opensin-server'
```

### 4.5 SSH itself fails

Escalate to the OCI Console (`cloud.oracle.com` → Compute → Instances):

1. Confirm instance `sin-blackbox` is **RUNNING** (not STOPPED).
2. If STOPPED: Start it. The public IP `92.5.116.158` is preserved.
3. If TERMINATED: you lost state. Re-run `bootstrap.sh` on a *new* OCI instance.
4. Rebind the public IP to the new instance if Oracle assigned a different one.

---

## 5. Proactive monitors (already shipped)

| Unit | Purpose | Catches |
|---|---|---|
| `cloudflared-watchdog.service` | Restarts cloudflared on crash (rate-limited) | cloudflared SW crashes |
| `sinchat-healthcheck.{service,timer}` | Probes public URL every 5 min | network issues, dead container |
| `n8n/sinchat-uptime.json` | External schedule + Slack alert | VM-down cases the in-VM timer can't see |

If you install the bootstrap script on a fresh VM, you get all three at once.

---

## 6. Infisical secrets reference

All secrets needed for `sinchat.delqhi.com`:

| What | Stored where |
|---|---|
| Cloudflare tunnel credentials (`<UUID>.json`) | `~/.cloudflared/` on operator laptop + `/etc/cloudflared/` on VM |
| Cloudflare cert (`cert.pem`) | `~/.cloudflared/cert.pem` on operator laptop |
| Domain registrar DNS | Namecheap — see `<SSH-CONFIG>.contabo.com` in repo |
| Sentry DSN | Infisical `/SENTRY_DSN` |
| OCI API keys (for VM create/destroy automation) | `~/.oci/` (config + PEM) |

**NEVER** paste these into chat, commit messages, `ps`-visible env vars,
GitHub issues, or any tool output. If a paste happens anyway, treat
that token as leaked and **revoke + reissue**. Use `scp` to move them.

---

## 7. After recovery — preventive checklist

After the tunnel is back:

1. Verify all three monitors are present (`emergency-recover.sh` does this in step 5).
2. Read `journalctl -u cloudflared --since='-5 min'` to be sure no errors are lingering.
3. Hit `https://sinchat.delqhi.com/` from a phone (mobile network) to test end-to-end.
4. Update `AGENTS.md` (this repo) with any new lessons learned.
5. Add the incident to project memory via `sin-memory add`.

---

## 8. Authorship + lineage

This document was created on 2026-06-17 after the
"Don't-know-what-else-to-do" outage where the user opened error 1033,
discovered that:

- the cloudflared systemd unit had silently died
- no external monitor was watching
- the recovery was impossible without local-creds knowledge

This runbook is the codified answer to prevent that exact panic
from happening again.
