# OpenSIN Chat — API-Referenz

> **Zielgruppe:** Entwickler, die OpenSIN Chat programmatisch nutzen wollen
> **Basis-URL:** `http://localhost:3001` (lokal) oder `https://sinchat.delqhi.com` (Live)
> **Authentifizierung:** Bearer-Token (API-Key) im `Authorization`-Header
> **Stand:** 2026-06-08

> ⚠️ **Wahlperiode 21 (Stand 2026-06-08):** Die Politiker-API zielt auf den **21. Bundestag (2021-2025)**, neu gewählt am 23.02.2025. Konfigurierte Wahlperiode via `BUNDESTAG_WAHLPERIODE=21` und `AW_PARLIAMENT_PERIOD=132`. Erste Sync nach Issue #84. Datenquellen-Specs: [docs/DATA-SOURCES.md](./DATA-SOURCES.md). Operational Runbook: [docs/SYNC-RUNBOOK.md](./SYNC-RUNBOOK.md).

---

## 1. Authentifizierung

Alle AfD-spezifischen Endpoints benötigen einen **API-Key** (Bearer-Token).

### 1.1 API-Key erstellen

```bash
# Über die UI: Settings → API Keys → New Key
# Oder programmatisch (Admin-Token erforderlich):
curl -X POST "http://localhost:3001/api/v1/api-keys" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Research Bot", "scopes": ["politician:read", "research:write"]}'
```

### 1.2 API-Key verwenden

```bash
curl "http://localhost:3001/api/politician/search?q=Weidel" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 1.3 Verfügbare Scopes

| Scope | Berechtigung |
|-------|--------------|
| `politician:read` | Politiker-DB lesen |
| `politician:write` | Sync-Jobs starten |
| `research:read` | Research-Ergebnisse lesen |
| `research:write` | Research starten |
| `reports:read` | Reports herunterladen |
| `reports:write` | Reports generieren |
| `orchestrator:read` | Workflow-Status lesen |
| `orchestrator:write` | Workflows starten |

---

## 2. Politiker-API

> **Code:** `server/endpoints/api/politician/index.js`
> **Middleware:** `validApiKey`
> **Scope:** `politician:read` (alle Endpoints)
> **Datenquellen:** [docs/DATA-SOURCES.md](./DATA-SOURCES.md) — externe API-Specs, Rate-Limits, Schema-Mapping

### 2.1 Suche nach Abgeordneten

```http
GET /api/politician/search
```

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `q` | string | Suchbegriff (Name, Vorname) |
| `party` | string | Partei-Filter (z.B. `AfD`, `CDU`, `SPD`) |
| `state` | string | Bundesland (z.B. `Bayern`, `Sachsen`) |
| `faction` | string | Fraktion (z.B. `Fraktion der AfD`) |
| `source` | string | Datenquelle: `bundestag`, `abgeordnetenwatch` (sonst alle) |

> **Hinweis:** Die Suche paginiert derzeit **nicht** (`limit`/`offset` werden
> ignoriert) — `searchPoliticians()` wendet die Filter an und liefert alle Treffer.

> **Tipp:** Mit `?source=` lassen sich Doppel-Einträge vermeiden, indem nur eine
> offizielle Quelle angezeigt wird. Verfügbare Quellen liefert
> `GET /api/politician/sources`. Siehe auch [docs/DATA-SOURCES.md](./DATA-SOURCES.md).

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/search?q=Weidel&party=AfD" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:** (`politicians` + `total` — kein `limit`/`offset`)

```json
{
  "politicians": [
    {
      "id": 42,
      "externalId": "11004345",
      "firstName": "Alice",
      "lastName": "Weidel",
      "party": "AfD",
      "faction": "Fraktion der AfD",
      "state": "Baden-Württemberg",
      "constituency": "Bodensee – Oberschwaben – Bodensee",
      "photoUrl": "https://www.bundestag.de/webarchiv/abgeordnete/bilder/...",
      "birthDate": "1979-08-06",
      "profession": "Volkswirtin"
    }
  ],
  "total": 1
}
```

---

### 2.2 Politiker-Details

```http
GET /api/politician/:id
```

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/42" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "id": 42,
  "externalId": "11004345",
  "firstName": "Alice",
  "lastName": "Weidel",
  "party": "AfD",
  "faction": "Fraktion der AfD",
  "state": "Baden-Württemberg",
  "constituency": "Bodensee – Oberschwaben – Bodensee",
  "birthDate": "1979-08-06",
  "profession": "Volkswirtin",
  "biography": "Alice Weidel ist eine deutsche Politikerin (AfD)...",
  "contact": {
    "email": "alice.weidel@bundestag.de",
    "office": "Platz der Republik 1, 11011 Berlin"
  },
  "mandates": [
    {
      "id": 1,
      "type": "MdB",
      "period": "21. Wahlperiode",
      "from": "2025-01-01",
      "to": null
    }
  ],
  "committees": [
    {
      "id": 5,
      "name": "Ausschuss für Finanzen",
      "role": "Mitglied"
    }
  ],
  "sideJobs": [
    {
      "organization": "Wirtschaftsrat der CDU",
      "position": "Beraterin",
      "income": "Band 1"
    }
  ]
}
```

