# n8n workflows

Workbook-style n8n-flow JSONs the team can import into any n8n instance.

## sinchat-uptime.json

| Field | Value |
|---|---|
| Trigger | Schedule Trigger — every 5 min |
| Probe | HTTP Request — `GET https://sinchat.delqhi.com/` (timeout 10 s, follow redirect, ignore HTTP response errors so we always see the status code) |
| Decision | IF — `statusCode <= 399` |
| True branch | Slack → `#ops-alerts` "OK" message |
| False branch | Slack → `#ops-alerts` DOWN alert with code + error text |

**Complementary to** `scripts/sinchat-healthcheck/` on the OCI VM:

- **VM-side systemd timer** (5 min, persistent, restart on flap) catches
  *software crashes* of cloudflared / the server.
- **n8n-side workflow** (5 min, external cron) catches *infrastructure*
  outages (Oracle recycled the VM, network partition, DNS failure) that
  the in-VM timer can't see because the VM itself is gone.

You get both ⇒ if n8n fires, the VM is dead/rebooting/orphaned; if the
VM timer fires, the issue is downstream of the cloudflared tunnel.

## Install in n8n

1. Log into your n8n instance.
2. Sidebar → **Workflows** → **Import from File…** → pick
   `sinchat-uptime.json` from this repo.
3. Open the imported workflow once and **save** (n8n re-emits IDs
   and validates the schema).
4. Open the **Slack** nodes, paste your bot token + sign in,
   then point them at your `#ops-alerts` channel.
5. Toggle the workflow to **Active** in the top-right.

## Required community nodes

| Node | Vendor | Required |
|---|---|---|
| `n8n-nodes-base.scheduleTrigger` | built-in | yes |
| `n8n-nodes-base.httpRequest` | built-in | yes |
| `n8n-nodes-base.if` | built-in | yes |
| `n8n-nodes-base.slack` | built-in | yes (or swap for `emailSend`, `telegram`, etc.) |

If your n8n doesn't have the Slack node, the workflow still runs —
just disable the two Slack nodes after import and replace them with
your own alert node (Email Send, Telegram, PagerDuty, …).
