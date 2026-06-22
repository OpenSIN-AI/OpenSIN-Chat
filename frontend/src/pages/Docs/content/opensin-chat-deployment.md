# OpenSIN-Chat Deployment — sinchat.delqhi.com

**Ziel:** Getrenntes Deployment für OpenSIN-Chat, **unabhängig** vom laufenden `openafd` (sinchat.delqhi.com).

**Wichtig:** Produktion läuft auf der OCI VM `sin-supabase` (`92.5.60.87`), **nicht** mehr auf dem lokalen Mac. Der Mac-Port 43939 ist nur noch für lokale Entwicklung/Tests.

---

## Architektur

| Komponente | openafd (Original) | OpenSIN-Chat (Produktion) |
|------------|-------------------|-------------------|
| **Host** | lokaler Mac | OCI VM `sin-supabase` (`92.5.60.87`) |
| **Container** | `openafd` | `opensin-app` |
| **Interner Port** | 3001 | 3001 |
| **Externer Port (Host)** | 3001 | **38471** |
| **Domain** | sinchat.delqhi.com | **sinchat.delqhi.com** |
| **Cloudflare Tunnel ID** | `32ab3b80-94b4-4911-aff1-fae5a3eae3c6` | `aa6a4715-1a4d-4cf9-a17e-ad27c53fee93` |
| **Tunnel Config** | `~/.cloudflared/config-openafd.yml` | `~/.cloudflared/config-opensin.yml` (auf `sin-supabase`) |
| **Storage** | `../server/storage` | `../server/storage-opensin` |
| **Health Endpoint** | `https://sinchat.delqhi.com/api/ping` | `https://sinchat.delqhi.com/api/ping` |

---

## Docker Compose

**Base:** `docker-opensin/docker-compose.yml` — lokale Entwicklung (Port 43939, Container `opensin-chat`).

**Produktion:** `docker-opensin/docker-compose.production.yml` — OCI VM (Port 38471, Container `opensin-app`, mehr CPU/RAM). Beide Dateien zusammen:

```bash
cd docker-opensin
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d
```

Der Base-Port und der Container-Name sind per Env-Var überschreibbar. Auf
`sin-supabase` muss `docker-opensin/.env` diese Werte enthalten:

```bash
COMPOSE_PORT=38471
COMPOSE_CONTAINER_NAME=opensin-app
```

| Variable | Standard | Produktion |
|---|---|---|
| `COMPOSE_PORT` | `43939` | `38471` |
| `COMPOSE_CONTAINER_NAME` | `opensin-chat` | `opensin-app` |

---

## Cloudflare Tunnel

**Config auf `sin-supabase`:** `~/.cloudflared/config-opensin.yml`
```yaml
tunnel: aa6a4715-1a4d-4cf9-a17e-ad27c53fee93
credentials-file: ~/.cloudflared/aa6a4715-1a4d-4cf9-a17e-ad27c53fee93.json
ingress:
  - hostname: sinchat.delqhi.com
    service: http://localhost:38471
  - service: http_status:404
```

> **Hinweis:** Der Tunnel-Connector läuft auf der OCI VM (`sin-supabase`), nicht auf dem Mac. Die Mac-Konfiguration (`com.opensin.tunnel.plist`) ist veraltet und sollte entladen werden, falls sie noch aktiv ist.

**Tunnel-Status prüfen (vom Mac):**
```bash
ssh sin-supabase 'docker ps | grep opensin && curl -sS http://localhost:38471/api/ping'
```

**Manuell auf `sin-supabase` starten (nur im Notfall):**
```bash
ssh sin-supabase
nohup cloudflared tunnel --config ~/.cloudflared/config-opensin.yml run opensin-chat > /tmp/cloudflared-opensin.log 2>&1 &
```

---

## Befehle (Cheat Sheet)

### Produktion (`sin-supabase`)

```bash
# One-Shot Deploy (vom Mac aus)
ssh sin-supabase 'bash -s' < /Users/jeremy/dev/OpenSIN-Chat/scripts/deploy-production.sh

# Oder manuell auf der VM
cd ~/OpenSIN-Chat/docker-opensin
git pull origin main
docker compose -f docker-compose.yml -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d

# Status
docker ps | grep opensin
curl -sS http://localhost:38471/api/ping
```

### Lokale Entwicklung (Mac)

```bash
cd /Users/jeremy/dev/OpenSIN-Chat/docker-opensin
docker compose build --no-cache
docker compose up -d

# Status
docker ps | grep opensin
curl -sS http://localhost:43939/api/ping

# Stop
docker compose down
```

### Live-Test

```bash
curl -sS https://sinchat.delqhi.com/api/ping
curl -sS https://sinchat.delqhi.com/ | head -5
```

### Logs

```bash
# Produktion (auf sin-supabase)
ssh sin-supabase 'docker logs opensin-app -f'

# Lokal (Mac)
docker logs opensin-chat -f
```

---

## Wichtige Regeln

1. **NIEMALS** `docker compose down/up` im `docker/` Verzeichnis für OpenSIN-Chat machen — das ist der alte `openafd` Container!
2. **NIEMALS** Port 3001 auf dem Host für OpenSIN-Chat nutzen — der gehört `openafd`.
3. **NIEMALS** `../server/storage` für OpenSIN-Chat mounten — nutzt `../server/storage-opensin`.
4. **Immer** `--no-cache` beim Build (sonst altes Frontend-Bundle).
5. **Vor jedem lokalen Deploy:** `lsof -i :43939` prüfen — kein anderer Prozess darf den Port blockieren.
6. **Produktion nutzt immer das Override:** `docker compose -f docker-compose.yml -f docker-compose.production.yml ...` auf `sin-supabase`.
7. **Mac-Cloudflared Tunnel muss auf `sin-supabase` laufen.** Falls die alte Mac-Plist noch aktiv ist: `launchctl unload ~/Library/LaunchAgents/com.opensin.tunnel.plist`.

---

## Verifizierung

```bash
# Produktion (auf sin-supabase)
ssh sin-supabase 'curl -sS http://localhost:38471/api/ping'
# → {"online":true}

# Live
curl -sS https://sinchat.delqhi.com/api/ping
# → {"online":true}

curl -sS https://sinchat.delqhi.com/ | grep -o "OpenSIN Chat"
# → OpenSIN Chat (Titel im HTML)
```

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| 502 Bad Gateway | Container tot weil kein `restart: always`. Fix: `docker update --restart always opensin-app && docker start opensin-app` (auf `sin-supabase`). |
| Container nicht healthy / crashed | `ssh sin-supabase 'docker logs opensin-app'` prüfen; DB fehlt Tabelle → DB von openafd kopieren. |
| Tunnel nicht erreichbar | Cloudflared läuft auf `sin-supabase`: `ssh sin-supabase 'pgrep -a cloudflared'` und ggf. neustarten. |
| DNS nicht auflösbar | `cloudflared tunnel route dns opensin-chat sinchat.delqhi.com` (auf `sin-supabase`). |
| Build fails (ssh) | Dockerfile hat `git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"` im collector-stage. |

---

## Nächste Schritte

- [x] Produktions-Deploy-Script (`scripts/deploy-production.sh`) erstellt
- [ ] Auto-Deploy für `sin-supabase` (cron/systemd) einrichten
- [ ] Monitoring / Alerting für beide Instanzen trennen