---

### 2.3 Abstimmungsverhalten

```http
GET /api/politician/:id/votes
```

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `limit` | number | Default: 50, begrenzt auf 1–200 |
| `offset` | number | Pagination-Offset (Default: 0) |

> Liefert `404`, falls die `:id` keinem Politiker zugeordnet ist. Datums-/Themen-
> Filter (`from`/`to`/`topic`/`result`) sind derzeit **nicht** implementiert.

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/42/votes?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "votes": [
    {
      "id": "vote-12345",
      "date": "2025-06-12",
      "title": "Entwurf eines Gesetzes zur Änderung des Aufenthaltsgesetzes",
      "topic": "Migration",
      "result": "dafuer",
      "fractionResult": "dagegen",
      "protocolUrl": "https://www.bundestag.de/dokumente/protokolle/..."
    }
  ],
  "total": 42
}
```

---

### 2.4 Plenarprotokoll-Reden

```http
GET /api/politician/:id/speeches
```

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `from` | ISO-Date | Start-Datum |
| `to` | ISO-Date | End-Datum |
| `topic` | string | Themen-Filter (Volltext) |
| `limit` | number | Default: 20, max: 100 |

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/42/speeches?topic=Energie" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "speeches": [
    {
      "id": "speech-67890",
      "date": "2025-09-18",
      "session": "21. Sitzung",
      "agendaItem": "Tagesordnungspunkt 7",
      "topic": "Energiepolitik",
      "excerpt": "Sehr geehrte Frau Präsidentin, liebe Kolleginnen und Kollegen, die aktuelle Energiepolitik dieser Bundesregierung ist ein einziges Desaster...",
      "fullTextUrl": "/api/politician/speech/speech-67890",
      "protocolUrl": "https://www.bundestag.de/dokumente/protokolle/..."
    }
  ],
  "total": 15
}
```

---

### 2.5 Mandate-Historie

```http
GET /api/politician/:id/mandates
```

**Response:**

```json
{
  "mandates": [
    {
      "id": 1,
      "type": "MdB",
      "period": "21. Wahlperiode",
      "from": "2025-01-01",
      "to": null
    },
    {
      "id": 2,
      "type": "MdB",
      "period": "20. Wahlperiode",
      "from": "2021-10-26",
      "to": "2025-01-01"
    }
  ]
}
```

---

### 2.6 Semantische Reden-Suche

```http
GET /api/politician/speech-search
```

**Query-Parameter:**

| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `q` | string | Suchanfrage (Vektor-Embedding) |
| `limit` | number | Default: 10, max: 50 |
| `threshold` | float | Min. Similarity-Score (0-1, default: 0.7) |
| `source` | string | `plenarprotokolle`, `bundestag`, `abgeordnetenwatch`, `all` (default) |

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/speech-search?q=Energiekrise%20und%20Versorgungssicherheit&limit=20" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "results": [
    {
      "speechId": "speech-67890",
      "politicianId": 42,
      "politicianName": "Alice Weidel",
      "date": "2025-09-18",
      "excerpt": "Die Energiekrise hat Deutschland hart getroffen...",
      "similarity": 0.89
    }
  ]
}
```

**Hinweis:** Diese Funktion benötigt **PGVector**. Bei SQLite-Fallback wird ein leeres Array zurückgegeben.

---

### 2.7 Parteien / Bundesländer (Filter-Listen)

```http
GET /api/politician/parties
GET /api/politician/states
```

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/parties" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "parties": ["AfD", "CDU", "CSU", "SPD", "Bündnis 90/Die Grünen", "Die Linke", "FDP", "BSW"]
}
```

---

### 2.8 Sync-Job (Admin)

```http
POST /api/politician/sync
```

**Scope:** `politician:write`

**Body:**

```json
{
  "scope": "all",
  "period": "21"
}
```

| Parameter | Optionen | Beschreibung |
|-----------|----------|--------------|
| `scope` | `all` / `profile` / `speeches` / `votes` | Was synchronisiert werden soll |
| `period` | `21` / `20` / `all` | Welche Wahlperiode |

**Beispiel:**

```bash
curl -X POST "http://localhost:3001/api/politician/sync" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"scope": "all", "period": "21"}'
```

**Response:**

```json
{
  "jobId": "sync-abc123",
  "status": "running",
  "estimatedDuration": "45-60 min"
}
```

---

### 2.9 Datenquellen auflisten

```http
GET /api/politician/sources
```

Aggregiert die verfügbaren Datenquellen direkt aus der Datenbank, inklusive der
Anzahl zugeordneter Politiker-Datensätze pro Quelle.

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/sources" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "sources": [
    { "source": "bundestag", "count": 736 },
    { "source": "abgeordnetenwatch", "count": 412 }
  ]
}
```

---

### 2.10 Sync-Status

```http
GET /api/politician/sync/status
```

Liefert den letzten Sync-Lauf sowie Status, letzten Erfolg und Zähler pro Quelle
(aus `politician_sync_log`).

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/sync/status" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "lastSync": "2026-06-07T14:00:00Z",
  "sources": [
    {
      "source": "bundestag",
      "status": "completed",
      "lastAttempt": "2026-06-07T14:00:00Z",
      "lastSuccess": "2026-06-07T14:00:00Z",
      "itemsProcessed": 736,
      "itemsFailed": 0,
      "error": null
    },
    {
      "source": "abgeordnetenwatch",
      "status": "failed",
      "lastAttempt": "2026-06-07T14:00:00Z",
      "lastSuccess": "2026-06-06T08:00:00Z",
      "itemsProcessed": 0,
      "itemsFailed": 0,
      "error": "HTTP 503"
    }
  ]
}
```

> Datenquellen-Details, Rate-Limits und Schema-Mapping: siehe
> [docs/DATA-SOURCES.md](./DATA-SOURCES.md).

---

### 2.11 Statistiken (Politician-DB)

```http
GET /api/politician/stats
```

Aggregierte Counts: total, by source, by party, total speeches.

**Beispiel:**

```bash
curl "http://localhost:3001/api/politician/stats" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "total": 1342,
  "bySource": {
    "bundestag": 730,
    "abgeordnetenwatch": 612
  },
  "byParty": {
    "AfD": 152,
    "CDU/CSU": 256,
    "SPD": 207,
    "Grüne": 118,
    "FDP": 91,
    "Linke": 39
  },
  "speeches": 124
}
```

> Hinweis: Auf einer frisch initialisierten Datenbank sind alle Counts `0`.
> Sync ausführen: `docker exec opensin node /app/server/jobs/sync-politician-data.js`
> (siehe [docs/SYNC-RUNBOOK.md](./SYNC-RUNBOOK.md)).

---

## 3. Research-API

> **Code:** `server/endpoints/api/research/index.js`
> **Scope:** `research:write` für `start`, `research:read` für `get/list`

### 3.1 Recherche starten

