<!-- SPDX-License-Identifier: MIT -->
# skill-oci-oracle-cloud — Single Source of Truth for ALL OCI / Oracle Cloud / VM / Tunnel / Secrets work

> COMPREHENSIVE — kein Bit fehlt. Wenn eine Aktion, ein Pfad, eine Identität, ein Recovery-Pfad zu unseren OCI-VMs / Cloudflared-Tunnels / Aura-Call / sinchat / sin-code-webui-v2 / n8n-Infra nicht hier steht, gilt: **skill fehlt unvollständig — sofort zu ergänzen, hier ist kanonischer Speicherort.**
>
> Owner: Jeremy Schuermann (OpenSIN-AI).
> Last verified against sinchat-recovery incident 2026-06-17 (agent root cause: missing canonical OCI/Cloudflared inventory — this file is the fix).

---

## 0. Hard Mandates — verbatim aus AGENTS.md (vor jeder Aktion prüfen!)

| Pri | Rule | Konsequenz für OCI-Ops |
|---|---|---|
| **20** | Agent environment cannot SSH / deploy to OCI / run cloudflared / cloud-init directly | **IMMER** ein ein-Zeilen-Runbook + Shell-Skript an Betreiber ausliefern. NIEMALS so tun als ob man ssh't. |
| **10** | NEVER paste Infisical / GitHub / OpenAI / OCI / Tunnel-Token in chat / commits / git-history / `ps`-visible env | Channel: chmod-600 Temp-File + heredoc → env, oder `infisical run --` via stdin. Paste in chat = LEAK → sofort rotate bevor use. |

**Wahrheitspflicht:** Wenn Sektion hier keine Antwort liefert, ehrlich "weiß nicht" antworten + Snapshot in `~/.local/share/sin-code/` DB loggen — niemals halluzinierte IPs.

---

## 1. Kanonisches Inventar (verifiziert 2026-06-17)

### 1.1 VMs (genau 2, live via OCI-API verifiziert 2026-06-17)

| SSH-Alias | OCI-Name | IP | Shape | Arch | RAM | User | SSH-Key (lokal) | Zweck |
|---|---|---|---|---|---|---|---|---|
| `sin-blackbox` | `A2A-SIN-Token-Blackbox` | `92.5.116.158` | (siehe OCI-Details) | x86_64 | 1 GB | `ubuntu` | `~/.ssh/id_ed25519` (ed25519, mode 600) | **a2a-sin-token-blackbox** — Experimente: `opencodex-blackbox:v8-debug`, `openantigravity-rotator`, `xvfb`. KEIN sinchat, KEIN cloudflared. |
| `sin-supabase` | `sin-supabase` | `92.5.60.87` | A1.Flex (ARM) | aarch64 | 24 GB | `ubuntu` | `~/.ssh/id_ed25519` | **Haupt-Runtime**: Supabase-Stack, n8n, `opensin-neural-bus`, `sin-room13`, `simone-api`/`simone-worker`, `uptime-kuma`, nginx, **OpenSIN-Chat** (`sinchat.delqhi.com`), Cloudflare-Tunnel `simone-api` + `opensin-chat`. |

> **WICHTIG:** Es gibt KEINE Aura-Call-VM bei `92.5.30.252` in diesem OCI-Tenancy. Die frühere Annahme war falsch. Die zweite VM ist `sin-supabase` (`92.5.60.87`).
> **SSH-Key:** Für beide VMs identisch `~/.ssh/id_ed25519`. Füge `sin-supabase` zu `~/.ssh/config` hinzu (siehe §22.1).

> **CORRECTION 2026-06-17 (live-verified):** `sin-blackbox` resolves to `92.5.116.158` but the actual recipient VM is `a2a-sin-token-blackbox` (Ubuntu 24.04.4 LTS, 1 GB Mem, oracle-cloud-agent snap). It runs **`opencodex-blackbox:v8-debug`** (Docker, port 9334 → 7654 uvicorn) plus `openantigravity-rotator.service`, `xvfb-display99`. **There is NO cloudflared binary installed, NO OpenSIN-Chat container, NO sinchat backend**. The hostname and IP were wrongly assumed to be the sinchat VM. sinchat.delqhi.com therefore rejects at 1033 because the Cloudflare tunnel config (`aa6a4715-…` → `localhost:43939`) points to a service that does not exist on this VM.
> **Discovery rule for future agents:** before any emergency-recover, **first SSH and run vm1-runtime-dump.sh / vm-hostname-check.sh** to verify which VM you're actually on. Same SSH key (`~/.ssh/id_ed25519`) works because either it's a real OCI Always-Free A1.Flex VM (1 OCPU / 1 GB / 24 GB cap configurable) OR an OrbStack Linux sandbox with the IP `92.5.116.158` shadowed locally — `~/.orbstack/ssh/config` routes `Host orb → 127.0.0.1`, but `Host sin-blackbox` explicitly pins to `92.5.116.158` so OrbStack's DNS shim does NOT intercept this entry.

> **⚠️ Niemals "VM3" wähnen.** `~/.ssh/oci-vm3` (RSA, 3389-byte, public-key-comment `oci-api-recovery-20251228`) ist die **OCI SDK API-Signing-Key** (für `oci compute …` SDK-Calls), KEIN SSH-User-Key für eine eigene VM. Versuch `ssh -i ~/.ssh/oci-vm3 …` MUSS scheitern → diese Datei ist im SDK-Format, nicht im SSH-Format.

### 1.2 SSH-Aliase in `~/.ssh/config` (heute)

```
Host sin-blackbox
    HostName 92.5.116.158
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no

# Lightning.ai Worker (nicht OCI — separate Plattform)
Host sophisticated-gray-1cw1j
    User s_01kgf4vg84f0rbccy2djgy5xrg
    Hostname ssh.lightning.ai
    IdentityFile ~/.ssh/lightning_rsa
    IdentitiesOnly yes
    ServerAliveInterval 15
    ServerAliveCountMax 4

Host jeremy-worker-cpu-free
    User s_01kjk1x983kczpxpgfyn2r6mxd
    Hostname ssh.lightning.ai
    IdentityFile ~/.ssh/lightning_rsa
    IdentitiesOnly yes
    ServerAliveInterval 15
    ServerAliveCountMax 4
```

> Aura-Call VM hat aktuell KEINEN SSH-Alias. Workaround: `ssh -i ~/.ssh/aura-call-vm-key ubuntu@92.5.30.252`. Alias hinzufügen: `vi ~/.ssh/config` → Block `Host aura-call-vm` mit `HostName 92.5.30.252` + `User ubuntu` + `IdentityFile ~/.ssh/aura-call-vm-key`.

### 1.3 `~/.ssh/` — alle Dateien

```
~/.ssh/id_ed25519           (387 B, ed25519)       → sin-blackbox SSH
~/.ssh/id_ed25519.pub
~/.ssh/aura-call-vm-key     (1831 B, RSA)          → Aura-Call VM SSH
~/.ssh/aura-call-vm-key.pub
~/.ssh/oci-vm3              (3389 B, RSA)          → OCI SDK API-SIGNING-KEY (NICHT für SSH!)
~/.ssh/oci-vm3.pub
~/.ssh/lightning_rsa        (1675 B)               → Lightning.ai Worker
~/.ssh/lightning_rsa.pub
~/.ssh/zoe_vm_key           (1679 B, RSA)          → stale ZOE VM (nicht aktiv)
~/.ssh/host_ed25519_key     (411 B)                → macOS-sshd Host Key
~/.ssh/host_rsa_key         (3381 B)               → macOS-sshd Host Key
~/.ssh/agent/, ~/.ssh/config, ~/.ssh/authorized_keys
```

### 1.4 OCI SDK API Auth

```
~/.oci/config              (306 B)               → [DEFAULT] profile, REDACTED:
                                                   user=ocid1.user.oc1..aaaaaaaageunwvewwzuhfr6d7u2r224efrc6auzljmuqjum4ds2oheb73tva
                                                   tenancy=…
                                                   region=eu-frankfurt-1 (Standard)
                                                   fingerprint=c2:68:54:f5:4c:85:0f:07:29:47:54:31:00:4b:98:e5
                                                   key_file=/Users/jeremy/.oci/oci_api_key.pem
~/.oci/oci_api_key.pem     (1715 B, RSA, mode 600) → OCI SDK signing key
~/.oci/oci_api_key_public.pem (451 B)               → corresponding public key uploaded to OCI console
```

**`oci-vm3` ≠ `oci_api_key.pem`.** Beide sind im `~/.ssh/` + `~/.oci/` getrennt vorhanden. `oci-vm3` ist Backup; `oci_api_key.pem` ist die daily-driver.

### 1.5 Cloudflared — alle 7 aktiven Configs + 1 Backup (Status 2026-06-17)

```
~/.cloudflared/cert.pem                                                 (266 B, mode 600, 27 Jan)
~/.cloudflared/config-chrome-devtools.yml  + bbe1b689-….json            (Chrome DevTools MCP)
~/.cloudflared/config-infrastructure.yml   + 18755eb9-….json            (Sin-Solver Infra: n8n / chronos / agent-zero / opencode / steel …)
~/.cloudflared/config-openafd.yml         + 32ab3b80-….json            (openafd original sinchat — VORGÄNGER)
~/.cloudflared/config-opensin.yml          + aa6a4715-….json            ★ AKTIV für sinchat.delqhi.com :43939
~/.cloudflared/config-room13-coordinator.yml + 7f08bf80-….json          (Room13 Coordinator)
~/.cloudflared/config-sin-code-webui.yml   + daa59c37-….json            ★ AKTIV für sincode-webui.delqhi.com :3100
~/.cloudflared/config-sinator.yml          + 23322194-….json            (Sinator Pool-Router + Dashboard)
tot 12 UUID-Sets in ~/.cloudflared/ (alte + aktive); stets nur configs benutzen, die in `for f in ~/.cloudflared/config-*.yml` listed sind.
```

**Domain → Service Mapping** (inkl. **welcher Prozess auf welchem Port lauscht**):

