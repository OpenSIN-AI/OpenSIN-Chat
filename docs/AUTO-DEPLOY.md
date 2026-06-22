# Auto-Deploy (Lokaler Polling-Cron auf dem Mac)

> **Status:** Dieses Dokument beschreibt den **lokalen Mac**-Auto-Deploy. Die
> Produktions-Site `sinchat.delqhi.com` läuft seit der Migration auf der OCI VM
> `sin-supabase`. Für Produktions-Deploys siehe `docs/OPENSIN-CHAT-DEPLOYMENT.md`
> und `scripts/deploy-production.sh`. Ein Auto-Deploy für `sin-supabase` ist
> noch einzurichten.

Dieses Setup sorgt dafür, dass die **lokale** OpenSIN-Chat-Instanz automatisch
aktualisiert wird, sobald etwas auf den `main`-Branch gepusht wird.

## Wie es funktioniert

Der Mac prüft per cron (oder launchd) in einem festen Intervall, ob es neue
Commits auf `origin/main` gibt. Falls ja:

1. `git reset --hard origin/main` (Code aktualisieren)
2. `docker compose build --no-cache` (Image **frisch** bauen — wichtig fürs Frontend-Bundle)
3. `docker compose up -d` (Container neu starten)
4. Healthcheck gegen `http://localhost:43939/api/ping`

Das Skript dazu: [`scripts/auto-deploy.sh`](../scripts/auto-deploy.sh).

> **Warum `--no-cache`?** Ohne diesen Schalter darf Docker den Frontend-Build-Layer
> aus dem Cache wiederverwenden. Dann läuft `yarn build` nicht erneut und das alte
> JS-Bundle bleibt im Image — genau das war der ursprüngliche Bug.

## Einrichtung

### 1. Skript ausführbar machen

```bash
cd /pfad/zu/OpenSIN-Chat
chmod +x scripts/auto-deploy.sh
```

### 2. Einmal manuell testen

```bash
./scripts/auto-deploy.sh
# Ausgabe und Log prüfen:
cat logs/auto-deploy.log
```

### 3a. Per cron (einfachste Variante)

`crontab -e` öffnen und hinzufügen (alle 3 Minuten):

```cron
*/3 * * * * /pfad/zu/OpenSIN-Chat/scripts/auto-deploy.sh >> /pfad/zu/OpenSIN-Chat/logs/cron.log 2>&1
```

> Hinweis macOS: `cron` braucht ggf. "Full Disk Access" für `/usr/sbin/cron` in
> den Systemeinstellungen → Datenschutz & Sicherheit, sonst scheitert `docker`.

### 3b. Per launchd (empfohlen auf dem Mac, überlebt Reboots sauberer)

Datei `~/Library/LaunchAgents/com.opensin.autodeploy.plist` anlegen:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opensin.autodeploy</string>
    <key>ProgramArguments</key>
    <array>
        <string>/pfad/zu/OpenSIN-Chat/scripts/auto-deploy.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>180</integer>
    <key>StandardOutPath</key>
    <string>/pfad/zu/OpenSIN-Chat/logs/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>/pfad/zu/OpenSIN-Chat/logs/launchd.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
</dict>
</plist>
```

Laden:

```bash
launchctl load ~/Library/LaunchAgents/com.opensin.autodeploy.plist
# Status prüfen:
launchctl list | grep opensin
```

Entladen (zum Stoppen):

```bash
launchctl unload ~/Library/LaunchAgents/com.opensin.autodeploy.plist
```

## Konfiguration (Umgebungsvariablen)

Das Skript funktioniert ohne Anpassung, lässt sich aber über Env-Vars steuern:

| Variable | Standard | Bedeutung |
|---|---|---|
| `OPENAFD_REPO_DIR` | Auto (Skript-Pfad) | Repo-Wurzel |
| `OPENAFD_BRANCH` | `main` | Branch, der deployt wird |
| `OPENAFD_COMPOSE_FILE` | `docker-opensin/docker-compose.yml` | compose-Datei |
| `OPENAFD_HEALTH_URL` | `http://localhost:43939/api/ping` | Healthcheck-URL |
| `OPENAFD_LOG_FILE` | `<repo>/logs/auto-deploy.log` | Logdatei |

## Troubleshooting

- **Online immer noch alt nach Deploy?** Zuerst prüfen ob ein **rogue Node-Prozess**
  Port 3001 blockiert: `lsof -i :3001 -P -n`. Wenn dort `node *:3001 (LISTEN)` steht
  (nicht Docker/OrbStack), wurde ein manuelles `node index.js` aus `/server/`
  gestartet. Töten mit `kill <PID>`, dann Docker und Cloudflared neustarten.
  Danach Browser Hard-Reload (`Cmd+Shift+R`).
- **502 Bad Gateway auf sinchat.delqhi.com?** Produktion läuft auf `sin-supabase` — siehe `docs/OPENSIN-CHAT-DEPLOYMENT.md`. Lokal: prüfen ob `restart: always` fehlt (`docker ps | grep opensin-chat`). Fix: `docker update --restart always opensin-chat && docker start opensin-chat`.
- **`docker: command not found` im cron-Log?** `PATH` im launchd-plist bzw. cron
  ergänzen (Docker Desktop liegt oft unter `/usr/local/bin`).
- **Build dauert lange / blockiert?** Der `flock`-Lock verhindert überlappende
  Läufe — ein zweiter cron-Tick wird übersprungen, bis der Build fertig ist.
- **Logs ansehen:** `tail -f logs/auto-deploy.log`