```http
POST /api/research/start
```

**Body:**

```json
{
  "query": "Aktuelle Positionen der CDU zur Energiepolitik",
  "depth": "quick",
  "sources": ["web", "politician"],
  "workspaceId": 1
}
```

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `query` | string | — | Suchanfrage (required, 1–2000 Zeichen) |
| `depth` | enum | `quick` | `quick` (1 Suche) / `deep` (3+ Suchen) |
| `sources` | array | `["web", "politician"]` | Nicht-leeres Array aus `web` und/oder `politician` |
| `workspaceId` | string \| number \| null | null | Optional: Workspace-Zuordnung |

> **Validierung:** Ungültige Werte (leere `query`, `query` > 2000 Zeichen, unbekanntes
> `depth`, leeres oder unbekanntes `sources`) liefern `400` mit einer
> `error`-Beschreibung der verletzten Regeln.

**Beispiel:**

```bash
curl -X POST "http://localhost:3001/api/research/start" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Aktuelle AfD-Umfragewerte 2026",
    "depth": "deep",
    "sources": ["web"]
  }'
```

**Response:**

```json
{
  "jobId": "research-abc123",
  "status": "queued",
  "estimatedDuration": "60-90s"
}
```

---

### 3.2 Job-Status

```http
GET /api/research/:id
```

**Beispiel:**

```bash
curl "http://localhost:3001/api/research/research-abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "jobId": "research-abc123",
  "status": "running",
  "query": "Aktuelle AfD-Umfragewerte 2026",
  "progress": {
    "phase": "summarizing",
    "sourcesVisited": 12,
    "sourcesTotal": 15
  },
  "startedAt": "2026-06-07T14:30:00Z",
  "estimatedCompletion": "2026-06-07T14:31:30Z"
}
```

**Status-Werte:**

- `queued` — Wartet auf Verarbeitung
- `searching` — Sucht Quellen
- `extracting` — Extrahiert Inhalte
- `summarizing` — LLM-Zusammenfassung läuft
- `completed` — Fertig
- `failed` — Fehler (siehe `error`-Feld)

---

### 3.3 Ergebnis abrufen

```http
GET /api/research/:id/result
```

**Response:**

```json
{
  "jobId": "research-abc123",
  "status": "completed",
  "query": "Aktuelle AfD-Umfragewerte 2026",
  "summary": "Die AfD liegt laut aktuellen Umfragen zwischen 18% und 22%...",
  "keyFindings": [
    "INSA-Umfrage (07.06.2026): 21% (+1,5 zur Vorwoche)",
    "Forsa-Umfrage (05.06.2026): 19% (unverändert)",
    "Trend: Stagnation auf hohem Niveau seit Mai 2026"
  ],
  "sources": [
    {
      "url": "https://www.welt.de/politik/deutschland/...",
      "title": "INSA: AfD bei 21 Prozent",
      "snippet": "Im neuesten INSA-Meinungstrend legt die AfD leicht zu...",
      "publishedAt": "2026-06-07T08:00:00Z",
      "visitedAt": "2026-06-07T14:30:15Z",
      "reliabilityScore": 0.85
    }
  ],
  "confidence": 0.92,
  "completedAt": "2026-06-07T14:31:22Z"
}
```

---

### 3.4 Alle Jobs auflisten

```http
GET /api/research/list
```

Liefert alle bekannten Jobs. Aktuell **keine** Query-Parameter (kein Status-Filter
oder Pagination) — die vollständige Liste wird unter dem Schlüssel `jobs`
zurückgegeben.

**Beispiel:**

