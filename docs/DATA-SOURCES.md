# OpenAfD Chat — Datenquellen & Politiker-Sync

> **Zweck:** Technische Dokumentation der 3 externen Datenquellen für die Politiker-Datenbank, inklusive API-Spezifikationen, Rate-Limits, Filter-Möglichkeiten und bekannten Einschränkungen.
>
> **Docs:** `DATA-SOURCES.doc.md` (diese Datei)
> **Related:** `docs/USER-GUIDE.md` §3, `docs/API.md` §2, `server/jobs/sync-politician-data.js`

---

## Übersicht

Die Politiker-Datenbank (Modul 1) aggregiert Daten aus **3 kostenlosen, offiziellen Quellen**:

| Quelle | Daten | API-Typ | Kosten | Auth |
|--------|-------|---------|--------|------|
| **Bundestag** | MdB-Profile, Stammdaten, Fraktionen | REST (JSON) | Kostenlos | Nein |
| **Abgeordnetenwatch** | Profile, Abstimmungen, Mandate, Ausschüsse | REST (JSON) | Kostenlos | Nein |
| **Bundestag Plenarprotokolle** | Reden, Tagesordnungspunkte, Sitzungsprotokolle | XML/PDF Download | Kostenlos | Nein |

**Kein LLM-Crawling** — alle Daten kommen direkt von offiziellen REST-APIs oder öffentlichen Dokumenten, keine KI-Generierung oder Web-Scraping von Drittanbietern.

---

## 1. Bundestag API (Offene Daten)

### Basis-URL
```
https://www.bundestag.de/SiteGlobals/Functions/Abgeordnetensuche
```

### Endpoints

#### 1.1 Alle Abgeordneten (aktueller Wahlperiode)
```
GET /Abgeordnete{WAHLPERIODE}_WP.formular
```

Beispiel (20. Wahlperiode):
```bash
curl "https://www.bundestag.de/SiteGlobals/Functions/Abgeordnetensuche/Abgeordnete20_WP.formular" \
  -H "Accept: application/json"
```

**Antwort:** JSON-Array mit MdB-Profilen:
```json
[
  {
    "id": "518524",
    "vorname": "Alice",
    "nachname": "Weidel",
    "parteiKurz": "AfD",
    "fraktion": "AfD",
    "akadGrad": "Dr.",
    "anrede": "Frau",
    "geburtsdatum": "1979-02-06",
    "geburtsort": "Gütersloh",
    "beruf": "Volkswirtin",
    "vitaKurz": "...",
    "vitaLang": "...",
    "bild": "/blob/518524/...jpg",
    "profilUrl": "/abgeordnete/biografien18/518524",
    "email": "alice.weidel@bundestag.de",
    "wahlkreis": " Bodenseekreis",
    "landesliste": "Baden-Württemberg",
    "bundesland": "Baden-Württemberg",
    "homepage": "https://www.alice-weidel.de",
    "twitter": "@Alice_Weidel",
    "facebook": "...",
    "linkedin": "...",
    "instagram": "...",
    "youtube": "...",
    "tiktok": "..."
  }
]
```

### Daten-Schema (Bundestag → intern)

| Bundestag Feld | Internes Feld | Typ | Bemerkung |
|---------------|---------------|-----|-----------|
| `id` | `externalId` | String | Bundestag-interne ID |
| `vorname` | `firstName` | String | |
| `nachname` | `lastName` | String | |
| `parteiKurz` | `party` | String | z.B. "AfD", "CDU/CSU", "SPD" |
| `fraktion` | `faction` | String | Fraktionszugehörigkeit |
| `akadGrad` | `title` | String | Akademischer Titel |
| `anrede` | `gender` | Enum | "male" / "female" (parsed) |
| `geburtsdatum` | `birthDate` | Date | ISO-8601 |
| `geburtsort` | `birthPlace` | String | |
| `beruf` | `profession` | String | |
| `vitaKurz` | `education` | String | Kurz-Vita |
| `vitaLang` | `bio` | String | Lange Vita |
| `bild` | `photoUrl` | URL | Relativ → absolut mit `https://www.bundestag.de` |
| `profilUrl` | `profileUrl` | URL | Detail-Seite |
| `email` | `email` | String | Bundestag-E-Mail |
| `wahlkreis` | `electoralDistrict` | String | Wahlkreis-Bezeichnung |
| `landesliste` | `electoralList` | String | Landeslisten-Position |
| `bundesland` | `state` | String | Bundesland |
| `homepage` | `websiteUrl` | URL | Persönliche Website |
| `twitter`, `facebook`, ... | `socialMedia` | Object | Social Media URLs |