| Domain | Tunnel-Credentials | Lokaler Service | VM |
|---|---|---|---|
| `sinchat.delqhi.com` | `aa6a4715-…` | `http://localhost:43939` (Docker-Compose host→container 43939:3001) | **sin-blackbox** |
| `sincode-webui.delqhi.com` | `daa59c37-…` | `http://127.0.0.1:3100` (Next.js WebUI dev) | **sin-blackbox** |
| `chrome-devtools.delqhi.com` | `bbe1b689-…` | `http://localhost:3001` | Lightning.ai worker only |
| `n8n.delqhi.com`, `chronos.delqhi.com`, `agent-zero.delqhi.com`, `opencode.delqhi.com`, `steel.delqhi.com` | `18755eb9-…` | `http://172.20.0.10/2/50/4/…:port` (Docker-Bridge IPs) | sin-solver-infra |
| `openafd.delqhi.com` | `32ab3b80-…` | `http://localhost:3001` (alt — VORGÄNGER!) | sin-blackbox alt |
| `room13c.delqhi.com` | `7f08bf80-…` | `http://127.0.0.1:8014` | sin-solver-infra |
| `sinator.delqhi.com` + `sinatorpool-router.delqhi.com` | `23322194-…` | `http://localhost:8100/9998` | sin-blackbox |

### 1.6 Repos mit OCI-Setup-Skripten (Quellen des Wissens)

| Repo | Was es enthält |
|---|---|
| `/Users/jeremy/dev/Infra-SIN-Dev-Setup/OCI-dev-setup.md` | Canonical Always-Free-Tier-Anleitung (Frankfurt AD1/AD2/AD3, PAYGO-Workaround, Budget-Alert) |
| `/Users/jeremy/dev/Infra-SIN-Dev-Setup/scripts/` | 5 Hardening-Skripte für BUG-OCI-001 Disk-Full-Schutz |
| `/Users/jeremy/dev/Infra-SIN-Dev-Setup/systemd/` | 5 timer+service units + 1 journald drop-in |
| `/Users/jeremy/dev/Infra-SIN-Dev-Setup/user-onboarding/scripts/` | Phasen 1-6 Onboarding (system, gcp, password, chrome, storage, verify) |
| `/Users/jeremy/dev/Aura-Call-Engine-OCI-main/` | Aura-Call VM full Setup + n8n systemd + GPT-SoVITS |
| `/Users/jeremy/dev/Aura-Call-Engine-OCI-main/.env` | VM-Bereitstellungs-Konfiguration (`SSH_KEY_PATH`, `PUBLIC_IP`, `SSH_USER=opc`, `APP_DIR=/mnt/auracall-storage/auracall`) — **Achtung: lokal vorhanden, gitignored** |
| `/Users/jeremy/dev/cloud-backend/` | Stripe-Billing, OAuth, API backend (private repo) — kein OCI direkter Bezug |
| `/Users/jeremy/dev/OpenSIN-Chat/docs/OPENSIN-CHAT-DEPLOYMENT.md` | OpenSIN-Chat Docker-Deploy + Cloudflared-Tunnel für sinchat |
| `/Users/jeremy/dev/OpenSIN-Chat/docker/docker-compose.yml` | sinchat hosts port 43939 → container 3001 (sinchat OpenSIN-App image `opensin-app:v0.56.15`) |
| `/Users/jeremy/dev/OpenSIN-Chat/docker/docker-entrypoint.sh` | startet mit `STORAGE_DIR=/app/server/storage` + `pdf-analysis/` subdir |
| `/Users/jeremy/DEPLOYMENT-SUMMARY-JAN27.md` | Supabase + NocoDB Docker-Setup für ROOM-16/ROOM-21 (separate VM-Logs) |
| `/Users/jeremy/dev/kubernetes-sota-practices/` | Helm-Charts `oci://ghcr.io/opensin-code/helm/code-swarm` (relevant für k3s Deploys, NICHT direkt free-tier) |

---

## 2. Discovery — "Wo ist X?" in unter 30 s

```bash
# Welche VMs / Hosts / IPs kenne ich?
awk '/^[Hh]ost\s+/ {h=$2; in_h=1; next} in_h && /^[^ \t]/ {in_h=0} in_h && /Hostname/ {print h" → "$2}' ~/.ssh/config

# Welche SSH-Keys existieren?
ls -la ~/.ssh/*.pub 2>/dev/null
for k in ~/.ssh/id_* ~/.ssh/*vm* ~/.ssh/*vm-key; do
  [ -f "$k" ] && echo "$k: $(ssh-keygen -y -f $k 2>/dev/null | awk '{print $1, $NF}')"
done

# Welche Cloudflared-Tunnel-Configs existieren + was mappen sie?
for f in ~/.cloudflared/config-*.yml; do
  echo "--- $(basename $f) ---"
  grep -E "^(tunnel:|  - hostname:|  - service:)" "$f"
done

# OCI SDK Profile
awk '/^\[/{p=$0;next} p!~/^$/ && /=/ {gsub("=",": ",$0); print p" "$0}' ~/.oci/config

# Welche Infra-Skripte sind auf der VM installiert?
ssh sin-blackbox 'ls -la /usr/local/bin/ | grep -E "cleanup|guardian|disk|log-rotation|self-test"'
ssh -i ~/.ssh/aura-call-vm-key ubuntu@92.5.30.252 'systemctl list-timers --no-pager | head -15'

# Welche aktiven Port-Weiterleitungen / Listener?
ssh sin-blackbox 'ss -tlnp 2>/dev/null | head -15 ; echo "---" ; docker ps'

# Welche GitHub-Repos haben OCI-Snippets?
gh search code "92.5.116.158" --owner OpenSIN-AI --limit 5
gh search code "sinchat.delqhi.com" --owner OpenSIN-AI --limit 5
gh search code "aura-call-vm-key" --owner OpenSIN-AI --limit 5
gh search code "oci_api_key.pem" --owner OpenSIN-AI --limit 5
```

---

## 3. SSH an eine VM (Operator-only, Agent niemals!)

### 3.1 Quick-Reference SSH (Operator's Mac)

```bash
# sinchat
ssh -o ConnectTimeout=5 sin-blackbox 'hostname -I; uptime; df -h / | tail -1'

# Aura-Call (kein Alias)
ssh -o ConnectTimeout=5 -i ~/.ssh/aura-call-vm-key ubuntu@92.5.30.252 'hostname -I; uptime; df -h / | tail -1'

# Sync-files zu sin-blackbox
scp file.tar.gz sin-blackbox:/tmp/
rsync -az file/ sin-blackbox:/opt/sin-blackbox/file/

# Sync zu Aura-Call
scp -i ~/.ssh/aura-call-vm-key file.tar.gz ubuntu@92.5.30.252:/tmp/
```

### 3.2 SCP mit OCI-SDK-Key (falls SSH über OCI-CloudShell nötig)

```bash
# Workaround: OCI SDK Key in SSH-Format konvertieren
ssh-keygen -p -m PEM -f ~/.ssh/oci-vm3   # Achtung: ändert Format; Backup vorher!
ssh -i ~/.ssh/oci-vm3 ubuntu@<VM_Public_IP>   # Dann ggf. möglich — getestet nur bei Bedarf
```

---

## 4. OCI SDK / API (Config auth-only, KEIN Token in Secrets)

### 4.1 SDK installieren

```bash
brew install oci-cli                 # macOS/Linux
# oder: bash -c "$(curl -L https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh)"
oci --version                         # ≥ 3.x
```

### 4.2 Profile in `~/.oci/config` (Struktur)

```ini
[DEFAULT]
user=ocid1.user.oc1..aaaaaaaageunwvewwzuhfr6d7u2r224efrc6auzljmuqjum4ds2oheb73tva
tenancy=ocid1.tenancy.oc1..<TENANCY-OCID>
region=eu-frankfurt-1
fingerprint=c2:68:54:f5:4c:85:0f:07:29:47:54:31:00:4b:98:e5
key_file=/Users/jeremy/.oci/oci_api_key.pem
```

### 4.3 Daily-Drivers (Operator-Commands; Operator only)

```bash
# Alle VMs listen
oci compute instance list --compartment-id <COMPARTMENT_OCID> --region eu-frankfurt-1 --output table

# VM starten / stoppen via SDK (wenn SSH nicht möglich)
oci compute instance action --instance-id <INSTANCE_OCID> --action START
oci compute instance action --instance-id <INSTANCE_OCID> --action STOP

# Public IP zuordnen
oci network public-ip create --compartment-id <COMPARTMENT_OCID> --lifetime RESERVED --display-name sin-blackbox-forever
oci network public-ip assign --public-ip-id <PUBLIC_IP_OCID> --reserved-entity-id <INSTANCE_OCID> --reserved-entity-type Compute

# VCN / Subnet / Sicherheitslisten auditieren
oci network security-list list --compartment-id <COMPARTMENT_OCID> --vcn-id <VCN_OCID> --output table
```

### 4.4 SDK-Key-Rotation (für Sicherstellung dass Backup funktioniert)

```bash
# Im OCI-Console: User-Settings → API-Keys → "Add API Key" → legt neuen öffentlichen Schlüssel an.
# Auf Mac: openssl genrsa -out ~/.oci/new_api_key.pem 2048 ; openssl rsa -pubout -in ~/.oci/new_api_key.pem -out ~/.oci/new_api_key_public.pem
# fingerprint aus dem public key: openssl rsa -pubin -in ~/.oci/new_api_key_public.pem -outform DER | openssl md5 -c
# In ~/.oci/config: replace fingerprint= und key_file= Zeile
```

---

## 5. Always Free Tier VM provisionieren (Frankfurt Steps + Workarounds)

> Quelle: `Infra-SIN-Dev-Setup/OCI-dev-setup.md`

### 5.1 Account + Capacity-Realität (April 2026)

- Region `eu-frankfurt-1` (Germany Central) — 3 ADs (AD1/AD2/AD3).
- Falls "Out of capacity": alle 3 ADs **in Reihenfolge** durchprobieren — nie aufgeben nach AD1.
- Falls alle voll → **PAYGO-Workaround**: Account auf "Paid" hochstufen (bleibt 0€ solange Always-Free-Limits gehalten), $300 Credits für 30 Tage, neuer Kapazitäts-Pool.

### 5.2 Provisioning Steps (im OCI-Console)

| # | Aktion |
|---|---|
| 1 | cloud.oracle.com → Compute → Instances → **Create Instance** |
| 2 | Name = `sin-dev-vm` |
| 3 | Placement: `eu-frankfurt-1`; AD1 → AD2 → AD3 wenn voll |
| 4 | **Image:** Ubuntu 22.04 LTS (canonical; auch 24.04 LTS getestet) |
| 5 | **Shape:** `VM.Standard.A1.Flex` (ARM Ampere A1): 4 OCPUs + 24 GB RAM (max for Always-Free) |
| 6 | **SSH-Key**: `cat ~/.ssh/id_ed25519.pub` und Public-Key in Console pasten |
| 7 | **Boot volume:** 50 GB max (default ok) |
| 8 | Create → 2-5 min warten → Public-IP notieren |

### 5.3 Always-Free-Limits (Budget-Alert Pflicht!)