```bash
curl "http://localhost:3001/api/research/list" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**

```json
{
  "jobs": [
    { "jobId": "research-abc123", "status": "completed", "query": "..." }
  ]
}
```

---

### 3.5 Job abbrechen

> **Status:** 📅 Geplant — `DELETE /api/research/:id` ist derzeit **nicht**
> implementiert.

---

## 4. Report-API

> **Code:** `server/endpoints/api/reports/index.js`
> **Scope:** `reports:write` für `generate`, `reports:read` für `download/list`

### 4.1 PDF-Report generieren

```http
POST /api/reports/generate
```

**Body:**

**Variante A: Aus einem Research-Job (Daten werden automatisch übernommen):**

```json
{
  "researchJobId": "research-abc123",
  "title": "Dossier: EU-Migrationspolitik 2026",
  "template": "standard"
}
```

**Variante B: Mit explizit übergebenen Daten:**

```json
{
  "title": "Dossier: EU-Migrationspolitik 2026",
  "query": "EU-Migrationspolitik 2026",
  "summary": "## Zusammenfassung\n...",
  "searchResults": [{ "title": "Quelle A", "link": "https://a.de", "snippet": "..." }],
  "politicianResults": [{ "fullName": "Max Mustermann", "party": "AfD" }],
  "extractedContent": [{ "title": "Doc A", "url": "https://a.de", "content": "..." }],
  "template": "full"
}
```

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `researchJobId` | string | — | Optional: lädt `summary`/Quellen aus einem Research-Job |
| `title` | string | `query` bzw. `"Recherche-Bericht"` | Report-Titel |
| `query` | string | `""` | Ursprüngliche Fragestellung |
| `summary` | string | `""` | Markdown-Zusammenfassung |
| `searchResults` | array | `[]` | Web-Quellen |
| `politicianResults` | array | `[]` | Politiker-Treffer |
| `extractedContent` | array | `[]` | Extrahierte Volltexte |
| `template` | enum | `standard` | `standard` / `brief` / `full` |

> **Validierung:** `template` außerhalb der erlaubten Werte, nicht-Array-Felder
> (`searchResults`/`politicianResults`/`extractedContent`) sowie ein komplett
> leerer Body (kein `title`/`query`/`summary`/`researchJobId`) liefern `400`.

**Beispiel:**

```bash
curl -X POST "http://localhost:3001/api/reports/generate" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "researchJobId": "research-abc123",
    "title": "Dossier: EU-Migrationspolitik 2026",
    "template": "standard"
  }'
```

**Response:**

```json
{
  "fileName": "Dossier_EU-Migrationspolitik_2026_a1b2c3d4.pdf",
  "filePath": "/.../generated-reports/Dossier_EU-Migrationspolitik_2026_a1b2c3d4.pdf",
  "fileSizeKB": "245.7"
}
```

---

### 4.2 Report herunterladen

```http
GET /api/reports/:fileName
```

Der `fileName` ist der von `generate` zurückgegebene Dateiname. Der Server
normalisiert ihn mit `path.basename`, sodass Path-Traversal (`../`) wirkungslos
ist und zu `404` führt.

**Beispiel:**

```bash
curl "http://localhost:3001/api/reports/Dossier_EU-Migrationspolitik_2026_a1b2c3d4.pdf" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -o report.pdf
```

**Response:** `Content-Type: application/pdf` (oder `404`, wenn die Datei fehlt)

---

### 4.3 Alle Reports auflisten

```http
GET /api/reports/list
```

Listet die generierten PDFs aus dem `generated-reports`-Verzeichnis. Aktuell
**keine** Query-Parameter.

**Response:**

```json
{
  "reports": [
    {
      "fileName": "Dossier_EU-Migrationspolitik_2026_a1b2c3d4.pdf",
      "fileSizeKB": "245.7",
      "createdAt": "2026-06-07T14:35:00.000Z"
    }
  ]
}
```

---

### 4.4 Report löschen

> **Status:** 📅 Geplant — `DELETE /api/reports/:id` ist derzeit **nicht**
> implementiert.

---

## 5. Orchestrator-API

> **Code:** `server/endpoints/api/orchestrator/index.js`
> **Scope:** `orchestrator:write` für `start`, `orchestrator:read` für `get/list`

### 5.1 Workflow starten

```http
POST /api/orchestrator/start
```

**Body-Optionen:**

**Variante A: Goal-driven (KI zerlegt selbst):**

```json
{
  "goal": "Recherchiere die aktuelle Energiepolitik und erstelle ein Dossier",
  "options": {
    "maxSteps": 5,
    "depth": "standard"
  }
}
```

**Variante B: Explizite Steps:**

```json
{
  "goal": "Politiker-Dossier erstellen",
  "steps": [
    { "tool": "politician-search", "params": { "id": 42 } },
    { "tool": "deep-research", "params": { "query": "Aktuelle Aussagen" } },
    { "tool": "generate-report", "params": { "source": "orchestrator" } }
  ]
}
```

| Parameter | Typ | Default | Beschreibung |
|-----------|-----|---------|--------------|
| `goal` | string | — | Hochlevel-Ziel (required) |
| `steps` | array | — | Optional: Explizite Schritte (sonst Auto-Inferenz) |
| `options.maxSteps` | number | 5 | Max. Anzahl Auto-Schritte |
| `options.depth` | enum | `standard` | `quick` / `standard` / `deep` |

**Beispiel:**

```bash
curl -X POST "http://localhost:3001/api/orchestrator/start" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "Erstelle Dossier über Alice Weidel",
    "options": { "maxSteps": 5, "depth": "deep" }
  }'
