# Plan für Agent 5: B4 Migration — 21. Wahlperiode API-Refactor (#84)

## Kontext
- Issue #66 (DB-Befüllung) wurde als not-planned geschlossen
- Root Cause: APIs sind für 20. WP (2017-2021) hartcodiert, jetzt 21. WP (2021-2025)
- **Abgeordnetenwatch parliament_period=132** = 21. WP, **733 Mandate** verifiziert
- **Bundestag-Endpoint `Abgeordnete20_WP.formular`** ist tot (404)
- **Doku bereits vorhanden:** `docs/DATA-SOURCES.md`, `docs/PLAN-DATA-SYNC.md` (Workstream B4)
- **Issue:** #84 (EPIC, 6-9h)

## API-Status (verifiziert 2026-06-08)

### Abgeordnetenwatch API v2.9.0 ✅
- **Alter Code (kaputt):** `/parliament-period/?parliament=111`
- **Neuer Endpoint:** `/candidacies-mandates?parliament_period=132`
- **733 Mandate** für 21. WP verfügbar
- **Neue Felder:** `first_name`, `last_name`, `year_of_birth` (nicht `birthDate`!), `ext_id_bundestagsverwaltung`
- **API-Doku:** https://www.abgeordnetenwatch.de/api/v2

### Bundestag API ❌
- **Alter Code (kaputt):** `https://www.bundestag.de/SiteGlobals/Functions/Abgeordnetensuche/Abgeordnete20_WP.formular` → 404
- **JSON-Endpoint:** DIP API auf `dip.bundestag.de/api/v1/...` (SPA, schlecht dokumentiert)
- **Alternative:** `MdB-Stammdaten.zip` (XML-Export aller Abgeordneten seit 1949, Stand 29.04.2026)
- **Open Data:** https://www.bundestag.de/services/opendata

## Aufgaben für Agent 5 (in dieser Reihenfolge)

### Phase A: AW API-Client refactoren (~2-3h)

**Datei:** `server/utils/politician/abgeordnetenwatchApi.js`

**Änderungen:**
1. Neue Env-Var `AW_PARLIAMENT_PERIOD=132` (statt hardcoded `parliament=111`)
2. Endpoint-URL: `/candidacies-mandates?parliament_period=${AW_PARLIAMENT_PERIOD}` 
3. Felder-Mapping:
   - `firstName` → `first_name`
   - `lastName` → `last_name`
   - `birthDate` → `year_of_birth`
   - `party` (object) → `party.entity.short_name` oder `label`
4. Pagination-Loop: alle 8 Seiten à 100 (= 733 Mandate)
5. Neue ID-Normalisierung: `aw-${id}` bleibt, `bundestag-${id}` für Fallback
6. **`fetchAllPoliticians()` bleibt** für Rückwärtskompatibilität, aber nutzt neuen Endpoint

**Test-Datei:** `server/utils/politician/abgeordnetenwatchApi.test.js` (existiert?)
- Falls nein: erstellen mit mindestens 3 Tests
- Test gegen Live-API: `https://www.abgeordnetenwatch.de/api/v2/candidacies-mandates?parliament_period=132&range_end=5`

**Commit-Format:** `feat(server): refactor AW API client for 21. WP (parliament_period=132) (#84)`

### Phase B: Bundestag API-Client refactoren (~3-4h)

**Datei:** `server/utils/politician/bundestagApi.js`

**Optionen (in Reihenfolge versuchen):**
1. **Versuch 1:** `Abgeordnete21_WP.formular` (mit Wahltperiode 21 statt 20)
2. **Versuch 2:** DIP API `https://dip.bundestag.de/api/v1/mitglieder?wp=21&limit=100`
3. **Versuch 3:** XML-Export parsen von `MdB-Stammdaten.zip` (Stand 29.04.2026)

**Strategy:** 
- Versuch 1 + 2 in `fetchAllMembers()` implementieren
- Bei beiden 404: Fallback zu XML-Export (lokaler Cache im `server/storage/cache/`)
- Env-Var `BUNDESTAG_WAHLPERIODE=21` (existiert bereits!)

**Test-Datei:** `server/utils/politician/bundestagApi.test.js`
- Mock-Fallback testen (Bundle-Download + XML-Parse)

**Commit-Format:** `feat(server): refactor Bundestag API client for 21. WP (#84)`

### Phase C: Sync-Job testen + Doku (~1-2h)

**Datei:** `server/jobs/sync-politician-data.js`