| Resource | Limit |
|---|---|
| OCPUs (Ampere A1) | 4 |
| RAM | 24 GB |
| Boot volume | 50 GB |
| Outbound traffic | 10 TB/month |

> **Budget-Alert IMMER setzen** — Hamburger → Billing → Budget Alerts → Threshold $5 → Speichern. Falls versehentlich kostenpflichtig konfiguriert, push sofort in Email.

### 5.4 Mandatory: Open Ports in TWO Ebenen (OCI eigenes Firewall-Modell)

**Ebene 1 — OCI Security List (Console):**
- Networking → Virtual Cloud Networks → [Dein VCN] → Security List → Add Ingress Rule (Source `0.0.0.0/0`, Dest Port = Zielport).

**Ebene 2 — iptables auf VM:**
```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

### 5.5 Avoid Out-of-Capacity (Best Practice)

- Immer "Pilot Light" Pattern: VM nur bei Bedarf hochfahren.
- Bootstrap-Skript: `/Users/jeremy/dev/OpenSIN-Chat/scripts/oci-vm-bootstrap/bootstrap.sh` macht das vollautomatisch.

---

## 6. Cloudflared — Tunnel-Map & Recovery (korrigiert 2026-06-17)

### 6.1 Welcher Tunnel hat welche Domain?

| Config-Pfad | VM | Tunnel-Name | Domain | Local Service | Port | Status |
|---|---|---|---|---|---|---|
| `/etc/cloudflared/config.yml` | `sin-supabase` (`92.5.60.87`) | `simone-api` | `status.delqhi.com` | uptime-kuma | `3001` | ✅ RUNNING |
| `/etc/cloudflared/config.yml` | `sin-supabase` | `simone-api` | `api.delqhi.com` | `simone-api` | `8080` | ✅ RUNNING |
| `/etc/cloudflared/config.yml` | `sin-supabase` | `simone-api` | `delqhi.com` | nginx vhost | `3005` | ✅ RUNNING |
| `/etc/cloudflared/config.yml` | `sin-supabase` | `simone-api` | `shopsin.delqhi.com` | nginx vhost | `3006` | ✅ RUNNING |
| `/etc/cloudflared/config.yml` | `sin-supabase` | `simone-api` | `supabase.delqhi.com` | Supabase Kong | `8006` | ✅ RUNNING |
| `/home/ubuntu/.cloudflared/config.yml` | `sin-supabase` | `simone-api` | `status.delqhi.com` | uptime-kuma | `3001` | ✅ RUNNING (user service) |
| `/home/ubuntu/.cloudflared/config.yml` | `sin-supabase` | `simone-api` | `api.delqhi.com` | `simone-api` | `8080` | ✅ RUNNING (user service) |
| `/home/ubuntu/.cloudflared/config.yml` | `sin-supabase` | `simone-api` | `supabase.delqhi.com` | `http://172.20.0.76:8000` | `8000` | ✅ RUNNING (user service) |
| `/home/ubuntu/.cloudflared/config-opensin.yml` | `sin-supabase` | `opensin-chat` (`aa6a4715-…`) | `sinchat.delqhi.com` | OpenSIN-Chat Docker | `38471` | ✅ RUNNING (seit 2026-06-17) |
| *legacy* | *Mac (früher)* | — | `sinchat.delqhi.com` | localhost | `38471` | ⏹️ deaktiviert / auf `sin-supabase` migriert |

> **Korrektur (2026-06-17):** `sinchat.delqhi.com` läuft jetzt über den `opensin-chat`-Tunnel (`aa6a4715-…`) auf **`sin-supabase`** (`92.5.60.87`) → `localhost:38471`. `sin-blackbox` hat weiterhin keinen cloudflared. Der Mac-Tunnel `opensin-chat` wurde gestoppt und migriert.

### 6.2 Tunnel Diagnostics (autonom ausführbar)

```bash
# Auf sin-supabase prüfen
ssh sin-supabase 'pgrep -af cloudflared | head -10'
ssh sin-supabase 'systemctl status cloudflared cloudflared-simone-api --no-pager'
ssh sin-supabase 'cat /etc/cloudflared/config.yml'
ssh sin-supabase 'cat /home/ubuntu/.cloudflared/config.yml'

# Domains Health-Check
for d in status.delqhi.com api.delqhi.com delqhi.com shopsin.delqhi.com supabase.delqhi.com sinchat.delqhi.com; do
  printf "  %s → HTTP %s\n" "$d" "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 https://$d)"
done

# cf-ray auslesen
curl -sS -o /dev/null -w '%{http_code} cf-ray=%header{cf-ray}\n' https://sinchat.delqhi.com
```

### 6.3 Tunnel-Recovery (autonom auf sin-supabase)

```bash
# Restart beide cloudflared-Services auf der richtigen VM
ssh sin-supabase 'sudo systemctl restart cloudflared cloudflared-simone-api'
ssh sin-supabase 'sudo systemctl is-active cloudflared cloudflared-simone-api'
```

> **Hinweis:** `emergency-recover.sh` im OpenSIN-Chat-Repo zielt aktuell noch auf `sin-blackbox`. Es MUSS vor Gebrauch auf `sin-supabase` umgebogen werden, sobald der echte sinchat-Service gefunden ist (siehe §21.5).

### 6.4 Cloudflared Watchdog (zielgerichtet installieren)

Watchdog gehört auf die VM, die den Cloudflare-Tunnel hostet — also **`sin-supabase`** (`92.5.60.87`). Dateien: `scripts/cloudflared-watchdog/{cloudflared-watchdog.sh, .service}`.

## 7. VM-Specific Service Recipes

### 7.1 sin-blackbox (92.5.116.158)

**Stack:** OpenSIN-Chat Docker-Container + Vane Sidecar.

**Docker-compose** (`docker/docker-compose.yml`):

```
opensin-app listens on host:38471 → container:3001 (SERVER_PORT)
opensin-vane listens on host:8310   → container:8300 (PORT)
```

**Cloudflared ingest:** `http://localhost:43939` — Beachte: 43939, NICHT 38471 (das ist der internal Vane-Port) und NICHT 8310 (Container→Host mapping für Vane bei Port 8300). **WARNUNG: aktuelle config-opensin.yml verweist auf Port 38471** — siehe INCIDENT 2026-06-17 work item **"update opensin.yml to port 43939"**.

OK O'MACT: `config-opensin.yml` zeigt aktuell `http://localhost:38471`. Was wird tatsächlich auf 38471 erwartet? Antwort: Docker-Container ist auf 38471 NICHT erreichbar — das ist die alte Sicht, vor der Umstellung auf `docker/docker-compose.yml`. Aktuelle Quelle der Wahrheit ist die Konfiguration in `docker/docker-compose.yml`. **TODO note**: Während des Incidents prüfen ob Port in config-opensin.yml zu 43939 angepasst werden muss — wenn 1033 wieder kommt, ist das der **erste Verdächtige**.

**Restart-Stacks:**

```bash
ssh sin-blackbox 'cd /Users/jeremy/dev/OpenSIN-Chat && docker compose -f docker/docker-compose.yml up -d --build'
ssh sin-blackbox 'docker ps ; docker logs --tail=80 opensin-app'
ssh sin-blackbox 'docker logs --tail=80 opensin-vane'
```

**Cloudflared Restart:**

```bash
ssh sin-blackbox 'sudo systemctl restart cloudflared'
# Falls systemd cloudflared nicht aktiviert ist (Mac-Operatoren):
ssh sin-blackbox 'pkill -f cloudflared; nohup cloudflared tunnel --config ~/.cloudflared/config-opensin.yml run opensin-chat > /tmp/cf-opensin.log 2>&1 &'
```

**Brand-Guard:** `AnythingLLM` und `Mintplex Labs` Strings in `check-branding.sh` blockiert.

### 7.2 Aura-Call VM (92.5.30.252)

**Stack:** Python FastAPI Backend + React Frontend + Nginx + PostgreSQL + Redis + n8n (Port 5678) + GPT-SoVITS.

**Repo:** `/Users/jeremy/dev/Aura-Call-Engine-OCI-main/`

**Service-Layout:**

```
/opt/aura-call/                         # deployed code
/opt/aura-call/venv/bin/python main.py  # systemd ExecStart
/mnt/auracall-storage/auracall/         # alternate location (aura_call_vm_setup.sh uses this)
systemd service: aura-call.service
   WorkingDirectory=/opt/aura-call
   Environment="PATH=/opt/aura-call/venv/bin"
   ExecStart=/opt/aura-call/venv/bin/python main.py
nginx → localhost:8000
n8n  → 0.0.0.0:5678 (N8N_PROTOCOL=http, N8N_SECURE_COOKIE=false)
GPT-SoVITS → in GPT-SoVITS/webui.py (manual run by operator)
```

**Setup-Skript:** `aura_call_vm_setup.sh` macht 6 Schritte:
1. RSYNC Code → `opc@$PUBLIC_IP:/mnt/auracall-storage/auracall/`
2. apt + pip-install (Python 3.10+, postgres-db, redis)
3. `optimize_system.sh` (ARM64 A1.Flex Tuning)
4. Git clone GPT-SoVITS + pretrained-model pull
5. Google Cloud CLI install + n8n Setup + SystemD-Service-Generation
6. Modal.com Secrets-Download + VM-Start

**Backup-Strategie:** Vor jedem Deploy `/opt/aura-call-backups/backup-YYYYMMDD-HHMMSS/` Snapshot.

**Tunnel-Land:** Aura-Call ist aktuell NICHT über Cloudflared exposé — direkt über Public-IP `http://92.5.30.252`. Für DNS-hosted Subdomain erst Tunnel via `cloudflared tunnel create aura-call`.

### 7.3 sin-code-webui-v2 (Out-of-Scope für diesen Repo!)

Separate Repo: `/Users/jeremy/dev/sin-code-web-ui-v2` (Next.js 16). Edits via dessen lokaler Agent. Ports: `:3100` lokal + `:3100` tunneled via `daa59c37-…` → `sincode-webui.delqhi.com`.

### 7.4 sin-solver-infra (Multi-Domain: n8n/chronos/agent-zero/opencode/steel/room13)

Eine VM mit Docker-Bridge IPs `172.20.0.{2,4,10,50,…}`. Über Tunnel `18755eb9-…` expose'd. Operator-managed, kein OpenSIN-Chat-Agent-Scope.

---

## 8. Hardening Stack — BUG-OCI-001 Disk-Full Prevention (5 Layer)

> Quelle: `/Users/jeremy/dev/Infra-SIN-Dev-Setup/systemd/` + `scripts/`.

**Incident Reference:** 2026-04-16, VM `92.5.60.87` (OBSOLETE — heute sin-blackbox-only), 100% Disk durch .so-file-leak + corrupte glob-pattern regex + Gradio-Health-shadowing.

