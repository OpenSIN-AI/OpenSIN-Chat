# Plan für Agent 6: Container-Start-Blocker fixen (#86) + #87 Collector-Bugs

## Kontext

**WICHTIGSTE Erkenntnis:** Der Container **`opensin-chat:local-v7` startet nicht** wegen 4 zusammenhängender Bugs. Issue #86 ist deshalb **P0 BLOCKER** — ohne Container kann Issue #84 (B4-Migration) nicht verifiziert werden, kann keine DB gefüllt werden, kann keine Endpoints getestet werden.

**Agent 5 hat exzellente Arbeit abgeliefert** (5 Commits auf main verifiziert, 38/38 Tests grün, AC1+AC2+AC6+AC7 alle ✅). Nur die letzten 3 ACs (AC3+AC4+AC5 = Runtime-Verifikation gegen DB) sind ausstehend — und die brauchen einen laufenden Container.

## Aufgaben für Agent 6 (in dieser Reihenfolge!)

### Phase A: #86 fixen — Container startet (P0, ~1-2h)

**Schritt 1: `docker/.env` Directory zu File machen**
```bash
# ACHTUNG: Backup machen, falls was drin ist
ls -la /Users/jeremy/dev/OpenSIN-Chat/docker/.env/
# Wenn Dateien drin, sichern. Sonst einfach:
rm -rf /Users/jeremy/dev/OpenSIN-Chat/docker/.env

# .env.example als Vorlage kopieren
cp /Users/jeremy/dev/OpenSIN-Chat/docker/.env.example /Users/jeremy/dev/OpenSIN-Chat/docker/.env
chmod 600 /Users/jeremy/dev/OpenSIN-Chat/docker/.env

# Keys generieren
SIG_KEY=$(openssl rand -hex 32)   # 64 hex chars
SIG_SALT=$(openssl rand -hex 16)  # 32 hex chars
# JWT_SECRET wird auto-generiert durch ensureJwtSecret.js

# In .env eintragen (oder via updateENV helper)
sed -i "s|# SIG_KEY='passphrase'|SIG_KEY='${SIG_KEY}'|" /Users/jeremy/dev/OpenSIN-Chat/docker/.env
sed -i "s|# SIG_SALT='salt'|SIG_SALT='${SIG_SALT}'|" /Users/jeremy/dev/OpenSIN-Chat/docker/.env
```

**Schritt 2: `docker-compose.yml` Environment ergänzen**
```yaml
# In docker-compose.yml, services.opensin-chat:
    environment:
      - STORAGE_DIR=/app/server/storage
      - SIG_KEY=${SIG_KEY}
      - SIG_SALT=${SIG_SALT}
      - SERVER_PORT=3001
      - OPENSIN_CHAT_RUNTIME=docker
    env_file:
      - .env
```

**Schritt 3: `Dockerfile` .env COPY prüfen**
- Zeile 51/120: `COPY --chown=openafd:openafd ./docker/.env.example /app/server/.env`
- **Variante A (empfohlen):** COPY entfernen, rely on volume mount
- **Variante B:** COPY behalten aber `ensureJwtSecret.js`-Pattern erweitern für SIG_KEY/SIG_SALT

**Schritt 4: Healthcheck fixen — `/api/ping` vs `/ping`**

**Wahl:** Variante A (empfohlen — sauber, Doku-konsistent):
```bash
# In server/endpoints/system.js, Z.75:
# VORHER: app.get("/ping", ...)
# NACHHER: app.get("/api/ping", ...) — ABER: das mounted unter /api, also wäre echter Pfad /api/api/ping. FALSCH!

# KORREKT: Entweder in system.js "/ping" behalten UND in server/index.js vor app.use mounten:
# In server/index.js, VOR `app.use("/api", apiRouter)`:
systemEndpoints(app);  # damit /ping auf root läuft
# UND die zweite Zeile systemEndpoints(apiRouter); entfernen
```

ODER Variante B (einfacher — healthcheck anpassen):
```bash
# In docker/docker-healthcheck.sh Z.4:
# VORHER: http://localhost:3001/api/ping
# NACHHER: http://localhost:3001/ping
```

**Doku auch fixen:** `docs/architecture.md` Z.183/293/296/321

**Schritt 5: Container neu bauen + testen**
```bash
cd /Users/jeremy/dev/OpenSIN-Chat
docker build -f docker/Dockerfile -t opensin-chat:local-v8 . 2>&1 | tail -10
# Build dauert 10-15 min
docker run -d --name openafd-test \
  -p 3002:3001 \
  -v openafd-storage:/app/server/storage \
  -e STORAGE_DIR=/app/server/storage \
  opensin-chat:local-v8
sleep 30
docker ps
# Status: healthy
docker logs openafd-test 2>&1 | tail -20
# Kein TypeError, beide Prozesse laufen
curl http://localhost:3002/ping
# {"online":true}  ODER  curl http://localhost:3002/api/ping (je nach Variante)
```