### Rate-Limits & Einschränkungen
- **Kein API-Key erforderlich**
- **Rate-Limit:** ~1 Request/500ms (im Client implementiert)
- **Cache-TTL:** 6 Stunden (im Client)
- **Verfügbarkeit:** 24/7, gelegentlich Wartungsfenster
- **Einschränkung:** Keine historischen Wahlperioden über den Endpoint verfügbar (nur aktuelle WP)

### Filter-Möglichkeiten (externe API)
Die Bundestag-API bietet **keine Query-Filter** (kein `?party=AfD`, kein `?search=...`). Alle Filterung muss client-seitig erfolgen (wird von `PoliticianDB.searchPoliticians()` gemacht).

### Offizielle Doku
- **Bundestag Offene Daten:** https://www.bundestag.de/services/opendata
- **Abgeordnetensuche:** https://www.bundestag.de/abgeordnete

---

## 2. Abgeordnetenwatch API

### Basis-URL
```
https://www.abgeordnetenwatch.de/api/v2
```

### Endpoints

#### 2.1 Alle Parlamentarier (Bundestag, 20. WP)
```
GET /parliament-period/?parliament=111
```

Beispiel:
```bash
curl "https://www.abgeordnetenwatch.de/api/v2/parliament-period/?parliament=111" \
  -H "Accept: application/json"
```

**Antwort:** Paginiertes JSON (API-Standard: `meta.pagination.next` für nächste Seite):
```json
{
  "data": [
    {
      "id": 12345,
      "firstName": "Alice",
      "lastName": "Weidel",
      "sex": "female",
      "birthDate": "1979-02-06",
      "party": { "id": 42, "label": "AfD", "name": "Alternative für Deutschland" },
      "constituencyName": "Bodenseekreis",
      "votes": [...],
      "mandates": [...]
    }
  ],
  "meta": {
    "pagination": {
      "next": "https://www.abgeordnetenwatch.de/api/v2/parliament-period/?parliament=111&page=2"
    }
  }
}
```

#### 2.2 Politiker-Suche
```
GET /politicians/?search={NAME}&parliament=111
```

#### 2.3 Abstimmungen (Votes)
```
GET /politicians/{ID}/votes/?parliament=111
```

#### 2.4 Ausschüsse
```
GET /politicians/{ID}/committees/
```

#### 2.5 Mandate
```
GET /politicians/{ID}/mandates/
```

### Daten-Schema (Abgeordnetenwatch → intern)

| AW Feld | Internes Feld | Typ | Bemerkung |
|---------|---------------|-----|-----------|
| `id` | `externalId` (präfixiert: `aw-{id}`) | String | |
| `firstName` | `firstName` | String | |
| `lastName` | `lastName` | String | |
| `sex` | `gender` | Enum | "male" / "female" |
| `birthDate` | `birthDate` | Date | ISO-8601 |
| `party.label` / `party.name` | `party` | String | Parteikürzel oder Name |
| `constituencyName` | `electoralDistrict` | String | |
| `votes` | `votes` | Array | Abstimmungsdaten (separater Endpoint) |
| `mandates` | `mandates` | Array | Mandatsdaten (separater Endpoint) |

### Rate-Limits & Einschränkungen
- **Kein API-Key erforderlich** (für lesenden Zugriff)
- **Rate-Limit:** Nicht offiziell dokumentiert, im Client 500ms zwischen Requests
- **Cache-TTL:** 6 Stunden (im Client)
- **Pagination:** Ergebnisse sind paginiert (via `meta.pagination.next`)
- **Einschränkung:** Nicht alle Bundestagsabgeordnete sind in AW indexiert (besonders Wechsel innerhalb der Wahlperiode)

### Filter-Möglichkeiten (externe API)
- `?search={NAME}` — Volltextsuche nach Name
- `?parliament=111` — Filter nach Parlament (111 = Bundestag 20. WP)
- `?range_end=100` — Limitierung der Ergebnisse
- **Keine Filter nach Partei, Bundesland, etc.** — client-seitig nötig

### Offizielle Doku
- **Abgeordnetenwatch API:** https://www.abgeordnetenwatch.de/api
- **API-Explorer:** https://www.abgeordnetenwatch.de/api/v2

---

## 3. Bundestag Plenarprotokolle

### Basis-URL
```
https://www.bundestag.de/resource/blob/      (XML)
https://dserver.bundestag.de/btp/             (PDF)
```