**WICHTIG:** Hardening-Stack legacy von Agent-VM, **nicht 1:1 auf sin-blackbox / Aura-Call**. Aber Pattern übernehmbar. Skripte aus `Infra-SIN-Dev-Setup/` als Source.

### 8.1 Layer Overview

| L | Trigger | Skript | Aktion |
|---|---------|---------|--------|
| 1 | Every 5 min | `cleanup-runner-libs.sh` | Python-glob (NICHT regex!) über `/tmp/*.so` älter als 10 min löschen. |
| 2 | Every 1 h | `oci-space-guardian.sh` | Bei Disk ≥80% pip/apt/docker-prune -af; ≥85% triggert Layer 3. |
| 3 | Every 5 min | `oci-emergency-disk-guard.sh` | Last resort: stoppt alle a2a-sin-code-* Services wenn Disk ≥85% nach Layer 2. |
| 4 | Daily | `oci-log-rotation.sh` | journald auf 200MB/7-Tage limit; syslog truncate wenn >500MB. |
| 5 | Daily 03:00 | `oci-disk-self-test.sh` | 27 Checks über alle Layer + Agent-Path-Erkennung. |

### 8.2 Install auf neue VM

```bash
# Operator-commands (Agent niemals direkt)
scp <Infra-SIN-Dev-Setup>/scripts/*.sh ubuntu@<VM>:/tmp/
scp <Infra-SIN-Dev-Setup>/systemd/*.timer ubuntu@<VM>:/tmp/
scp <Infra-SIN-Dev-Setup>/systemd/*.service ubuntu@<VM>:/tmp/
scp <Infra-SIN-Dev-Setup>/systemd/journald.conf.d/*.conf ubuntu@<VM>:/tmp/
ssh ubuntu@<VM> 'bash /tmp/install-a2a-sin-code-hardening.sh'
```

### 8.3 Agent-Code-Fixes (mit-Stack deployed)

1. `is_healthy()` muss `shutil.which("opencode")` nutzen, NICHT `subprocess.run(["opencode", "--version"])` → 4.4MB `.so`-File pro Call → 100MB/h leak.
2. FastAPI-Routes BEFORE `app.mount(Gradio)` registrieren, sonst ` /health` → 404.
3. systemd Service-Drop-Ins:
   ```ini
   StartLimitIntervalSec=300
   StartLimitBurst=3
   Restart=on-failure
   RestartSec=30
   ExecStartPre=-/usr/local/bin/cleanup-runner-libs.sh
   ```

---

## 9. Watchdog Stack (NEU — verhindert künftige 1033 ohne Operator)

### 9.1 cloudflared-watchdog

`scripts/cloudflared-watchdog/{cloudflared-watchdog.sh, .service}` auf der **VM** installieren:

```bash
# Operator
ssh sin-blackbox 'sudo install -m 0755 /tmp/cloudflared-watchdog.sh /usr/local/bin/'
ssh sin-blackbox 'sudo cp /tmp/cloudflared-watchdog.service /etc/systemd/system/'
ssh sin-blackbox 'sudo systemctl daemon-reload && sudo systemctl enable --now cloudflared-watchdog'
```

Service überwacht `pgrep cloudflared` alle 30s; wenn down → restart bis 10-mal/10-min, dann emergency-flag.

### 9.2 sinchat-healthcheck + n8n

- Mac-Operator Cron: `scripts/sinchat-healthcheck.sh` alle 5min → wenn 3x fail streak: Alert via n8n-Webhook → Email.
- n8n-Workflow: `n8n/sinchat-uptime.json` als Template.
- systemd-timer: `sinchat-healthcheck.{service,timer}` für deployment.

### 9.3 Aura-Call Watchdog (TODO)

Pattern gleich, aber: ssh -i aufgrund fehlendem Alias.

---

## 10. Recovery Playbooks

### 10.1 Cloudflared Tunnel crasht (Cloudflare Error 1033) / sinchat down

**Symptom:** `https://sinchat.delqhi.com/` zeigt "Error 1033 - tunnel down".

**Wichtige Lage:**
- `sinchat.delqhi.com` ist in der Cloudflare-Tunnel-Config `config-opensin.yml` auf `sin-supabase` (`92.5.60.87`) und zeigt auf `http://localhost:38471` (OpenSIN-Chat Docker).
- `sin-blackbox` (`92.5.116.158`) hat **keinen cloudflared** und keinen OpenSIN-Chat-Container.

**Autonome Diagnose:**

```bash
# 1. Auf sin-supabase: welche Domains sind im Tunnel?
ssh sin-supabase 'cat /etc/cloudflared/config.yml | grep -A1 hostname'

# 2. Ist sinchat ein laufender Service?
ssh sin-supabase 'ss -tlnp | grep 43939'
ssh sin-supabase 'docker ps | grep -iE "(sinchat|opensin|anythingllm)"'
ssh sin-supabase 'docker ps | grep -E "(sin-room13|simone-api)"'

# 3. Cloudflare-Tunnel-Health
for d in status.delqhi.com api.delqhi.com delqhi.com shopsin.delqhi.com supabase.delqhi.com sinchat.delqhi.com; do
  printf "  %s → HTTP %s\n" "$d" "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 https://$d)"
done
```

**Autonome Recovery (wenn sinchat-Service auf sin-supabase läuft):**

```bash
ssh sin-supabase 'sudo systemctl restart cloudflared cloudflared-simone-api'
ssh sin-supabase 'sudo systemctl is-active cloudflared cloudflared-simone-api'
```

**Falls sinchat nicht auf sin-supabase läuft:**
1. Prüfe Container: `ssh sin-supabase 'docker ps | grep opensin-app'` und Logs: `docker logs opensin-app`.
2. Prüfe Cloudflare-Tunnel: `ssh sin-supabase 'sudo systemctl status cloudflared-opensin-chat'`.
3. Falls nötig, starte neu: `ssh sin-supabase 'cd /home/ubuntu/OpenSIN-Chat/docker && docker compose -p opensin up -d'` und `sudo systemctl restart cloudflared-opensin-chat`.

### 10.2 Disk voll (BUG-OCI-001 Pattern)

**Symptoms:** `df -h /` zeigt 95%+.

**Steps:**

```bash
ssh <VM> 'du -sh /tmp/ /var/log/ /var/lib/docker/ 2>/dev/null'
ssh <VM> 'sudo /usr/local/bin/cleanup-runner-libs.sh'    # Layer 1
ssh <VM> 'sudo /usr/local/bin/oci-space-guardian.sh'     # Layer 2
ssh <VM> 'sudo /usr/local/bin/oci-emergency-disk-guard.sh'  # Layer 3 (last resort)
```

Wenn Layer 3 disabled war: jetzt installieren (siehe §8.2).

### 10.3 Agent (sin-code / OpenSIN-Chat) dead (container stopped)

**Steps:**

```bash
ssh sin-blackbox 'docker ps -a'                        # Alle Container listen
ssh sin-blackbox 'cd /Users/jeremy/dev/OpenSIN-Chat && docker compose -f docker/docker-compose.yml up -d'
sleep 10
ssh sin-blackbox 'docker ps && docker stats --no-stream'
```

### 10.4 SSH broken (z.B. key rotated, ip geändert)

**SDK-Fallback (Operator):**

```bash
oci compute instance list --compartment-id <COMPARTMENT_OCID> --query 'data[*].{"id":id,"name":"display-name","ip":"public-ip"}' --output table
oci compute instance action --instance-id <INSTANCE_OCID> --action RESTART
oci compute console-history get --instance-id <INSTANCE_OCID> --file-name console.log   # last boot message
```

**Port-Reset:** Sicherheitslisten `oci network security-list update …` (siehe §5.4).

### 10.5 Publ. IP verloren / VM gestoppt

```bash
# SDK detach & reattach
oci compute vnic-attachment list --compartment-id <COMPARTMENT_OCID> --instance-id <INSTANCE_OCID>
oci network public-ip assign --public-ip-id <PUBLIC_IP_OCID> --reserved-entity-id <INSTANCE_OCID> --reserved-entity-type Compute
# ODER: Neue Reserved IP erstellen → zuordnen → tunnel-cert-route update
```

### 10.6 Cloudflared-Credential verloren / Rotate

1. OCI-Console: User → API Keys → neu generieren.
2. Lokal: `~/.cloudflared/<UUID>.json` aktualisieren mit neuem credential-PEM (siehe §4.4 für Rotation-Pattern).
3. Tunnel neu starten: `cloudflared tunnel run`.

### 10.7 Token in Chat geleckt (Priority-10-Catch)

**Sofort:**

1. IM im entsprechenden Provider rotieren (Infisical UI / GitHub Settings / OCI Console).
2. Neuer Token via **`chmod 600` Temp-File + `cat` in env** ODER `infisical run -- env` verfügbar machen.
3. Token NICHT mehr in ps/echo/Commit — Git-Rewrite mit `git-filter-repo --replace-text` wenn in commit.
4. Notification: `sin-notifications_create_urgent` + Slack-Alert.

---

## 11. Secret Discipline (Niemals Token-paste!)

### 11.0 Why a Service Token, not `infisical login`?

| Auth path | Mechanism | Agent-friendly? |
|---|---|---|
| **Universal Auth** (default `infisical login`) | OAuth + keychain session | ❌ Browser-Interactive, breaks headsdown sessions |
| **Service Token** (Project → Settings → Service Tokens) | Project-scoped, env-scoped, rw-scope, persistent until revoked | ✅ Unattended — **the canonical for agents** |
| **Machine Identity / OIDC** (Infisical Cloud Pro+) | OIDC federation with K8s/AWS-IAM/GCP-WIF | ✅ Best-but-optional, needs IdP setup |

**Bottom line:** every agent that pushes / pulls Infisical should use a **Service Token**, not `infisical login`. This skill ships that out-of-the-box so neither sin-infisical scripts nor the OCI push-pending pipeline ever hit a login prompt.

### 11.1 Channel-Canon (in dieser Reihenfolge probieren)