**Schritte:**
1. `npx prisma migrate deploy` (laufen lassen)
2. `node server/jobs/sync-politician-data.js` direkt ausführen
3. Logs prüfen: sollten 700+ Mandate zeigen
4. `curl http://localhost:3001/api/politician/stats` testen
5. Falls Phase 1+2 erfolgreich: Phase 3 (Plenarprotokolle) separat testen

**Doku-Updates:**
- `docs/DATA-SOURCES.md` aktualisieren mit:
  - Neuer AW-Endpoint `/candidacies-mandates?parliament_period=132`
  - Neue Felder (`first_name`, `last_name`, `year_of_birth`)
  - Bundestag-URL-Updates
- `docs/PLAN-DATA-SYNC.md` Workstream B4 abhaken

**Commit-Format:** `docs(server): update DATA-SOURCES.md for 21. WP migration (#84)`

## Akzeptanzkriterien (aus #84)

- [ ] `grep -rn 'parliament=111' server/` → 0 Treffer
- [ ] `grep -rn 'Abgeordnete20_WP' server/` → 0 Treffer
- [ ] Sync-Job befüllt DB mit ≥700 Bundestagsabgeordneten
- [ ] `/api/politician/search?q=Weidel` liefert ≥1 Treffer
- [ ] `/api/politician/stats` zeigt non-zero Counts
- [ ] Tests für API-Clients grün
- [ ] `docs/DATA-SOURCES.md` aktualisiert

## Commit-Strategie
- 3-5 Commits (eines pro Phase A/B/C + ggf. test fixes)
- Conventional Commits: `feat(server): ...`, `docs(server): ...`, `test(server): ...`
- **Pushe NICHT** — nur lokal committen, Haupt-Agent pusht am Ende
- **Niemals force-pushen**
- **Niemals Branches erstellen** — direkt auf main arbeiten

## Wichtige Regeln
- NIEMALS Branches (alles auf main)
- NIEMALS force-push
- Bei API-Calls: max 500ms zwischen Requests (Rate-Limit)
- Bei Fehlern: **ABBRUCH** und Haupt-Agent fragen, nicht endlos debuggen
- **Andere Agenten laufen parallel** — vor jedem Push: `git pull --rebase origin main`

## Test-Strategie

**WICHTIG:** Vor jedem Commit:
```bash
cd /Users/jeremy/dev/OpenSIN-Chat/server
npx jest --testPathPattern="abgeordnetenwatchApi|bundestagApi|sync-politician-data" 2>&1
# Alle Tests müssen grün sein
```

**Live-API-Test (manuell):**
```bash
curl "https://www.abgeordnetenwatch.de/api/v2/candidacies-mandates?parliament_period=132&range_end=5" | head -c 500
# Sollte JSON liefern
```

## Aktueller Stand auf main
- HEAD: `bb98a7f6` (ESLint-Regel)
- 204/204 Frontend Tests passing
- 308/308 Server Tests passing
- 0 Vulnerabilities
- 74 Frontend Test-Dateien
- Issue #84 ist neu erstellt, **kein Agent arbeitet daran**

## API-Verifikations-Commands

```bash
# AW API v2.9.0 - funktioniert
curl "https://www.abgeordnetenwatch.de/api/v2/candidacies-mandates?parliament_period=132&range_end=5" | python3 -c "
import sys, json
d = json.load(sys.stdin)
items = d.get('data', [])
print(f'Received {len(items)} mandates')
for item in items[:2]:
    pol = item.get('politician', {})
    print(f\"  {pol.get('first_name')} {pol.get('last_name')}\")
"

# Bundestag - vermutlich 404
curl -s -o /dev/null -w "%{http_code}" \
  "https://www.bundestag.de/SiteGlobals/Functions/Abgeordnetensuche/Abgeordnete21_WP.formular"
# 404 erwartet

# Bundestag Open Data - funktioniert
curl -s -o /dev/null -w "%{http_code}" "https://www.bundestag.de/services/opendata"
# 200 erwartet
```

## Erwartete Outputs

**Nach Phase A:**
- `abgeordnetenwatchApi.js` nutzt `parliament_period=132`
- Felder-Mapping korrekt
- `fetchAllPoliticians()` liefert 733 Mandate

**Nach Phase B:**
- `bundestagApi.js` nutzt 21. WP (oder Fallback zu XML-Export)
- `fetchAllMembers()` liefert 700+ Abgeordnete

**Nach Phase C:**
- `sync-politician-data.js` läuft end-to-end
- DB hat 700+ Politiker
- `/api/politician/stats` zeigt Counts
- Doku aktualisiert