**Verifikations-Output für #86:**
- Container: `healthy` in `docker ps`
- `curl /ping` (oder `/api/ping`): 200
- `docker logs`: kein TypeError, beide Prozesse (server + collector) laufen

### Phase B: #84 LIVE testen — DB-Befüllung (~1-2h)

**Voraussetzung:** Phase A erfolgreich (Container läuft)

**Schritt 1: Sync-Job ausführen**
```bash
docker exec openafd-test node /app/server/jobs/sync-politician-data.js 2>&1 | tail -20
# Erwartet: 733 Mandate verarbeitet, 700+ in DB
```

**Schritt 2: AC3-AC5 verifizieren**
```bash
# AC3: DB-Count
docker exec openafd-test sqlite3 /app/server/storage/openafd.db "SELECT COUNT(*) FROM politicians"
# Erwartet: 700+

# AC4: Search
curl "http://localhost:3002/api/politician/search?q=Weidel"
# Erwartet: 1+ Treffer (Alice Weidel ist AfD-Vorsitzende)

# AC5: Stats
curl "http://localhost:3002/api/politician/stats"
# Erwartet: non-zero Counts
```

**Schritt 3: Falls erfolgreich: #84 schließen**
- Alle 7 ACs erfüllt
- Comment mit Verifikations-Outputs
- Issue → closed

### Phase C: #87 — Collector Hardcoded Paths (optional, ~1h)

**Nur wenn Zeit:** Einheitliche `getStoragePath()` Helper-Funktion
- Datei: `server/utils/paths.js` + `collector/utils/paths.js`
- Migration der 7 betroffenen Stellen
- Tests grün

## Commit-Strategie

**Pro Bug ein Commit:**
1. `fix(docker): make docker/.env a file with valid keys (#86)` 
2. `fix(docker): add STORAGE_DIR to docker-compose environment (#86)`
3. `fix(healthcheck): correct /api/ping vs /ping endpoint mismatch (#86)`
4. `docs(architecture): fix /api/ping references (#86)`
5. Optional: `refactor(server+collector): add getStoragePath() helper (#87)`

**Niemals force-push. Niemand pusht — ich (Haupt-Agent) pushe am Ende.**

## Wichtige Regeln

- **NIEMALS** alte Images löschen (mindestens v7 als Rollback)
- **NIEMALS** `docker volume rm openafd-storage` (DB-Daten!)
- Bei Build-Fehlern: ABBRECHEN, Haupt-Agent fragen
- **Vor jedem Edit: `git pull --rebase origin main`**
- **Nach jedem Schritt: Tests + Lint prüfen**
- Wenn Container crasht: `docker logs openafd-test` lesen, NICHT neu starten

## Tests + Lint nach Änderungen

```bash
# Server tests (müssen grün bleiben)
cd /Users/jeremy/dev/OpenSIN-Chat/server
npx jest 2>&1 | tail -5
# Erwartet: 308+ tests passing

# Frontend tests
cd /Users/jeremy/dev/OpenSIN-Chat/frontend
npx vitest run --reporter=dot 2>&1 | tail -5
# Erwartet: 204+ tests passing

# Vulnerabilities
cd /Users/jeremy/dev/OpenSIN-Chat
npm audit 2>&1 | tail -2  # server
cd frontend && npm audit 2>&1 | tail -2  # frontend
# Erwartet: 0 vulnerabilities
```

## Aktueller Stand auf main

- HEAD: `35016ea1` (Agent 5 B4-Migration)
- 308+ Server Tests passing
- 204 Frontend Tests passing  
- 0 Vulnerabilities
- Issue #84: 6/7 ACs erfüllt, wartet auf Container-Runtime-Verifikation
- Issue #86: NEU, P0 BLOCKER
- Issue #87: NEU, kleinere Bugs

## Verifikations-Commands (Copy-Paste ready)

```bash
# Aktueller Status
cd /Users/jeremy/dev/OpenSIN-Chat
git pull --rebase origin main
git log --oneline -5

# Check existing state
file docker/.env
ls -la docker/.env
docker images | grep opensin-chat
docker ps -a
```

## Erwartetes Ergebnis nach Agent 6

1. `docker/.env` ist eine Datei mit validen Keys
2. `docker-compose.yml` hat `STORAGE_DIR` in environment
3. `Dockerfile` .env COPY entweder weg ODER funktional
4. Healthcheck URL stimmt mit Endpoint überein
5. Container `opensin-chat:local-v8` startet und bleibt `healthy`
6. Sync-Job befüllt DB mit 700+ Politikern
7. `/api/politician/search?q=Weidel` liefert 1+ Treffer
8. Issue #86 + #84 können geschlossen werden

**Viel Erfolg! 🚀**