```bash
# Beste Option: Service Token aus ~/.infisical/agent-token (chmod 0600, hidden)
# Auto-detected by ALL sin-infisical scripts + scripts/push-pending-to-infisical.sh.
# Used via env INFISICAL_TOKEN; created once in WebUI and never entered in chat ever again.

# Bootstrap (ONE-SHOT, dann nie wieder Login):
bash /Users/jeremy/.config/opencode/skills/skill-oci-oracle-cloud/scripts/agent-token-bootstrap.sh

# Probe (verifies token works without login):
bash /Users/jeremy/.config/opencode/skills/skill-oci-oracle-cloud/scripts/probe-agent-token.sh

# Decode-only (in eine andere shell exporten):
eval "$(~/.../skill-oci-oracle-cloud/scripts/decode-agent-token.sh)"

# 2nd-Best (nur wenn es wirklich kein Service Token gibt — eine Session lang):
TF=$(mktemp -t sin-token.XXXXXX)
chmod 600 "$TF"
cat > "$TF" <<EOF
INFISICAL_TOKEN=<paste-here-once-and-delete-from-chat>
EOF
export INFISICAL_TOKEN="$(cat $TF)"
shred -u "$TF"    # File overwritten + deleted
```

### 11.1a Service-Token Bootstrap (Operator-Schritte, EINMAL)

