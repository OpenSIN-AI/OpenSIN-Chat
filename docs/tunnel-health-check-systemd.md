# Tunnel Health-Check via systemd Timer (30 s Interval)

> PLAN.md Priority 4 — replaces cron-based health checks with a
> unified systemd timer that runs every 30 seconds.

---

## Why systemd instead of cron?

| Feature | cron | systemd timer |
|---|---|---|
| Minimum interval | 60 s | 1 s (we use 30 s) |
| Restart on crash | no | yes (`Restart=` / timer re-fire) |
| Logging | manual redirect | journald + file |
| Randomized jitter | no | `AccuracySec` / `RandomizedDelaySec` |
| Boot-time start | `@reboot` (unreliable) | `OnBootSec=` (after network) |
| Dependencies | none | `After=network-online.target` |

cron's minimum interval is 60 seconds. systemd's `OnUnitActiveSec`
can go down to 1 second. We set it to **30 s** — half the cron
minimum — so a tunnel crash is detected and recovered in under a
minute instead of up to 2 minutes.

---

## What it does

The unified health check (`tunnel-health-check-launchd.sh`) runs every
30 s via a systemd timer and performs **both** checks in one pass:

1. **Process check** — `systemctl is-active cloudflared`
   - If DOWN → restart via `systemctl restart cloudflared` (rate-limited
     to 10 restarts per 10-minute sliding window)
2. **URL probe** — `curl https://sinchat.delqhi.com/`
   - If the process is UP but the URL is unreachable → attempt a
     tunnel restart, then re-probe
3. **Logging** — all actions written to
   `/var/log/opensin-tunnel-health.log` with UTC timestamps
4. **Exit codes** — `0` on success, `1` on failure (visible in
   `systemctl status` and journald)

This replaces the previous two-unit setup:
- `cloudflared-watchdog.service` (process poll + restart)
- `sinchat-healthcheck.timer` (5-min URL probe, alert-only)

---

## Files

| Repo file | Installed path on VM |
|---|---|
| `scripts/com.opensintunnel.healthcheck.service` | `/etc/systemd/system/com.opensintunnel.healthcheck.service` |
| `scripts/com.opensintunnel.healthcheck.timer` | `/etc/systemd/system/com.opensintunnel.healthcheck.timer` |
| `scripts/tunnel-health-check-launchd.sh` | `/opt/opensin/tunnel-health-check-launchd.sh` (mode 755) |
| `scripts/install-launchd-healthcheck.sh` | (run once, not installed) |

Runtime artifacts on the VM:

| Path | Purpose |
|---|---|
| `/var/log/opensin-tunnel-health.log` | health check log (UTC timestamps) |
| `/var/run/opensin-tunnel-healthcheck/restarts` | rate-limit state (restart timestamps) |
| `/etc/opensin/tunnel-healthcheck.env` | optional env overrides (see below) |

---

## Installation

```bash
# On the VM (sin-supabase / sin-blackbox):
cd /path/to/OpenSIN-Chat
sudo bash scripts/install-launchd-healthcheck.sh
```

The installer:
1. Copies the script to `/opt/opensin/`
2. Copies the `.service` + `.timer` to `/etc/systemd/system/`
3. Creates the log file and state directory
4. Removes old cron entries matching `tunnel|cloudflared|sinchat.*health`
5. Runs `systemctl daemon-reload` + `enable --now` the timer
6. Prints verification output

### Optional: disable old units

The new unified check supersedes the old two-unit setup. After
installing, you can disable them:

```bash
sudo systemctl disable --now cloudflared-watchdog.service
sudo systemctl disable --now sinchat-healthcheck.timer
```

### Optional: env overrides

Create `/etc/opensin/tunnel-healthcheck.env` to override defaults:

```bash
CLOUDFLARED_SERVICE=cloudflared
TARGET_URL=https://sinchat.delqhi.com/
CURL_TIMEOUT=10
RESTART_WAIT=5
MAX_RESTARTS=10
RESTART_WINDOW=600
LOG_FILE=/var/log/opensin-tunnel-health.log
```

---

## Verification

```bash
# Check timer is active and scheduled
systemctl list-timers com.opensintunnel.healthcheck.timer

# Run a manual check
sudo systemctl start com.opensintunnel.healthcheck.service

# View the result
sudo systemctl status com.opensintunnel.healthcheck.service

# Follow the log
tail -f /var/log/opensin-tunnel-health.log

# View journald output
sudo journalctl -u com.opensintunnel.healthcheck.service -n 50 --no-pager
```

### Test: kill the tunnel and watch auto-recovery

```bash
# Stop cloudflared
sudo systemctl stop cloudflared

# Wait ~35 seconds for the health check to fire
sleep 35

# Verify it was restarted
systemctl is-active cloudflared    # → active

# Check the log
tail -5 /var/log/opensin-tunnel-health.log
# → [timestamp] CHECK: cloudflared process is DOWN
# → [timestamp] cloudflared is down — invoking: systemctl restart cloudflared
# → [timestamp] cloudflared restarted successfully
# → [timestamp] OK: https://sinchat.delqhi.com/ responds (HTTP 2xx/3xx)
```

---

## Uninstall

```bash
sudo systemctl disable --now com.opensintunnel.healthcheck.timer
sudo rm /etc/systemd/system/com.opensintunnel.healthcheck.{service,timer}
sudo rm /opt/opensin/tunnel-health-check-launchd.sh
sudo rm -f /var/log/opensin-tunnel-health.log
sudo rm -rf /var/run/opensin-tunnel-healthcheck
sudo systemctl daemon-reload
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│           systemd timer (30 s)                   │
│  com.opensintunnel.healthcheck.timer             │
│  OnUnitActiveSec=30s, AccuracySec=1s            │
└───────────────┬──────────────────────────────────┘
                │ fires
                ▼
┌──────────────────────────────────────────────────┐
│         systemd oneshot service                  │
│  com.opensintunnel.healthcheck.service           │
│  ExecStart=/opt/opensin/tunnel-health-check.sh   │
└───────────────┬──────────────────────────────────┘
                │ runs
                ▼
┌──────────────────────────────────────────────────┐
│         tunnel-health-check-launchd.sh           │
│                                                  │
│  1. systemctl is-active cloudflared              │
│     └─ DOWN → systemctl restart (rate-limited)   │
│  2. curl https://sinchat.delqhi.com/             │
│     └─ FAIL → restart tunnel, re-probe           │
│  3. log to /var/log/opensin-tunnel-health.log    │
│  4. exit 0 (OK) | exit 1 (FAIL)                  │
└──────────────────────────────────────────────────┘
```

The timer re-fires every 30 s regardless of the last exit code
(`OnUnitActiveSec` is based on activation time, not success). This
provides the "KeepAlive" equivalent from launchd — the check always
runs again in 30 seconds.