```

**Response:**

```json
{
  "workflowId": "workflow-def456",
  "status": "running",
  "inferredSteps": [
    "search_politician: Alice Weidel",
    "fetch_profile: id=42",
    "fetch_speeches: id=42, topic=Energie",
    "deep_research: aktuelle Aussagen",
    "generate_report: branding=afd"
  ]
}
```

---

### 5.2 Workflow-Status

```http
GET /api/orchestrator/:id
```

**Response:**

```json
{
  "workflowId": "workflow-def456",
  "status": "running",
  "currentStep": 3,
  "totalSteps": 5,
  "progress": [
    { "step": 1, "tool": "politician-search", "status": "completed", "duration": 1.2 },
    { "step": 2, "tool": "politician-search", "status": "completed", "duration": 0.8 },
    { "step": 3, "tool": "deep-research", "status": "running" }
  ]
}
```

**Status-Werte:**

- `running` — Aktiv
- `completed` — Alle Steps erfolgreich
- `failed` — Fehler (siehe `error`)
- `cancelled` — Manuell abgebrochen

---

### 5.3 Workflow-Ergebnis

```http
GET /api/orchestrator/:id/result
```

**Response:**

```json
{
  "workflowId": "workflow-def456",
  "status": "completed",
  "goal": "Erstelle Dossier über Alice Weidel",
  "artifacts": {
    "reportId": "report-xyz789",
    "reportUrl": "/api/reports/report-xyz789"
  },
  "stepResults": [...],
  "duration": 67.3,
  "completedAt": "2026-06-07T14:42:00Z"
}
```

---

## 6. Fehler-Codes

| Code | Bedeutung | Lösung |
|------|-----------|--------|
| `400` | Bad Request | Parameter prüfen |
| `401` | Unauthorized | API-Key fehlt oder ungültig |
| `403` | Forbidden | Scope fehlt |
| `404` | Not Found | ID existiert nicht |
| `429` | Too Many Requests | Rate-Limit (10 req/s Standard) |
| `500` | Internal Server Error | Bug, Logs prüfen |
| `503` | Service Unavailable | Externe API down (Bundestag, Abgeordnetenwatch) |

**Beispiel-Fehler-Response:**

```json
{
  "error": "rate_limit_exceeded",
  "message": "Max 10 requests per second exceeded",
  "retryAfter": 1.5
}
```

---

## 7. Rate-Limits

| Endpoint | Limit |
|----------|-------|
| `/api/politician/*` (read) | 50 req/s |
| `/api/politician/sync` (write) | 1 req/min |
| `/api/research/start` (write) | 5 req/min |
| `/api/reports/generate` (write) | 2 req/min |
| `/api/orchestrator/start` (write) | 1 req/10s |

**Response-Header:**

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1717756800
```

---

## 8. Webhooks (optional)

Statt Polling kannst du Webhooks registrieren:

```http
POST /api/v1/webhooks
```

**Body:**

```json
{
  "url": "https://your-app.com/webhook",
  "events": ["research.completed", "report.ready", "orchestrator.completed"],
  "secret": "your-webhook-secret"
}
```

**Webhook-Payload:**

```json
{
  "event": "research.completed",
  "timestamp": "2026-06-07T14:31:22Z",
  "data": {
    "jobId": "research-abc123",
    "status": "completed"
  }
}
```

---

## 9. Code-Beispiele

### 9.1 Node.js

```javascript
const API_KEY = process.env.OPENSIN_API_KEY;
const BASE = "http://localhost:3001";

async function searchPolitician(name) {
  const res = await fetch(`${BASE}/api/politician/search?q=${name}`, {
    headers: { Authorization: `Bearer ${API_KEY}` }
  });
  return res.json();
}

async function startResearch(query) {
  const res = await fetch(`${BASE}/api/research/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, depth: "standard" })
  });
  return res.json();
}

async function pollResearch(jobId) {
  while (true) {
    const res = await fetch(`${BASE}/api/research/${jobId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` }
    });
    const job = await res.json();
    if (job.status === "completed") return job;
    if (job.status === "failed") throw new Error(job.error);
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

### 9.2 Python

```python
import requests
import time

API_KEY = "your-api-key"
BASE = "http://localhost:3001"
HEADERS = {"Authorization": f"Bearer {API_KEY}"}

def search_politician(name: str):
    return requests.get(
        f"{BASE}/api/politician/search",
        params={"q": name},
        headers=HEADERS
    ).json()

def start_research(query: str):
    res = requests.post(
        f"{BASE}/api/research/start",
        json={"query": query, "depth": "standard"},
        headers=HEADERS
    ).json()
    return res["jobId"]

def poll_research(job_id: str):
    while True:
        job = requests.get(
            f"{BASE}/api/research/{job_id}",
            headers=HEADERS
        ).json()
        if job["status"] == "completed":
            return job
        if job["status"] == "failed":
            raise Exception(job["error"])
        time.sleep(2)
```

### 9.3 cURL komplettes Beispiel

```bash
# 1. Politiker suchen
POL_ID=$(curl -s "http://localhost:3001/api/politician/search?q=Weidel" \
  -H "Authorization: Bearer $API_KEY" | jq -r '.results[0].id')

# 2. Reden abrufen
curl -s "http://localhost:3001/api/politician/$POL_ID/speeches" \
  -H "Authorization: Bearer $API_KEY" | jq '.speeches'

# 3. Research starten
JOB_ID=$(curl -s -X POST "http://localhost:3001/api/research/start" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "Aktuelle Aussagen zur Energiepolitik"}' | jq -r '.jobId')

# 4. Polling bis fertig
while true; do
  STATUS=$(curl -s "http://localhost:3001/api/research/$JOB_ID" \
    -H "Authorization: Bearer $API_KEY" | jq -r '.status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 3
done

# 5. Ergebnis holen
curl -s "http://localhost:3001/api/research/$JOB_ID/result" \
  -H "Authorization: Bearer $API_KEY" | jq '.summary'

# 6. PDF-Report generieren
REPORT_ID=$(curl -s -X POST "http://localhost:3001/api/reports/generate" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"source\":\"research\",\"jobId\":\"$JOB_ID\",\"title\":\"Dossier\",\"branding\":\"afd\"}" \
  | jq -r '.reportId')

# 7. PDF herunterladen
curl -s "http://localhost:3001/api/reports/$REPORT_ID" \
  -H "Authorization: Bearer $API_KEY" -o dossier.pdf
```

---

## 10. SDKs (geplant)

| Sprache | Status | Package |
|---------|--------|---------|
| JavaScript/TypeScript | 📅 Geplant | `@opensin/sdk` |
| Python | 📅 Geplant | `opensin-sdk` |
| Go | 📅 Geplant | `github.com/Family-Team-Projects/opensin-go` |

Bei Interesse: Issue auf GitHub erstellen.

---

*Letztes Update: 2026-06-07 · API-Version: v1 · Maintainer: @Family-Team-Projects*
