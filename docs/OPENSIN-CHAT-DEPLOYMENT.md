# OpenSIN-Chat Deployment — sinchat.delqhi.com

**Ziel:** Getrenntes Deployment für OpenSIN-Chat, **unabhängig** vom laufenden `openafd` (openafd.delqhi.com).

---

## Architektur

| Komponente | openafd (Original) | OpenSIN-Chat (Neu) |
|------------|-------------------|-------------------|
| **Container** | `openafd` | `opensin-chat` |
| **Interner Port** | 3001 | 3001 |
| **Externer Port (Host)** | 3001 | **43939** |
| **Domain** | openafd.delqhi.com | **sinchat.delqhi.com** |
| **Cloudflare Tunnel ID** | `32ab3b80-94b4-4911-aff1-fae5a3eae3c6` | `aa6a4715-1a4d-4cf9-a17e-ad27c53fee93` |
| **Tunnel Config** | `~/.cloudflared/config-openafd.yml` | `~/.cloudflared/config-opensin.yml` |
| **Storage** | `../server/storage` | `../server/storage-opensin` |
| **Launchd Label** | `com.sin-solver.cloudflared.plist` | `com.opensin.tunnel.plist` |
| **Health Endpoint** | `https://openafd.delqhi.com/api/ping` | `https://sinchat.delqhi.com/api/ping` |

---

## Docker Compose

**Datei:** `/Users/jeremy/dev/OpenAfD-Chat/docker-opensin/docker-compose.yml`

```yaml
name: opensin-chat
networks:
  opensin-chat:
    driver: bridge
services:
  opensin-chat:
    container_name: opensin-chat
    build:
      context: ../.
      dockerfile: ./docker/Dockerfile
      args:
        ARG_UID: ${UID:-1000}
        ARG_GID: ${GID:-1000}
    cap_add:
      - SYS_ADMIN
    volumes:
      - "./.env:/app/server/.env"
      - "../server/storage-opensin:/app/server/storage"
      - "../collector/hotdir/:/app/collector/hotdir"
      - "../collector/outputs/:/app/collector/outputs"
    user: "${UID:-1000}:${GID:-1000}"
    ports:
      - "43939:3001"
    env_file:
      - .env
    environment:
      - STORAGE_DIR=/app/server/storage
    networks:
      - opensin-chat
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

---

## Cloudflare Tunnel

**Config:** `~/.cloudflared/config-opensin.yml`
```yaml
tunnel: aa6a4715-1a4d-4cf9-a17e-ad27c53fee93
credentials-file: /Users/jeremy/.cloudflared/aa6a4715-1a4d-4cf9-a17e-ad27c53fee93.json
ingress:
  - hostname: sinchat.delqhi.com
    service: http://localhost:43939
  - service: http_status:404
```

**Tunnel erstellen:**
```bash
cloudflared tunnel create opensin-chat
cloudflared tunnel route dns opensin-chat sinchat.delqhi.com
```

**Manuell starten:**
```bash
nohup cloudflared tunnel --config ~/.cloudflared/config-opensin.yml run opensin-chat > /tmp/cloudflared-opensin.log 2>&1 &
```

**Launchd (Auto-Start):**
```bash
# Plist: ~/Library/LaunchAgents/com.opensin.tunnel.plist
launchctl load ~/Library/LaunchAgents/com.opensin.tunnel.plist
launchctl list | grep opensin
```

---

## Befehle (Cheat Sheet)

```bash
# Build & Start
cd /Users/jeremy/dev/OpenAfD-Chat/docker-opensin
docker compose build --no-cache
docker compose up -d

# Status
docker ps | grep opensin
curl -sS http://localhost:43939/api/ping

# Live test
curl -sS https://sinchat.delqhi.com/api/ping
curl -sS https://sinchat.delqhi.com/ | head -5

# Logs
docker logs opensin-chat -f
tail -f /tmp/cloudflared-opensin.log

# Stop
docker compose down
launchctl unload ~/Library/LaunchAgents/com.opensin.tunnel.plist
```

---

## Wichtige Regeln

1. **NIEMALS** `docker compose down/up` im `docker/` Verzeichnis für OpenSIN-Chat machen — das ist der alte `openafd` Container!
2. **NIEMALS** Port 3001 auf dem Host für OpenSIN-Chat nutzen — der gehört `openafd`.
3. **NIEMALS** `../server/storage` für OpenSIN-Chat mounten — nutzt `../server/storage-opensin`.
4. **Immer** `--no-cache` beim Build (sonst altes Frontend-Bundle).
5. **Vor jedem Deploy:** `lsof -i :43939` prüfen — kein anderer Prozess darf den Port blockieren.

---

## Verifizierung

```bash
# Lokal
curl -sS http://localhost:43939/api/ping
# → {"online":true}

# Live
curl -sS https://sinchat.delqhi.com/api/ping
# → {"online":true}

curl -sS https://sinchat.delqhi.com/ | grep -o "OpenAfD Chat"
# → OpenAfD Chat (Titel im HTML)
```

---

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Container nicht healthy | `docker logs opensin-chat` prüfen, DB-Lock → `storage-opensin` prüfen |
| Tunnel nicht erreichbar | `ps aux \| grep cloudflared \| grep opensin` → restart launchd |
| DNS nicht auflösbar | `cloudflared tunnel route dns opensin-chat sinchat.delqhi.com` |
| Build fails (ssh) | Dockerfile hat `git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"` im collector-stage |

---

## Nächste Schritte

- [ ] Auto-Deploy Script für OpenSIN-Chat (analog `scripts/auto-deploy.sh`) erstellen
- [ ] Separate `.env` für OpenSIN-Chat falls andere API-Keys nötig
- [ ] Monitoring / Alerting für beide Instanzen trennen