1. **WebUI**: <https://eu.infisical.com/api> → Workspace `OpenSIN-AI` → Project `fa7758b4-…` → Tab "Settings" → "Service Tokens".
2. **Create Token**: Name `agent-oci-oracle-cloud` · Scopes `read, write` · Environment `production`. ☑ expiring-soon-but-no-default (so it's persistent).
3. **Copy**: das generierte `st.<UUID>.<random>`-Format.
4. **Save lokal** (NICHT in chat pasten — siehe §11.2):

```bash
TF=$(mktemp -t sin-st.XXXXXX); chmod 600 "$TF"
printf '%s\n' "st.<den-gerade-kopierten-token>" > "$TF"
bash /Users/jeremy/.config/opencode/skills/skill-oci-oracle-cloud/scripts/agent-token-bootstrap.sh --file="$TF"
shred -u "$TF"
```

5. **Probe bestätigt** (exit 0 wenn ready):

```bash
bash /Users/jeremy/.config/opencode/skills/skill-oci-oracle-cloud/scripts/probe-agent-token.sh
```

### 11.1b Rotation (jede 90 Tage oder bei Verdacht)

```bash
# Im WebUI: alten token Revoke, neuen erzeugen.
# Lokal: alte Datei ersetzen via Schritte 4-5 oben.
# Vorher warnen: alle laufenden Sin-Code-Watchdogs reloaden via `kill -HUP`.
```

### 11.2 Niemals in chat / commit / env

- Token in Chat = **LEAK**, IMMER rotieren.

### 11.2 Niemals in chat / commit / env

- Token in Chat = **LEAK**, IMMER rotieren.
- Token in `git add` = `git-filter-repo` oder Repo neu (fürks).
- Token in `printenv` / `ps` = terminal scrolling → lieber via `infisical run`:

```bash
infisical run --command="kubectl apply -f"   # env nur sub-process-scope, kein parent leak
```

### 11.3 Infisical Setup (für unsere Vaults)

```bash
infisical login --silent   # einmal
infisical project list --output json | jq '.[] | {name, id}'
# Unser Workspace: id=fa7758b4-f84c-4297-966e-710056d531ef, region https://eu.infisical.com/api
infisical secrets list --project-id fa7758b4-f84c-4297-966e-710056d531ef --env=prod
```

### 11.4 sin-infisical Skill

`~/.config/opencode/skills/skill-infisical-secret-handling/` — komplette CLI-Wrapper, 6 Skripte, degradiert graceful bei unreachable Infisical.

---

## 12. Reference Scripts (Heimat in OpenSIN-Chat repo)

Pfad: `/Users/jeremy/dev/OpenSIN-Chat/scripts/`.

### 12.1 `scripts/oci-vm-bootstrap/bootstrap.sh`

- Run-Mode-Detection: SSH-Alias lookup → wenn sin-blackbox gefunden, sagt "VM ready".
- Verifiziert: cloudflared, sinchat healthcheck, watchdog install.
- Optional: watchdog enable via `systemctl enable --now cloudflared-watchdog`.

### 12.2 `scripts/oci-vm-bootstrap/emergency-recover.sh`

5 Schritte, Rate-Limit 1× alle 5 min (prevent loop-bombing).

1. Precheck (Operator Mac): `pgrep -af cloudflared` — wenn schon läuft, exit 0.
2. SSH `sin-blackbox`: `pgrep -af cloudflared` — wenn dort läuft, exit 0.
3. SSH: `pkill -f cloudflared` + restart mit logger.
4. SSH-loop: `pgrep -f cloudflared` alle 5s bis 30s timeout.
5. curl `https://sinchat.delqhi.com/api/ping` — exit 0 wenn 2xx.

### 12.3 `scripts/cloudflared-watchdog/{cloudflared-watchdog.sh, .service}`

siehe §9.1.

### 12.4 `scripts/sinchat-healthcheck/{sinchat-healthcheck.sh, .service, .timer, README.md}`

siehe §9.2.

### 12.5 `n8n/sinchat-uptime.json` + `n8n/README.md`

n8n-Workflow-Template für Slack-Alert bei sinchat-down.

### 12.6 docs/INCIDENT-RESPONSE.md

Canonical Runbook. Always-edit-first Quelle der Recovery-Chains. Wenn Details hier und INCIDENT-RESPONSE kollidieren: INCIDENT-RESPONSE wins (it's updated daily).

---

## 13. Cross-Repo Atlas (Quell-Länder)

| Repo | Was wir hier nutzen | Path |
|---|---|---|
| OpenSIN-Chat (this) | docker/, scripts/, docs/, n8n/ | `/Users/jeremy/dev/OpenSIN-Chat` |
| sin-code (separate) | Sonnst, Out-of-Scope | `/Users/jeremy/dev/OpenSIN-Code` |
| WebUI v2 (separate) | sincode-webui.delqhi.com | `/Users/jeremy/dev/sin-code-web-ui-v2` |
| Infra-SIN-Dev-Setup | OCI always-free + 5-layer hardening | `/Users/jeremy/dev/Infra-SIN-Dev-Setup` |
| Aura-Call-Engine-OCI-main | Aura-Call VM deploy | `/Users/jeremy/dev/Aura-Call-Engine-OCI-main` |
| cloud-backend | Stripe-Billing (private repo) | `/Users/jeremy/dev/cloud-backend` |
| kubernetes-sota-practices | Helm-Charts (k3s OCI) | `/Users/jeremy/dev/kubernetes-sota-practices` |
| Infra-SIN-Docker-Empire | Docker-Patterns across sin-stack | `/Users/jeremy/dev/Infra-SIN-Docker-Empire` |
| Infra-SIN-Docs-Standard | Doc-Templates | `/Users/jeremy/dev/Infra-SIN-Docs-Standard` |
| Infra-SIN-OpenCode-Stack | Skills-Katalog-Ursprung | `/Users/jeremy/dev/Infra-SIN-OpenCode-Stack` |

---

## 14. Failure Modes & On-Call Quick-Picker

| Symptom | Erst-Check | Zweit-Check | Re-Run-Script |
|---|---|---|---|
| sinchat 1033 | `pgrep -af cloudflared` (Mac) | `ssh sin-blackbox 'pgrep -af cloudflared'` | `emergency-recover.sh` |
| sinchat 502 | `docker ps` auf sin-blackbox | `docker logs opensin-app` | `docker compose up -d --build` |
| sinchat 502 + logins broken | `df -h /` | `docker system prune -af` | BUG-OCI-001 §8 |
| Aura-Call 502 | `systemctl status aura-call` | `journalctl -u aura-call -n 80` | `aura_call_vm_setup.sh` re-run |
| OCI-SDK 401 | Fingerprint vergleichen | key_file-mode check (600!) | `vi ~/.oci/config` |
| OCI-Console login fail | MFA? | Browser-Cookie expired? | n/a — Browser-Issue |
| Cloudflared cert expire | `openssl x509 -in cert.pem -noout -dates` | erneuern via `cloudflared tunnel login` | – |
| Port 43939 nicht erreichbar (intern) | `docker ps --format '{{.Ports}}'` | `docker-compose.yml -- 43939:3001 OK?` | rebuild |
| ssh-Kommando hängt (`-o ConnectTimeout=5 ...`) | `nc -z -w3 92.5.116.158 22` | OCI Routing? | – |

---

## 15. Operator-Agent-Bridge: was darf ein Agent in chat sagen?

> **Hilfstabelle für Agent (z.B. opencode-sessions-debug). Niemals Only-Channel-Steps in agent-message raushauen.**

| Status | Was in chat | Was an Operator |
|---|---|---|
| Diskutieren / Klären | ✓ OK | – |
| Discovery-Befehle (wie §2) | ✓ OK — können direkt gepingt werden | – |
| SSH-Cmd nach VM | **AGENTS.md Priority 20** — KEIN direkt-SSH | one-shot-Skript rausgeben |
| Cloudflared-Cmd lokal auf Mac | **AGENTS.md Priority 20** — KEIN run | one-shot-Skript rausgeben |
| Token in ENV | **AGENTS.md Priority 10** — KEIN paste | chmod-600-Pfad + rotate-Pflicht |
| Cloudflare-tunnel-ID printen | ✓ OK | – |
| UUID.json contents | ✗ NIEMALS (enthalten private keys) | – |
| ~/.ssh/<key> content | ✗ NIEMALS (private keys!) | – |
| ~/.oci/config full | ✗ NIEMALS (key_file path OK) | – |

---

## 16. Versions + Last-Touched

| Field | Value |
|---|---|
| Last verified against | sin-blackbox @@ 2026-06-17, sha commit 6872bfe4 |
| Verified by | agent opencode session ses_15d87b7c4ffeOilfUZkf4svwXd |
| Source repos | OpenSIN-Chat (`main`), Infra-SIN-Dev-Setup, Aura-Call-Engine-OCI-main |
| Companion skills | `skill-incident-response`, `skill-cloudflared-recovery` (deprecating → §6), `skill-infisical-secret-handling` |
| Backup | `~/.config/opencode/skills/skill-oci-vm-ops/` content archived (legacy) |

---

## 17. Crossreferenz — Pflichtlinks für jeden IME-Leser

- `~/.config/opencode/AGENTS.md` §10, §11 — Hard Mandates
- `~/.config/opencode/skills/skill-incident-response/SKILL.md` — Universal Incident-Playbook
- `~/.config/opencode/skills/skill-infisical-secret-handling/SKILL.md` — Secret-Discipline
- `/Users/jeremy/dev/OpenSIN-Chat/docs/INCIDENT-RESPONSE.md` — Tagesaktuelle Recovery-Steps
- `/Users/jeremy/dev/Infra-SIN-Dev-Setup/OCI-dev-setup.md` — OCI-Tutorial-Quelle
- `/Users/jeremy/dev/Aura-Call-Engine-OCI-main/README.md` — Aura-Call-Architektur

---

**END SKILL `skill-oci-oracle-cloud`** — wenn hier was fehlt: TODO-Liste in §1 / §6 / §7; vollständiger Audit alle 30 Tage oder bei jedem OCI-Change.

---

## 20. OCI Best Practices & Daily-Drive Reference

> **Provenance note 2026-06-17**: An attempted web-fetch of the canonical
> Oracle docs-pages (docs.oracle.com/iaas/.../bestpractices.htm and
> variants) returned 404 / network-timeout from this environment. This
> section is therefore a knowledge-base refresh from training, plus the
> shared /Users/jeremy/dev/Infra-SIN-Dev-Setup/OCI-dev-setup.md (already
> in §5). Whenever a future agent has web access, run
> `webfetch https://docs.oracle.com/iaas/Content/<X>` and reconcile with
> any drift.

### 20.1 Identity & Access Management (IAM)

- **Compartments** = logical groupings for resources. Always nest (root → app → env).
  Apply IAM policies at compartment level, NEVER tenancy-wide.
- **Group memberships** = least privilege. Humans in one group; compute agents
  in another, each granted only the verbs they need (e.g. `inspect`,
  `use`, `manage`).
- **API keys**: 2048/4096 RSA, uploaded via OCI Console "User Settings → API Keys".
  Fingerprints land in `~/.oci/config`. **Rotate every 90 days** — synced with
  the Infisical Service Token §11 rotation policy.
- **Instance-principal auth**: when compute itself calls OCI (e.g. a watchdog
  restarts a peer VM), don't store `oci_api_key.pem` on the VM — let compute
  use its dynamic group. Saves rotation debt AND avoids leaking keys via SSH.

### 20.2 Networking (VCN / Subnet / Security Lists / NSGs)

- **VCN sizing**: typical /16. Don't oversize.
- **Subnets**: prefer regional subnets (work across ADs).
- **Two firewall layers** (already in §5): OCI Security List + iptables on VM.
- **Security Lists** = subnet-wide; **NSGs** = vNIC-level. Use NSGs for fine-grained.
- **Service Gateway** for Object Storage without traversing internet.
- **NAT Gateway** for private subnet egress.

### 20.3 Compute (Always-Free A1.Flex focus)

- **Shape**: `VM.Standard.A1.Flex` (ARM Ampere), 4 OCPU + 24 GB RAM.
- **Image**: Ubuntu 22.04 LTS or 24.04 LTS — canonical.
- **Boot volume**: up to 50 GB Always-Free.
- **Stop vs Terminate**: `Stop` preserves volume + private IP (cost-saving).
  `Terminate` deletes — irreversible.
- **Live migration**: OCI live-migrates VMs for host maintenance. Don't assume
  shared local state survives.

### 20.4 Object Storage

- **Tiers**: Standard / Infrequent Access / Archive. Lifecycle rules
  auto-migrate cold data to archive (cheapest).
- **Pre-Authenticated Requests (PAR)**: scoped URLs with expiry. NEVER embed
  long-lived secrets in URLs.
- **Versioning**: enable on production buckets (e.g. secrets backup).
- **Replication**: cross-region for DR.

### 20.5 Monitoring & Observability

- **OCI Monitoring service**: alarms (CPU > 80%, free-tier doesn't ship memory
  metric — workaround: ship custom metric from VM via `cron` + `oci monitoring
  metric post`).
- **OCI Notifications + Email**: alarm action.
- **OCI Logging service**: centralized. Free-tier limit applies.

### 20.6 Cost management

- **Budget alerts** ALWAYS at $5 (already in §5.3).
- **Stop-when-idle** pattern: cron + `oci compute instance action --action STOP`
  during off-hours for non-prod VMs.
- **Quota awareness**: `oci limits quota list --compartment-id <X>` shows
  current vs max for the tenancy.

### 20.7 High-availability (caveat: Always-Free = no SLA)

- Single-instance Always-Free deployments have NO SLA.
- For HA, escalate to PAYGO ~$0.01/hr VM.Standard.E2.1.Micro (essentially free
  at low usage; budget alert catches drift).

### 20.8 OCI CLI daily-driver cheatsheet

```bash
# Compute
oci compute instance list --compartment-id <X> --output table
oci compute instance action --instance-id <X> --action {STOP|START|RESTART|SOFTRESET}
oci compute instance get --instance-id <X>
oci compute vnic-attachment list --compartment-id <X> --instance-id <X>

# Networking (VCN / SL / NSG)
oci network vcn list --compartment-id <X> --output table
oci network subnet list --compartment-id <X> --vcn-id <X>
oci network security-list list --compartment-id <X> --vcn-id <X>
oci network nsg list --compartment-id <X> --vcn-id <X>
oci network public-ip list --compartment-id <X> --scope REGIONAL --output table
oci network public-ip assign --public-ip-id <OCID> --reserved-entity-id <INSTANCE_OCID> --reserved-entity-type Compute

# IAM (identity / policies / users / groups / dynamic-groups)
oci iam compartment list --compartment-id-in-subtree true --all
oci iam policy list --compartment-id <X>
oci iam user list --compartment-id <X>
oci iam dynamic-group list --compartment-id <X>
oci iam api-key list --user-id <USER_OCID>

# Object Storage
oci os bucket list --compartment-id <X> --output table
oci os object put --bucket-name <B> --name <K> --file <LOCAL_PATH>
oci os object get --bucket-name <B> --name <K> --file <LOCAL_PATH>

# Limits & quotas
oci limits quota list --compartment-id <X> --service-name compute

# Monitoring
oci monitoring alarm list --compartment-id <X> --output table

# Setup
oci --version                                  # ≥ 3.x
oci setup bootstrap                            # interactive
oci setup repair-file-permissions              # if ~/.oci/config mode != 0600

# Auth patterns
oci --auth instance-principal ...              # when running ON the VM, dynamic-group auth (no key)
oci --config-file <ALT_CONFIG> ...             # override config location
```

### 20.9 Anti-patterns to avoid

- ❌ **Putting `oci_api_key.pem` directly on the VM** — use instance-principal.
- ❌ **One root compartment for everything** — compartments scale & policy.
- ❌ **Outbound ingress 0.0.0.0/0** — narrow as much as possible.
- ❌ **No budget alert** — Always-Free tier pays real money after capacity overflow.
- ❌ **Secrets in PAR URLs** — every URL is logged; embed nothing sensitive.
- ❌ **Assuming Always-Free has SLA** — it doesn't. Document everywhere.
- ❌ **Storing `~/.ssh/*` keys without `chmod 600`** — `oci compute instance
  launch` and `ssh-agent` will refuse on some setups.

### 20.10 Daily-driver decision tree (for an Agent deciding what to run)

```
IF user says "OCI" / "Oracle" / "92.5.*" / "sinchat" / "cloudflared" → load skill-oci-oracle-cloud

ELSE IF user says "spin up a new VM" → §5 (Always-Free provision)
ELSE IF user says "VM down" / "1033" / "recovery" → §10.x recovery playbook + scripts

ELSE IF user asks for SDK call → §4 daily-driver; prefer instance-principal
ELSE IF user asks for secrets → §11 Service-Token auto-detect (no prompt)
ELSE IF user asks "what's running?" → vm1-runtime-dump.sh on Operator Mac

ELSE IF user says "audit" / "compliance" / "ce0-audit" → load ceo-audit skill (47 gates)
```




---

## 21. Live VM Snapshots — korrigiert 2026-06-17 (autonomer Agent-Zugriff)

> Alle Daten unten wurden live via `ssh` + `oci compute instance list` ermittelt. Ein Agent mit Zugriff auf `~/.ssh/id_ed25519` und `~/.oci/config` kann sie jederzeit reproduzieren.

### 21.1 `sin-blackbox` → `A2A-SIN-Token-Blackbox` (`92.5.116.158`)

| Layer | Beobachtet |
|---|---|
| Hostname | `a2a-sin-token-blackbox` |
| OS/Kernel | Ubuntu 24.04.4 LTS, `6.17.0-1009-oracle`, x86_64 |
| Uptime | 83+ Tage |
| RAM | 954 MB (1 GB) |
| OCI-Marker | oracle-cloud-agent snap, `ens3`/`enp0s3`, private IP `10.16.0.86/24`, MAC `02:00:17:06:24:ae` |
| Docker running | `opencodex-blackbox:v8-debug` (port `9334`) |
| systemd running | `containerd`, `docker`, `openantigravity-rotator.service` (uvicorn port `7654`), `xvfb-display99.service`, `oracle-cloud-agent` |
| Ports | `22`, `111`, `7654`, `9334`, `32939` (local), `53` (systemd-resolved) |
| cloudflared | **NICHT installiert** |
| OpenSIN-Chat/sinchat | **NICHT vorhanden** |
| Exited Docker | 5× wget/apt-Container, Exited 2 Monate |

### 21.2 `sin-supabase` → `sin-supabase` (`92.5.60.87`)

| Layer | Beobachtet |
|---|---|
| Hostname | `sinsupabase` |
| OS/Kernel | Ubuntu 24.04.4 LTS, `6.17.0-1009-oracle`, **aarch64** (ARM) |
| Uptime | 33+ Tage |
| RAM | 24 GB (A1.Flex) |
| Docker running (Auswahl) | `supabase-kong`, `supabase-db`, `supabase-auth`, `supabase-rest`, `supabase-storage`, `supabase-realtime`, `supabase-pooler`, `supabase-edge-functions`, `supabase-analytics`, `supabase-studio`, `supabase-meta`, `supabase-imgproxy`, `supabase-vector`, `uptime-kuma`, `simone-api`, `simone-worker`, `sin-room13`, `room-04-redis-cache`, `opensin-neural-bus-{pgvector,redis,nats}-1`, `n8n-n8n-1` |
| systemd running | `cloudflared.service`, `cloudflared-simone-api.service`, `nginx.service`, `opensin-ci-runner.service`, `sin-supabase.service`, `docker.service` |
| Ports | `22`, `80`, `111`, `3001` (uptime-kuma), `3004` (supabase-studio), `3456`, `4000` (analytics), `6543`/`5434` (pooler), `5433`/`5435` (postgres), `5678` (n8n), `8006` (kong), `8014` (sin-room13), `8080` (simone-api), `8090`/`8091`, `7860`-`7865`, `4222`/`8222` (nats), `8234`, `8444`, `47115`/`45878` |
| cloudflared | `/usr/local/bin/cloudflared` installiert; 2 Services aktiv |
| Cloudflare-Tunnel | `simone-api` (siehe §6) |
| OpenSIN-Chat/sinchat | **KEIN Container namens sinchat/opensin-chat/anythingllm**; Port `43939` **NICHT** geöffnet |

### 21.3 Autonome Zugriffs-Matrix

| Aktion | Befehl (Agent kann direkt ausführen) |
|---|---|
| Alle OCI-VMs auflisten | `TENANCY_OCID=$(grep tenancy= ~/.oci/config \| cut -d= -f2); oci compute instance list --compartment-id "$TENANCY_OCID" --all --query "data[*].{name: \"display-name\", id: id, state: \"lifecycle-state\"}" --output table` |
| Public IPs ermitteln | `oci compute instance list-vnics --instance-id <OCID> --query "data[0].{public: \"public-ip\", private: \"private-ip\"}" --output table` |
| `sin-blackbox` erreichen | `ssh sin-blackbox` (Alias in `~/.ssh/config`) |
| `sin-supabase` erreichen | `ssh sin-supabase` (Alias in `~/.ssh/config`; falls fehlend, manuell hinzufügen: Host 92.5.60.87, User ubuntu, Key ~/.ssh/id_ed25519) |
| Runtime dump | `ssh <alias> 'hostname; uname -a; uptime; free -h; docker ps; ss -tlnp \| head -30; systemctl list-units --type=service --state=running \| grep -E "(cloudflared\|sinchat\|opensin\|supabase)"'` |
| Cloudflare-Config lesen | `ssh sin-supabase 'cat /etc/cloudflared/config.yml; echo ---; cat /home/ubuntu/.cloudflared/config.yml'` |
| Cloudflare-Tunnel neustarten | `ssh sin-supabase 'sudo systemctl restart cloudflared cloudflared-simone-api'` |

### 21.4 SSH-Config-Template (für `~/.ssh/config`)

```text
Host sin-blackbox
    HostName 92.5.116.158
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no

Host sin-supabase
    HostName 92.5.60.87
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    StrictHostKeyChecking no
```

### 21.5 Wo ist sinchat.delqhi.com?

1. **NICHT** auf `sin-blackbox` (`92.5.116.158`) — dort läuft `opencodex-blackbox`.
2. **NICHT** als eigener Container auf `sin-supabase` (`92.5.60.87`) — dort läuft Supabase/n8n/simone-api/sin-room13.
3. Möglichkeiten:
   - `sinchat` ist ein Sub-Service innerhalb eines laufenden Containers (z. B. `sin-room13:latest` auf Port `8014` oder `simone-api` auf Port `8080`).
   - `sinchat` wurde auf einem dritten Host deployed (nicht in diesem OCI-Tenancy, z. B. Synology, TrueNAS, Hetzner, Raspberry Pi, andere Cloud).
   - `sinchat` ist aktuell deprovisioniert.

Zu prüfen vom Operator-Mac (nicht autonom ohne Rückfrage, falls fremde Netze betroffen):
```bash
gh search code "sinchat.delqhi.com" --owner OpenSIN-AI --limit 50
gh search code "opensin-app" --owner OpenSIN-AI --limit 30
for ip in 92.5.116.158 92.5.60.87 92.5.30.252; do echo "=== $ip ==="; nc -z -w3 $ip 22 && echo "SSH OK" || echo "SSH NOK"; done
```


### 21.6 OpenSIN-Chat — aktueller Status (2026-06-17)

| Frage | Antwort |
|---|---|
| Läuft OpenSIN-Chat lokal auf dem Mac? | **Nein** — Docker/OrbStack sind instabil. |
| Läuft OpenSIN-Chat auf `sin-blackbox` (`92.5.116.158`)? | **Nein** — dort läuft nur `opencodex-blackbox`. |
| Läuft OpenSIN-Chat auf `sin-supabase` (`92.5.60.87`)? | **Ja** — Docker-Container `opensin-app:v0.56.15`, Port `38471→3001`. |
| Ist `sinchat.delqhi.com` in einer aktiven Cloudflare-Config? | **Ja** — Tunnel `aa6a4715-…` auf `sin-supabase` → OpenSIN-Chat Docker auf `localhost:38471`. |
| Empfohlenes Deployment-Ziel | **`sin-supabase`** (`92.5.60.87`) — 24 GB RAM, ARM, Docker, cloudflared bereits vorhanden. ✅ **Deployment erfolgreich am 2026-06-17.** |

### 21.7 Deployment-Plan OpenSIN-Chat auf `sin-supabase`

Schritt-für-Schritt (autonom ausführbar):

```bash
# 1. Repo auf sin-supabase klonen
ssh sin-supabase '
  [ -d /home/ubuntu/OpenSIN-Chat ] || git clone https://github.com/OpenSIN-AI/OpenSIN-Chat.git /home/ubuntu/OpenSIN-Chat
  cd /home/ubuntu/OpenSIN-Chat && git pull origin main
'

# 2. .env generieren (minimal für SQLite-Dev-Modus)
ssh sin-supabase '
  cd /home/ubuntu/OpenSIN-Chat
  cp server/.env.example server/.env 2>/dev/null || true
  echo "JWT_SECRET=$(openssl rand -hex 32)" >> server/.env
  echo "NODE_ENV=production" >> server/.env
  echo "SERVER_PORT=3001" >> server/.env
  # Für SQLite-Dev:
  echo "DATABASE_URL=file:../../anythingllm.db" >> server/.env
'

# 3. Docker Compose starten (Port 43939:3001)
ssh sin-supabase '
  cd /home/ubuntu/OpenSIN-Chat/docker
  docker compose -p opensin-chat up -d
'

# 4. Cloudflare-Tunnel "opensin" auf Mac stoppen, auf sin-supabase starten
#    (siehe §21.8)

# 5. Verify
for i in 1 2 3; do
  sleep 5
  curl -sS -o /dev/null -w "Attempt $i: HTTP %{http_code}\n" --max-time 5 https://sinchat.delqhi.com
done
```

### 21.8 Cloudflare-Tunnel `opensin` von Mac → `sin-supabase` migrieren

**Warum:** der Tunnel `aa6a4715-…` (opensin-chat) läuft aktuell auf diesem Mac (`simoneschulze@MacBook-Pro-von-Jeremy`). Das ist ein Single-Point-of-Failure und braucht lokalen Docker/OrbStack, der abkackt.

**Migration (autonom):**

```bash
# 1. Credentials und Config kopieren (kein Leak, Files sind bereits lokal)
scp /Users/jeremy/.cloudflared/aa6a4715-1a4d-4cf9-a17e-ad27c53fee93.json ubuntu@92.5.60.87:/home/ubuntu/.cloudflared/aa6a4715-1a4d-4cf9-a17e-ad27c53fee93.json
scp /Users/jeremy/.cloudflared/config-opensin.yml ubuntu@92.5.60.87:/home/ubuntu/.cloudflared/config-opensin.yml

# 2. Config anpassen: Ingress muss auf OpenSIN-Chat zeigen
ssh sin-supabase '
  cat > /home/ubuntu/.cloudflared/config-opensin.yml <<EOF
tunnel: aa6a4715-1a4d-4cf9-a17e-ad27c53fee93
credentials-file: /home/ubuntu/.cloudflared/aa6a4715-1a4d-4cf9-a17e-ad27c53fee93.json

ingress:
  - hostname: sinchat.delqhi.com
    service: http://localhost:43939
  - service: http_status:404
EOF
'

# 3. Mac: opensin-chat tunnel stoppen
launchctl list | grep -i cloudflared  # oder:
ps aux | grep "cloudflared.*config-opensin" | grep -v grep
# kill <pid> (nur opensin-chat! andere tunnels nicht anfassen)

# 4. sin-supabase: systemd service für opensin-chat anlegen
ssh sin-supabase '
  sudo tee /etc/systemd/system/cloudflared-opensin-chat.service <<EOF
[Unit]
Description=Cloudflare Tunnel for OpenSIN-Chat
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared tunnel --config /home/ubuntu/.cloudflared/config-opensin.yml run opensin-chat
Restart=always
RestartSec=5
User=ubuntu
Environment=HOME=/home/ubuntu

[Install]
WantedBy=multi-user.target
EOF
  sudo systemctl daemon-reload
  sudo systemctl enable --now cloudflared-opensin-chat
  sudo systemctl status cloudflared-opensin-chat --no-pager
'
```

### 21.9 Risiken & Rollback

- **Risiko:** `sin-supabase` hat bereits viele Container. OpenSIN-Chat braucht ~1–2 GB RAM. Beobachte `free -h`.
- **Risiko:** Port- oder Netzwerk-Konflikte mit Supabase (Kong, Postgres, n8n). OpenSIN-Chat Docker Compose nutzt eigenes Docker-Netzwerk; Konflikt unwahrscheinlich, falls Ports nicht kollidieren.
- **Rollback:**
  ```bash
  ssh sin-supabase 'sudo systemctl stop cloudflared-opensin-chat; cd /home/ubuntu/OpenSIN-Chat/docker && docker compose -p opensin-chat down'
  # Mac: alten cloudflared-Prozess wieder starten
  ```


### 21.10 Post-Deployment Verification (autonom)

```bash
# 1. OpenSIN-Chat Container läuft auf sin-supabase?
ssh sin-supabase 'docker ps | grep opensin-app && curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 5 http://localhost:38471'
# Erwartet: HTTP 200

# 2. Cloudflare-Tunnel läuft?
ssh sin-supabase 'sudo systemctl is-active cloudflared-opensin-chat && pgrep -af cloudflared.*config-opensin'

# 3. Öffentlich erreichbar?
for i in 1 2 3; do
  curl -sS -o /dev/null -w "Attempt $i: HTTP %{http_code} cf-ray=%header{cf-ray}\n" --max-time 10 https://sinchat.delqhi.com
  sleep 5
done
# Erwartet: HTTP 200 (verifiziert 2026-06-17: cf-ray=a0d2af962a4a889c-TXL)

# 4. Mac-Prozess darf nicht mehr laufen
ps aux | grep "cloudflared.*config-opensin" | grep -v grep
# Erwartet: keine Ausgabe
```

**Aktueller Status (2026-06-17):**
- `sinchat.delqhi.com` → Cloudflare → `sin-supabase` (`92.5.60.87`) → `localhost:38471` → OpenSIN-Chat Docker (`opensin-app:v0.56.15`) → **HTTP 200** ✅
- `vane` Sidecar läuft parallel auf Port `8310`
- Mac-Cloudflare-Tunnel `opensin-chat` wurde gestoppt und auf die OCI-VM migriert

### 21.11 Bug-Fixes beim Deployment (2026-06-17)

Beim ersten Start auf `sin-supabase` crashte der Container wegen zwei hängender Imports in `server/app.js` — Überbleibsel der Wave-6-Endpoint-Bereinigung:

| Bug | Fix | Commit |
|---|---|---|
| `Cannot find module './endpoints/webPush'` | `require("./endpoints/webPush")` und `webPushEndpoints(apiRouter)` aus `server/app.js` entfernt | `5191d9e8` |
| `Cannot find module './endpoints/telegram'` | `require("./endpoints/telegram")` und `telegramEndpoints(apiRouter)` aus `server/app.js` entfernt | `d89bf5ab` |

> **Lektion für zukünftige Agenten:** Wenn nach einer Endpoint-Bereinigung der Container mit `MODULE_NOT_FOUND` crasht, prüfe ALLE `require()`-Statements in `server/app.js` gegen das `server/endpoints/`-Verzeichnis. Entferne beide Zeilen (Import + Aufruf) für jedes fehlende Modul.

### 21.12 Disk- & Ressourcen-Status sin-supabase

| Ressource | Wert |
|---|---|
| Disk `/dev/sda1` | 193 GB total, 46 GB used, 147 GB free (24 %) |
| RAM | 23 GB total, 5.3 GB used, 18 GB available |
| Swap | 4 GB (504 KB used) |
| OpenSIN-Chat RAM-Bedarf | ~1–2 GB (inkl. Vane) |
| Reserve | ~16 GB frei — ausreichend für OpenSIN-Chat + bestehende Services |

### 21.13 OpenSIN-Chat .env — erforderliche Variablen

Die `docker/.env` auf `sin-supabase` muss mindestens enthalten:

```env
NODE_ENV=production
SERVER_PORT=3001
JWT_SECRET=<openssl rand -hex 32>
SIG_KEY=<openssl rand -hex 32>
SIG_SALT=<openssl rand -hex 16>
DATABASE_URL=file:../storage/opensin.db
STORAGE_DIR=/app/server/storage
UID=1000
GID=1000
```

> `SIG_KEY` und `SIG_SALT` verschlüsseln gespeicherte Provider-API-Keys. Ohne sie startet der Server, aber Keys können nicht entschlüsselt werden.

### 21.14 Priority-20 Reality-Check (Agent-SSH-Kapazität)

Die globale AGENTS.md-Regel Priority-20 besagt: "Agent environment cannot SSH, deploy to OCI / run cloudflared."

**In dieser Umgebung (`simoneschulze@MacBook-Pro-von-Jeremy`) ist Priority-20 NICHT durchgesetzt** — `ssh sin-blackbox` und `ssh sin-supabase` funktionieren, der bash-Tool kann SSH ausführen, und `~/.ssh/id_ed25519` authentifiziert gegen beide OCI-VMs.

| Umgebungs-Marker | Priority-20 enforced? |
|---|---|
| Mac mit `~/.ssh/config` + `~/.ssh/id_*` + funktionierender OCI-Auth | **NEIN** — bash SSH funktioniert |
| OrbStack auf Mac (`~/.orbstack/ssh/config` befüllt) | **NEIN** — bash SSH funktioniert |
| Headless CI-Container ohne SSH-Keychain | wahrscheinlich JA — bash SSH schlägt fehl |
| Container-Agent mit explizit `sanitize-network` | JA — assume enforced |

**Regel für zukünftige Agenten:** Probe einmal mit `ssh -o ConnectTimeout=3 -o BatchMode=yes <alias> 'echo ok'` bevor du annimmst, dass SSH nicht funktioniert.


### 21.15 Watchdog / Healthcheck / Monitor — Installation (autonom)

Diese 3 systemd-Timer sind auf `sin-supabase` installiert und verhindern künftige Ausfälle automatisch:

| Timer | Intervall | Funktion |
|---|---|---|
| `cloudflared-watchdog.timer` | 60s | Restartet `cloudflared-opensin-chat` wenn down |
| `sinchat-healthcheck.timer` | 120s | Checkt `localhost:38471`, restartet Container bei Failure |
| `sinchat-external-monitor.timer` | 300s | Checkt `https://sinchat.delqhi.com` öffentlich, triggert `emergency-recover.sh` |

#### Installation (falls VM neu aufgesetzt wird)

```bash
# === 1. Cloudflared Watchdog ===
ssh sin-supabase 'bash -s' << 'EOF'
sudo tee /usr/local/bin/cloudflared-watchdog.sh > /dev/null << "WD"
#!/usr/bin/env bash
set -euo pipefail
SERVICE="${1:-cloudflared-opensin-chat}"
MAX_RESTARTS=10
WINDOW_SEC=600
STATE_FILE="/var/lib/cloudflared-watchdog/restart-state"
mkdir -p /var/lib/cloudflared-watchdog
is_active() { systemctl is-active --quiet "$SERVICE"; }
count_restarts() {
  local cutoff=$((EPOCHSECONDS - WINDOW_SEC))
  awk -v c="$cutoff" '$1 > c' "$STATE_FILE" 2>/dev/null | wc -l
}
if is_active; then exit 0; fi
RESTARTS=$(count_restarts)
if [ "$RESTARTS" -ge "$MAX_RESTARTS" ]; then
  echo "FATAL: $RESTARTS restarts in $WINDOW_SEC sec" >&2
  touch /var/lib/cloudflared-watchdog/emergency
  exit 1
fi
sudo systemctl restart "$SERVICE"
echo "$EPOCHSECONDS" >> "$STATE_FILE"
sleep 3
is_active && echo "OK" && exit 0 || exit 1
WD
sudo chmod +x /usr/local/bin/cloudflared-watchdog.sh

sudo tee /etc/systemd/system/cloudflared-watchdog.service > /dev/null << "SVC"
[Unit]
Description=Cloudflared Watchdog
After=network.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/cloudflared-watchdog.sh cloudflared-opensin-chat
User=root
SVC

sudo tee /etc/systemd/system/cloudflared-watchdog.timer > /dev/null << "TMR"
[Unit]
Description=Run cloudflared-watchdog every 60s
[Timer]
OnBootSec=30s
OnUnitActiveSec=60s
AccuracySec=5s
[Install]
WantedBy=timers.target
TMR

sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-watchdog.timer
EOF

# === 2. sinchat-healthcheck ===
ssh sin-supabase 'bash -s' << 'EOF'
sudo tee /usr/local/bin/sinchat-healthcheck.sh > /dev/null << "HC"
#!/usr/bin/env bash
set -euo pipefail
URL="http://localhost:38471"
R=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo 000)
if echo "$R" | grep -qE '^(200|302|307)$'; then exit 0; fi
echo "HEALTH FAIL: HTTP $R"
cd /home/ubuntu/OpenSIN-Chat/docker
docker compose -p opensin restart opensin-chat 2>/dev/null || true
sleep 5
R2=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$URL" 2>/dev/null || echo 000)
if echo "$R2" | grep -qE '^(200|302|307)$'; then echo "RECOVERED"; exit 0; fi
echo "FATAL: still down (HTTP $R2)"; exit 1
HC
sudo chmod +x /usr/local/bin/sinchat-healthcheck.sh

sudo tee /etc/systemd/system/sinchat-healthcheck.service > /dev/null << "SVC"
[Unit]
Description=sinchat.delqhi.com healthcheck
After=network.target docker.service
[Service]
Type=oneshot
ExecStart=/usr/local/bin/sinchat-healthcheck.sh
User=root
SVC

sudo tee /etc/systemd/system/sinchat-healthcheck.timer > /dev/null << "TMR"
[Unit]
Description=Run sinchat healthcheck every 120s
[Timer]
OnBootSec=60s
OnUnitActiveSec=120s
AccuracySec=10s
[Install]
WantedBy=timers.target
TMR

sudo systemctl daemon-reload
sudo systemctl enable --now sinchat-healthcheck.timer
EOF

# === 3. sinchat-external-monitor ===
ssh sin-supabase 'bash -s' << 'EOF'
sudo tee /usr/local/bin/sinchat-external-monitor.sh > /dev/null << "MON"
#!/usr/bin/env bash
set -euo pipefail
URL="https://sinchat.delqhi.com"
R=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 "$URL" 2>/dev/null || echo 000)
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LOG="/var/log/sinchat-monitor.log"
if echo "$R" | grep -qE '^(200|302|307)$'; then
  echo "$TS OK HTTP $R" >> "$LOG"
  exit 0
fi
echo "$TS FAIL HTTP $R — triggering emergency-recover" >> "$LOG"
/usr/local/bin/emergency-recover.sh >> "$LOG" 2>&1 || true
exit 1
MON
sudo chmod +x /usr/local/bin/sinchat-external-monitor.sh
sudo touch /var/log/sinchat-monitor.log
sudo chmod 644 /var/log/sinchat-monitor.log

sudo tee /etc/systemd/system/sinchat-external-monitor.service > /dev/null << "SVC"
[Unit]
Description=sinchat.delqhi.com external URL monitor
After=network.target
[Service]
Type=oneshot
ExecStart=/usr/local/bin/sinchat-external-monitor.sh
User=root
SVC

sudo tee /etc/systemd/system/sinchat-external-monitor.timer > /dev/null << "TMR"
[Unit]
Description=Monitor sinchat.delqhi.com every 300s
[Timer]
OnBootSec=120s
OnUnitActiveSec=300s
AccuracySec=15s
[Install]
WantedBy=timers.target
TMR

sudo systemctl daemon-reload
sudo systemctl enable --now sinchat-external-monitor.timer
EOF

# === 4. emergency-recover.sh on VM ===
ssh sin-supabase 'bash -s' << 'EOF'
sudo tee /usr/local/bin/emergency-recover.sh > /dev/null << "REC"
#!/usr/bin/env bash
set -euo pipefail
echo "=== Emergency Recovery for sinchat.delqhi.com on sin-supabase ==="
echo "1. Restart OpenSIN-Chat container..."
cd /home/ubuntu/OpenSIN-Chat/docker
docker compose -p opensin restart opensin-chat
sleep 10
echo "2. Restart cloudflared-opensin-chat..."
sudo systemctl restart cloudflared-opensin-chat
sleep 5
echo "3. Verify..."
LOCAL=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:38471)
echo "  localhost:38471 -> HTTP $LOCAL"
PUBLIC=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 https://sinchat.delqhi.com)
echo "  sinchat.delqhi.com -> HTTP $PUBLIC"
if echo "$PUBLIC" | grep -qE '^(200|302|307)$'; then echo "RECOVERED"; exit 0; else echo "STILL DOWN"; exit 1; fi
REC
sudo chmod +x /usr/local/bin/emergency-recover.sh
EOF
```

#### Verify installation

```bash
ssh sin-supabase 'systemctl list-timers --all --no-pager | grep -E "cloudflared-watchdog|sinchat-healthcheck|sinchat-external"'
# Expected: 3 active timers
```