### Formate
| Format | URL-Schema | Inhalt |
|--------|-----------|--------|
| **XML** | `https://www.bundestag.de/resource/blob/{ID}/dip.pdf.xml` | Strukturierte XML mit Reden, Sprecher, TOPs |
| **PDF** | `https://dserver.bundestag.de/btp/{WP}/{WP}{SITZUNG}.pdf` | Original-Protokoll |

### Endpoint (Index)
```
GET https://www.bundestag.de/ajax/filterlist/de/dokumente/protokolle/-/442112
```

Dieser Endpoint liefert eine Liste verfügbarer Plenarprotokolle mit IDs.

### Scraping-Strategie
1. **Index holen:** Liste aller verfügbaren Sitzungen für eine Wahlperiode
2. **Protokoll parsen:** XML oder PDF herunterladen und nach Reden (`<rede>`, `<tagesordnungspunkt>`) parsen
3. **Speaker-Matching:** Sprecher-Namen mit der Politiker-DB abgleichen (Fuzzy-Matching mit `nachname, vorname`)
4. **Speicherung:** Reden in `politician_speech` Tabelle mit Deduplizierung (Key: `session-sitting-speaker-text[:100]`)

### Daten-Schema (Plenarprotokoll → intern)

| Quelle Feld | Internes Feld | Typ | Bemerkung |
|-------------|---------------|-----|-----------|
| Sprecher-Name | `speakerName` | String | Wie im Protokoll angegeben |
| Sprecher-Partei | `speakerParty` | String | Wie im Protokoll angegeben |
| Rede-Text | `text` | Text | Volltext der Rede |
| Tagesordnungspunkt | `top` | String | TOP-Bezeichnung |
| Sitzungsdatum | `date` | Date | Datum der Sitzung |
| Wahlperiode | `session` | Number | z.B. 20 |
| Sitzungsnummer | `sitting` | Number | z.B. 1, 2, 3... |
| Seitennummer | `pageNumbers` | String | z.B. "12-15" |
| Dokument-URL | `documentUrl` | URL | Link zum Original |

### Rate-Limits & Einschränkungen
- **Kein API-Key erforderlich**
- **Rate-Limit:** Nicht offiziell, im Client 1s zwischen Requests
- **Einschränkung:** XML-Struktur kann sich ändern (Parser robust gestaltet)
- **Einschränkung:** Nicht alle Reden sind einem Politiker zuordenbar (neue Redner, Gäste, Wortmeldungen aus der Reihe) — Confidence-Score < 0.5 → verworfen
- **Einschränkung:** Ältere Wahlperioden (z.B. < 19) können andere URL-Schemata haben

### Offizielle Doku
- **Plenarprotokolle:** https://www.bundestag.de/dokumente/protokolle
- **DIPs:** https://dip.bundestag.de

---

## 4. Source-Filtering in der API (aktueller Stand)

### Datenbank-Schema
Die Datenbank unterstützt bereits Source-Filtering auf Prisma-Ebene:

```prisma
model politicians {
  source            String    @default("bundestag") // bundestag | abgeordnetenwatch
  // ...
  @@index([source])
}

model politician_speech {
  source         String // bundestag | abgeordnetenwatch | plenarprotokolle
  // ...
}
```

### Aktuelle API-Filter (vorhanden)
- `GET /api/politician/search?q=Weidel&party=AfD&state=Baden-Württemberg`
- `GET /api/politician/speech-search?q=Migration&party=AfD`

### Fehlende Filter (TODO)
- `?source=bundestag` — nur Bundestag-Daten
- `?source=abgeordnetenwatch` — nur Abgeordnetenwatch-Daten
- `?source=plenarprotokolle` — nur Plenarprotokoll-Reden
- Kombinationen: `?source=bundestag&party=AfD` — AfD-Abgeordnete nur aus Bundestag-Quelle

### Implementierungshinweis
Das Prisma-Schema hat bereits `@@index([source])` — die Datenbank-Abfragen sind also performant. Die Erweiterung der API-Endpoints ist ein kleiner Change:

```javascript
// In server/endpoints/api/politician/index.js
if (source) filters.source = source; // Hinzufügen zu existing filters
```

**Impact:** Gering — nur Query-Parameter hinzufügen, keine Schema-Änderung.

---

## 5. Sync-Job Architektur

### Job: `server/jobs/sync-politician-data.js`

