# SSH Remote Tunnel — Mac via Cloudflare

Ermöglicht externen Agenten (z.B. v0 Web UI) Shell-Zugriff auf den lokalen Mac über einen Cloudflare Tunnel — **ohne sudo**, ohne offene Ports, ohne dynamische DNS.

> **Use case:** Agent in v0 Web-UI braucht Shell-Zugriff auf den lokalen Mac, um z.B. Docker-Container, OrbStack, oder lokale Scripts zu steuern.

---

## Architektur

```
┌────────────────────┐         ┌──────────────────────┐         ┌─────────────────┐
│  v0 Web UI Agent   │ ──SSH──▶│  Cloudflare Edge     │ ──tunnel─▶│  Mac (lokal)    │
│  (seinen Key mit)  │         │  ssh-mac.delqhi.com │           │  :2222 → sshd   │
└────────────────────┘         └──────────────────────┘         └─────────────────┘
```

- **Öffentlich:** `ssh-mac.delqhi.com` (DNS via Cloudflare)
- **Tunnel:** Cloudflare Tunnel `mac-ssh` (ID: `e2c2b9cd-eb90-41a0-b4ca-67f52e309675`)
- **Lokal:** sshd hört auf `localhost:2222` (nicht-privilegierter Port, kein sudo nötig)
- **Auth:** Public-Key-Only (siehe unten)

---

## Aktuelle Komponenten

| Komponente | Pfad | Status |
|------------|------|--------|
| Tunnel-Credentials | `~/.cloudflared/e2c2b9cd-eb90-41a0-b4ca-67f52e309675.json` | ✅ |
| Tunnel-Config | `~/.cloudflared/config-mac-ssh.yml` | ✅ |
| DNS-Route (CNAME) | `ssh-mac.delqhi.com → e2c2b9cd-eb90-41a0-b4ca-67f52e309675.cfargotunnel.com` | ✅ automatisch erstellt |
| sshd-Binary | `/usr/sbin/sshd` (macOS built-in) | ✅ |
| Host-Key (RSA) | `~/.ssh/host_rsa_key` | ✅ |
| Host-Key (ED25519) | `~/.ssh/host_ed25519_key` | ✅ |
| Tunnel-Prozess | `cloudflared tunnel --config ~/.cloudflared/config-mac-ssh.yml run mac-ssh` | muss gestartet werden (siehe unten) |
| sshd-Prozess | `/usr/sbin/sshd -p 2222 -h ~/.ssh/host_rsa_key -h ~/.ssh/host_ed25519_key` | muss gestartet werden (siehe unten) |

---

## Setup einmalig

### 1. Tunnel + DNS existieren bereits

```
cloudflared tunnel info mac-ssh
# → ID: e2c2b9cd-eb90-41a0-b4ca-67f52e309675
```

### 2. v0-Agent-Public-Key hinzufügen

Sobald der v0-Agent seinen SSH-Public-Key liefert (Format `ssh-ed25519 AAAA...` oder `ssh-rsa AAAA...`):

```bash
echo "ssh-ed25519 AAAA...v0agent" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. Tunnel + sshd starten (als launchd-Service, überlebt Reboot)

```bash
# Cloudflare Tunnel
cat > ~/Library/LaunchAgents/com.cloudflare.cloudflared.mac-ssh.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.cloudflare.cloudflared.mac-ssh</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/cloudflared</string>
    <string>tunnel</string>
    <string>--config</string>
    <string>/Users/simoneschulze/.cloudflared/config-mac-ssh.yml</string>
    <string>run</string>
    <string>mac-ssh</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/cloudflared-mac-ssh.log</string>
  <key>StandardErrorPath</key><string>/tmp/cloudflared-mac-ssh.log</string>
</dict>
</plist>
EOF

# sshd auf 2222
mkdir -p ~/Library/LaunchAgents/sshd-user
cat > ~/Library/LaunchAgents/sshd-user.plist <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>local.sshd</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/sbin/sshd</string>
    <string>-D</string>
    <string>-p</string><string>2222</string>
    <string>-h</string><string>/Users/simoneschulze/.ssh/host_rsa_key</string>
    <string>-h</string><string>/Users/simoneschulze/.ssh/host_ed25519_key</string>
    <string>-o</string><string>ListenAddress=127.0.0.1</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>/tmp/sshd-user.log</string>
  <key>StandardErrorPath</key><string>/tmp/sshd-user.log</string>
