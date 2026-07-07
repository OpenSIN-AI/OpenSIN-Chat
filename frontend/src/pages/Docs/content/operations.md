<!-- SPDX-License-Identifier: MIT -->

# OpenSIN Chat — Operations-Runbook

> **Zielgruppe:** Betreiber, Admin, DevOps  
> **Scope:** Täglicher Betrieb, Updates, Backups, Troubleshooting  
> **Stand:** 2026-06-22  
> **Kurzform:** Container laufen auf `sin-supabase`; Deploy via `scripts/deploy-production.sh`; Health-Check alle 30 Sekunden.

---

## 1. Gesundheits-Checkliste (alle 24h)

Ein gesunder OpenSIN-Chat hat alle folgenden Punkte grün:

| Check | Befehl (OCI-VM) | Erwartet |
|---|---|---|
| Container läuft | `ssh sin-supabase 'docker ps --filter name=opensin-chat'` | Status `Up` |
| Tunnel aktiv | `ssh sin-supabase 'systemctl is-active cloudflared'` | `active` |
| Web erreichbar | `curl -I https://sinchat.delqhi.com/` | HTTP 2xx/3xx |
| DNS korrekt | `dig sinchat.delqhi.com CNAME` | `sinchat.delqhi.com.cdn.cloudflare.net.` |
| Logs sauber | `ssh sin-supabase 'journalctl -u cloudflared --since="-5 min"'` | Keine Errors |
| Speicherplatz | `ssh sin-supabase 'df -h /'` | < 80 % |

---

## 2. Standard-Deploy

### 2.1 Produktions-Deploy (empfohlen)

Vom Entwickler-Laptop:

```bash
cd /Users/jeremy/dev/OpenSIN-Chat
ssh sin-supabase 'bash -s' < scripts/deploy-production.sh
```

Das Skript:

1. Pullt `main` auf der OCI-VM.
2. Baut das Docker-Image neu (`--no-cache`).
3. Startet Container und Abhängigkeiten neu.
4. Führt einen Health-Check durch.

### 2.2 Schnelles Frontend-Update (ohne Image-Rebuild)

Nur bei reinen Frontend-Änderungen:

```bash
cd frontend
npx vite build
ssh sin-supabase 'docker cp -L frontend/dist/. opensin-chat:/app/server/public/'
```

> Achtung: Bei Dockerfile- oder Dependency-Änderungen immer den vollständigen Deploy ausführen.

---

## 3. Backup-Strategie

### 3.1 Was muss gesichert werden?

| Pfad | Inhalt | Backup-Häufigkeit |
|---|---|---|
| `docker/.env` | Secrets, LLM-Config | Bei jeder Änderung |
| `server/storage/opensin.db` | SQLite-DB | Täglich |
| `server/storage/uploads/` | Hochgeladene Dokumente | Täglich |
| `server/storage/vectors/` | Vektor-Indizes | Täglich |
| `~/.cloudflared/` | Tunnel-Credentials | Einmalig, sicher aufbewahren |
| `~/.auth-token-production` | Auth-Token | Einmalig, sicher aufbewahren |

### 3.2 Automatisiertes Backup-Beispiel

```bash
# Auf der OCI-VM ausführen
BACKUP_DIR="/var/backups/opensin-chat/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

docker cp opensin-chat:/app/server/storage/opensin.db "$BACKUP_DIR/"
docker cp opensin-chat:/app/server/storage/uploads "$BACKUP_DIR/"
docker cp opensin-chat:/app/server/storage/vectors "$BACKUP_DIR/"

# Optional: Backup verschlüsselt an Remote-Ziel senden
# rsync -avz "$BACKUP_DIR" backup-host:/backups/
```

---

## 4. Wartung & Neustart

### 4.1 Container manuell neustarten

```bash
ssh sin-supabase 'docker compose -f /home/ubuntu/OpenSIN-Chat/docker-opensin/docker-compose.yml restart opensin-chat'
```

### 4.2 Alles neu aufbauen

```bash
ssh sin-supabase << 'EOF'
cd /home/ubuntu/OpenSIN-Chat/docker-opensin
docker compose down
docker compose build --no-cache
docker compose up -d
EOF
```

