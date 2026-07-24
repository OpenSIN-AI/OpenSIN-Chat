# cloudflared watchdog

Keeps the `cloudflared` tunnel alive on the OCI VM that fronts
`sinchat.delqhi.com`. If `cloudflared` dies or stalls, the watchdog
restarts it via `systemctl`. The watchdog itself is supervised by
systemd so it self-heals too.

## Layout

| File | Where on the VM |
|---|---|
| `cloudflared-watchdog.sh` | `/opt/opensin/cloudflared-watchdog.sh` (mode 755) |
| `cloudflared-watchdog.service` | `/etc/systemd/system/cloudflared-watchdog.service` |
| log file (created at runtime) | `/var/log/cloudflared-watchdog.log` |

## One-time install on the VM

```bash
# 1. Drop the script on the host
sudo install -m 755 /tmp/cloudflared-watchdog.sh /opt/opensin/cloudflared-watchdog.sh

# 2. Drop the systemd unit
sudo install -m 644 /tmp/cloudflared-watchdog.service \
                  /etc/systemd/system/cloudflared-watchdog.service

# 3. Make sure /var/log has the watchdog log file writable by root
sudo touch /var/log/cloudflared-watchdog.log
sudo chown root:root /var/log/cloudflared-watchdog.log
sudo chmod 644 /var/log/cloudflared-watchdog.log

# 4. Enable + start
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-watchdog.service
sudo systemctl status cloudflared-watchdog.service
```

## What it does

- Polls `systemctl is-active cloudflared` every 30 s.
- On down, calls `systemctl restart cloudflared`.
- Backs off after **10 restarts in 10 min** so a broken host never
  spins at 100 % CPU.

## Verify it works

```bash
# 1. Sanity
sudo systemctl status cloudflared-watchdog.service
sudo tail -f /var/log/cloudflared-watchdog.log

# 2. Force a restart and watch it recover
sudo systemctl stop cloudflared
sleep 35
sudo systemctl status cloudflared        # should be active again
sudo tail /var/log/cloudflared-watchdog.log
```

## Companion external monitor

The watchdog only catches software crashes. To alert when the **VM itself**
is unreachable (ORACLE recycling, network outage), wire up an external
health-check workflow:

- n8n workflow `sinchat.delqhi.com uptime` (see
  `n8n/sinchat-uptime.json` after `yarn n8n:export` — coming next PR)
  pings `https://sinchat.delqhi.com/` every 5 min and emails on 3
  consecutive failures.
- (Alternative: free external service at healthchecks.io or UptimeRobot.)

## Uninstall

```bash
sudo systemctl disable --now cloudflared-watchdog.service
sudo rm /etc/systemd/system/cloudflared-watchdog.service
sudo rm /opt/opensin/cloudflared-watchdog.sh
sudo systemctl daemon-reload
```