</dict>
</plist>
EOF

# Beide laden
launchctl load ~/Library/LaunchAgents/com.cloudflare.cloudflared.mac-ssh.plist
launchctl load ~/Library/LaunchAgents/sshd-user.plist
```

> **Hinweis:** User-level `launchd` läuft beim Login automatisch, auch über Reboots. Funktioniert nur, wenn `simoneschulze` eingeloggt ist. Für 24/7-Betrieb: System-Level `launchd` braucht sudo, oder ein always-on Mac.

---

## Verbindung testen (von einem anderen Mac oder via curl)

### Test mit `cloudflared` (kein eigener SSH-Key nötig)

```bash
cloudflared access ssh --hostname ssh-mac.delqhi.com --listener localhost:2222
# → Öffnet SSH-Session via Cloudflare Access (Browser-Login)
```

### Test mit echtem SSH (Public-Key vorausgesetzt)

```bash
ssh -i ~/.ssh/v0agent_key -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=~/.ssh/known_hosts_mac \
    simoneschulze@ssh-mac.delqhi.com -p 22
# Cloudflare leitet auf Mac:2222 weiter
```

Erwartete Ausgabe:
```
Welcome to Darwin
simoneschulze@MacBook-Pro-von-Jeremy ~ %
```

---

## Befehle die der v0-Agent damit ausführen kann

| Aufgabe | Befehl |
|---------|--------|
| Docker Container sehen | `docker ps` |
| Container (opensin-chat:demo-v5) | `docker logs openafd --tail 50` |
| Container neu starten | `docker restart openafd` |
| Cloudflare Cache leeren | siehe `cloudflare-wrangler-skill` |
| Frontend neu bauen | `cd /Users/jeremy/dev/OpenSIN-Chat/frontend && pnpm build` |
| Git Status | `cd /Users/jeremy/dev/OpenSIN-Chat && git status` |
| DB Status (sqlite) | `docker cp openafd:/app/server/storage/openafd.db /tmp/check.db && sqlite3 /tmp/check.db "SELECT COUNT(*) FROM workspaces;"` |

---

## Troubleshooting

### Tunnel connectet nicht

```bash
# Check ob cloudflared läuft
ps aux | grep "config-mac-ssh" | grep -v grep

# Check DNS
dig ssh-mac.delqhi.com +short
# → sollte CNAME auf *.cfargotunnel.com zeigen
```

### sshd nicht erreichbar

```bash
lsof -nP -iTCP:2222 -sTCP:LISTEN
# → Wenn leer: sshd starten
/usr/sbin/sshd -p 2222 -h ~/.ssh/host_rsa_key -h ~/.ssh/host_ed25519_key -D &
```

### Public-Key nicht akzeptiert

```bash
# Mac: check authorized_keys
cat ~/.ssh/authorized_keys
# sollte den v0-agent Public-Key enthalten

# sshd-Log checken
tail -f /tmp/sshd-user.log
```

### Rate-Limit / zu viele Auth-Versuche

```bash
# In ~/.ssh/sshd_config (oder launchd-args) setzen:
MaxAuthTries 3
MaxStartups 3:50:10
LoginGraceTime 30
```

---

## Sicherheits-Notes

- ✅ Public-Key-Auth only (kein Password-Login)
- ✅ Nur non-privileged Port (kein sudo, kein root-sshd)
- ✅ Tunnel zu Cloudflare läuft **outbound** (kein offener Port auf Mac-Firewall)
- ✅ Host-Keys sind user-generated (nicht die macOS-default, die man nicht ohne sudo nutzen kann)
- ⚠ **Wenn jemand `authorized_keys` kontrolliert → Shell auf Mac als `simoneschulze`**
- ⚠ `simoneschulze` ist ein Standard-Mac-User mit User-Switch-Rechten (kann via `su admin` zu root wechseln wenn Password bekannt)
- 🔒 Empfehlung: separater User `v0agent` ohne sudo, statt `simoneschulze` (TODO)

---

## Verwandte Skills

- **`cloudflare-wrangler-skill`** — für Cloudflare API + Worker deploys + DNS
- **`use-orbstack`** — für Container-Operationen (nicht `docker` direkt auf macOS)
- **`sin-codocs`** — Code-Documentation-Standard für neue Files wie dieses hier