```
┌─────────────────────────────────────────────────────────────┐
│  sync-politician-data (alle 6h via Bree)                   │
├─────────────────────────────────────────────────────────────┤
│  Phase 1: Bundestag Members                                │
│    → fetchAllMembers() → upsert in DB                      │
│    → Retry: 3x, 500ms Backoff                             │
│    → Log: politician_sync_log (source=bundestag)           │
├─────────────────────────────────────────────────────────────┤
│  Phase 2: Abgeordnetenwatch Politicians                    │
│    → fetchAllPoliticians() → create-if-missing             │
│    → Retry: 3x, 500ms Backoff                             │
│    → Log: politician_sync_log (source=abgeordnetenwatch)   │
├─────────────────────────────────────────────────────────────┤
│  Phase 3: Plenarprotokolle Speeches                        │
│    → determineSittingsToSync() → fetchProtocol()         │
│    → matchSpeaker() → upsert in DB                         │
│    → Retry: 3x, 500ms Backoff                             │
│    → Log: politician_sync_log (source=plenar-speeches)     │
└─────────────────────────────────────────────────────────────┘
```

### Konfiguration

| Env-Var | Default | Beschreibung |
|---------|---------|-------------|
| `BUNDESTAG_WAHLPERIODE` | `20` | Aktuelle Wahlperiode |
| `POLITICIAN_SYNC_SITTINGS_PER_RUN` | `5` | Wie viele Plenarsitzungen pro Sync-Run |

### Fehlerbehandlung
- **Jede Phase läuft unabhängig** — ein Fehler in Phase 1 blockiert nicht Phase 2+3
- **Retry-Logik pro Record** — 3 Versuche mit exponentiellem Backoff
- **Sync-Log** — jeder Run wird in `politician_sync_log` mit Status (started/running/completed/failed) geloggt
- **Deduplizierung** — Reden werden via `dedupeKey` (session+sitting+speaker+text[:100]) dedupliziert

---

## 6. Bekannte Einschränkungen & TODOs

### Einschränkungen der Datenquellen
1. **Bundestag API:** Keine historischen Wahlperioden (nur aktuelle WP)
2. **Abgeordnetenwatch:** Nicht alle MdBs indexiert (besonders Wechsel innerhalb WP)
3. **Plenarprotokolle:** Reden sind manchmal nicht zuordenbar (Confidence < 0.5 → verworfen)
4. **Plenarprotokolle:** Ältere Wahlperioden können andere XML-Schemata haben

### Offene Issues (GitHub)
- **Issue #45:** Source-Filtering API (`?source=...` Query-Parameter)
- **Issue #46:** Externe API-Dokumentation verlinken (Swagger/OpenAPI für interne API)
- **Issue #47:** Fallback-Strategien bei API-Ausfällen (z.B. Plenarprotokolle über DIP-API statt Web-Scraping)

### Verbesserungsmöglichkeiten
1. **Source-Filter:** `?source=` Parameter in alle API-Endpoints hinzufügen
2. **Sync-Status:** `GET /api/politician/sync/status` — letzter Sync-Run + Status
3. **DIP-API:** https://dip.bundestag.de für Plenarprotokolle statt Web-Scraping (robustere API)
4. **Historische Daten:** Backfill für ältere Wahlperioden (manuelles CLI-Tool)
5. **Diff-Sync:** Nur geänderte Records updaten statt Full-Refresh

---

## 7. Offizielle Links & Referenzen

- **Bundestag Offene Daten:** https://www.bundestag.de/services/opendata
- **Abgeordnetenwatch API:** https://www.abgeordnetenwatch.de/api
- **DIP (Parlamentsdokumentation):** https://dip.bundestag.de
- **Plenarprotokolle:** https://www.bundestag.de/dokumente/protokolle

---

## 8. Glossar

| Begriff | Bedeutung |
|---------|-----------|
| **WP** | Wahlperiode (z.B. 20 = 20. Bundestag) |
| **MdB** | Mitglied des Bundestags |
| **TOP** | Tagesordnungspunkt |
| **DIP** | Deutsches Interaktives Parlamentsdokumentationssystem |
| **Plenarprotokoll** | Protokoll einer Bundestagssitzung |
| **Sitzung** | Einzelne Sitzung einer Wahlperiode (z.B. 1., 2., 3. Sitzung) |
| **AW** | Abgeordnetenwatch |
| **Source** | Herkunft der Daten (bundestag / abgeordnetenwatch / plenarprotokolle) |

---

**Letzte Aktualisierung:** 2026-06-07
**Version:** 1.0