### 4.3 Logs eines Containers ansehen

```bash
# OpenSIN-Chat Server
ssh sin-supabase 'docker logs -f --tail 100 opensin-chat'

# Supabase-Dienste
ssh sin-supabase 'docker logs -f --tail 50 supabase-db'
```

---

## 5. Häufige Probleme

### 5.1 Cloudflare Error 1033 / 521 / 522 / 523

Siehe [`docs/INCIDENT-RESPONSE.md`](./INCIDENT-RESPONSE.md) für die vollständige Recovery-Prozedur.

### 5.2 Frontend-Änderungen werden nicht angezeigt

- Browser-Cache löschen (oder `Ctrl+Shift+R`).
- Prüfen, ob `server/public/` aktuell ist: `docker exec opensin-chat ls -la /app/server/public/`
- Falls veraltet: Schnelles Frontend-Update ausführen (§ 2.2).

### 5.3 Politiker-DB ist leer

```bash
# Sync manuell triggern
curl -X POST "https://sinchat.delqhi.com/api/politician/sync/trigger" \
  -H "Authorization: Bearer $(cat ~/.auth-token-production | grep AUTH_TOKEN | cut -d= -f2)"
```

### 5.4 LLM-Provider antwortet nicht

- Prüfe `LLM_PROVIDER` und `LLM_API_KEY` in `docker/.env`.
- Prüfe Netzwerk vom Container: `docker exec opensin-chat curl -I https://api.openai.com`
- Logs: `docker logs opensin-chat | grep -i "provider\|llm"`

### 5.5 Collector-Service offline

Im Single-User-Modus ist der Python-Collector-Service absichtlich nicht gestartet, wenn keine Dokumentenverarbeitung benötigt wird. Dokumente können trotzdem hochgeladen werden, die Verarbeitung erfolgt dann im Hauptprozess.

---

## 6. Monitoring-Checkpoints

| Metrik | Wie prüfen | Warnschwelle |
|---|---|---|
| CPU | `ssh sin-supabase 'top -bn1'` | > 80 % über 5 Min |
| RAM | `ssh sin-supabase 'free -h'` | > 85 % |
| Disk | `ssh sin-supabase 'df -h /'` | > 80 % |
| Container-Uptime | `docker ps --format "{{.Names}} {{.Status}}"` | < 24h unerwartet |
| API-Latenz | `curl -w "%{time_total}" https://sinchat.delqhi.com/api/health` | > 2s |

---

## 7. Update-Workflow für Upstream-Sicherheitspatches

1. Upstream-Fetch: `git fetch upstream`
2. Patch-Gruppen prüfen: `scripts/upstream-sync/apply-patches.sh --dry-run`
3. Sicherheits-Patches zuerst anwenden (Group 01).
4. Lokal testen: `cd frontend && yarn build && yarn test`
5. Deploy via `scripts/deploy-production.sh`.
6. Health-Check und Smoke-Test durchführen.

---

## 8. Incident-Eskalation

| Symptom | Erste Maßnahme | Eskalation |
|---|---|---|
| Dienst komplett offline | `emergency-recover.sh` ausführen | Cloudflare- + OCI-Console prüfen |
| Datenverlust | Letztes Backup einspielen | Incident-Response-Dokument folgen |
| Security-Breach | Secrets rotieren, Container neu aufbauen | Schwachstelle per privatem Channel melden |
| Performance-Degradation | Logs + Ressourcen prüfen | Scale-Out-Plan aktivieren |

---

## 9. Nützliche Links

- [`docs/INCIDENT-RESPONSE.md`](./INCIDENT-RESPONSE.md) — Vollständiges Incident-Response-Playbook
- [`docs/OPENSIN-CHAT-DEPLOYMENT.md`](./OPENSIN-CHAT-DEPLOYMENT.md) — Deployments-Anleitung
- [`docs/security.md`](./security.md) — Sicherheits-Handbuch
- [`scripts/deploy-production.sh`](https://github.com/OpenSIN-AI/OpenSIN-Chat/blob/main/scripts/deploy-production.sh) — Deploy-Skript

---

*Generated: 2026-06-22 | OpenSIN Chat Operations Runbook | SPDX-License-Identifier: MIT*
