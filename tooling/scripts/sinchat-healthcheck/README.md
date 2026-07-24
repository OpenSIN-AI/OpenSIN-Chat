# sinchat.delqhi.com / cloudflared health monitoring

Two systemd units that complement each other:

| Unit | Purpose | Trigger |
|---|---|---|
| `cloudflared-watchdog.service` | restarts cloudflared if it crashes | always-on loop, 30 s poll |
| `sinchat-healthcheck.{timer,service}` | alerts *you* when the tunnel is down (or the VM is unreachable) | every 5 min |

## Where things go on the VM

| File on this repo | Where on the host |
|---|---|
| `scripts/cloudflared-watchdog/cloudflared-watchdog.sh` | `/opt/opensin/cloudflared-watchdog.sh` (mode 755) |
| `scripts/cloudflared-watchdog/cloudflared-watchdog.service` | `/etc/systemd/system/cloudflared-watchdog.service` |
| `scripts/sinchat-healthcheck/sinchat-healthcheck.sh` | `/opt/opensin/sinchat-healthcheck.sh` (mode 755) |
| `scripts/sinchat-healthcheck/sinchat-healthcheck.service` | `/etc/systemd/system/sinchat-healthcheck.service` |
| `scripts/sinchat-healthcheck/sinchat-healthcheck.timer` | `/etc/systemd/system/sinchat-healthcheck.timer` |
| `/etc/opensin/healthcheck.env` | (created by hand — holds NTFY_TOPIC, etc.) |

## One-time install

```bash
# 1. Cloudflared watchdog
sudo install -m 755 scripts/cloudflared-watchdog/cloudflared-watchdog.sh \
                 /opt/opensin/cloudflared-watchdog.sh
sudo install -m 644 scripts/cloudflared-watchdog/cloudflared-watchdog.service \
                  /etc/systemd/system/cloudflared-watchdog.service
sudo touch /var/log/cloudflared-watchdog.log
sudo chmod 644 /var/log/cloudflared-watchdog.log

# 2. Health probe
sudo install -m 755 scripts/sinchat-healthcheck/sinchat-healthcheck.sh \
                 /opt/opensin/sinchat-healthcheck.sh
sudo install -m 644 scripts/sinchat-healthcheck/sinchat-healthcheck.service \
                  /etc/systemd/system/sinchat-healthcheck.service
sudo install -m 644 scripts/sinchat-healthcheck/sinchat-healthcheck.timer \
                  /etc/systemd/system/sinchat-healthcheck.timer
sudo mkdir -p /etc/opensin
echo 'NTFY_TOPIC=opensin-alerts-PRIVATE-HASH-FOR-PUSH' | sudo tee /etc/opensin/healthcheck.env
echo 'NTFY_TOKEN=' | sudo tee -a /etc/opensin/healthcheck.env
# Optional: free external monitor, sign up at https://healthchecks.io
# echo 'HEALTHCHECKS_URL=https://hc-ping.com/your-uuid' | sudo tee -a /etc/opensin/healthcheck.env
sudo chmod 600 /etc/opensin/healthcheck.env

# 3. Enable + start
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-watchdog.service
sudo systemctl enable --now sinchat-healthcheck.timer
sudo systemctl list-timers sinchat-healthcheck.timer
```

## What each unit does

### cloudflared-watchdog.service

- Polls `systemctl is-active cloudflared` every 30 s.
- On DOWN, runs `systemctl restart cloudflared` (only after rate-limit
  check — max 10 restarts per 10 min sliding window).
- Self-restart by systemd via `Restart=always` / `RestartSec=10`.

### sinchat-healthcheck.{service,timer}

- Runs `sinchat-healthcheck.sh` every 5 min (with 30 s jitter).
- Script curls `https://sinchat.delqhi.com/` (configurable via
  `HEALTHCHECK_TARGET`), records the fail streak in
  `/var/run/sinchat-healthcheck/fail_streak`.
- On **3 consecutive failures**, alerts via:
  1. **ntfy.sh** push notification (if `NTFY_TOPIC` is set)
  2. **healthchecks.io** ping (if `HEALTHCHECKS_URL` is set)
  3. **wall + log** (always)
- Cool-down of 30 min between alerts so flap flaps don't blow up the
  notification channel.

## Verify it works

```bash
# Trigger the probe manually
sudo systemctl start sinchat-healthcheck.service
sudo journalctl -u sinchat-healthcheck.service -n 20

# Confirm watchdog would actually restart it
sudo systemctl stop cloudflared.service
sleep 35
sudo systemctl is-active cloudflared.service   # → active
sudo tail /var/log/cloudflared-watchdog.log

# Force a probe failure
sudo systemctl stop cloudflared.service
sudo systemctl start sinchat-healthcheck.service   # 1st fail
sudo systemctl start sinchat-healthcheck.service   # 2nd fail
sudo systemctl start sinchat-healthcheck.service   # 3rd fail → alert fires
```

## Optional: n8n webhook

If you also want alerts to flow through your n8n instance (when you
install the `schedule` and `emailSend` / `telegram` nodes), import
`n8n/sinchat-uptime.json` from this repo into your n8n and activate it.
On the VM side, extend `healthcheck.env` with two extra vars once
n8n listens on a webhook.

## Uninstall

```bash
sudo systemctl disable --now cloudflared-watchdog.service
sudo systemctl disable --now sinchat-healthcheck.timer
sudo rm /etc/systemd/system/{cloudflared-watchdog,sincat-healthcheck}.{service,timer}
sudo rm /opt/opensin/{cloudflared-watchdog,sinchat-healthcheck}.sh
sudo systemctl daemon-reload
```
