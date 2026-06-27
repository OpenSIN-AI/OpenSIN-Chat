# OpenSIN Chat — Benutzer-Handbuch

> **Zielgruppe:** Endnutzer — Pressestelle, Fraktionsmitarbeiter, Researcher, politische Mitarbeiter
> **Voraussetzung:** OpenSIN Chat läuft auf `http://localhost:3001` oder `https://sinchat.delqhi.com`
> **Stand:** 2026-06-07

---

## 1. Erste Schritte

### 1.1 Login

OpenSIN Chat unterstützt zwei Modi:

- **Single-User-Mode** (Standard) — Du bekommst beim ersten Aufruf automatisch einen Session-Token, kein Passwort nötig
- **Multi-User-Mode** (Docker) — Login mit Username + Passwort, verschiedene Rollen (Admin, Default)

### 1.2 Dashboard-Übersicht

Nach dem Login siehst du:

- **Linke Sidebar:** Workspaces, Chats, Agenten
- **Mitte:** Aktiver Chat / Workspace
- **Rechts:** Quellen, Einstellungen, Erinnerungen

### 1.3 Workspace anlegen

1. Klicke auf **+ New Workspace** in der Sidebar
2. Vergib einen Namen (z.B. "Bundestag Wahlperiode 21")
3. Wähle eine LLM-Provider-Konfiguration
4. Optional: Wähle eine Vektor-DB (Standard: LanceDB lokal)

---

## 2. Dokumente hochladen (RAG)

Das **Kern-Feature**: Du lädst Dokumente hoch und die KI beantwortet Fragen **nur aus diesen Quellen**.

### 2.1 Unterstützte Formate

| Format | Beschreibung |
|--------|--------------|
| **PDF** | Bundestags-Drucksachen, Pressemitteilungen, Gesetzesentwürfe |
| **DOCX** | Word-Dokumente (interne Papiere, Briefings) |
| **TXT / Markdown** | Reine Textdateien, Notizen |
| **Webseiten** | URLs scrapen und einlesen |
| **YouTube-Transkripte** | Video-URL → automatisch Transkript |
| **Bilder (OCR)** | Gescannte Dokumente, Fotos |

### 2.2 Pressemitteilungen als Wissensbasis

**Workflow:**

1. Workspace öffnen (z.B. "Pressemitteilungen 2026")
2. Klick auf **Upload** → Datei(en) auswählen
3. Optional: **Embed** an (Standard) → Dokumente werden vektorisiert
4. Warten bis "Processing complete"
5. Jetzt: Im Chat Fragen stellen — KI nutzt **nur** diese Dokumente

**Beispiel-Fragen:**

- *"Was sind die Kernaussagen unserer Pressemitteilung zur Energiepolitik?"*
- *"Welche Forderungen haben wir zur Migration im Q2 gestellt?"*
- *"Fasse alle PM zur Rentenpolitik aus 2026 zusammen."*

**Wichtig:** Antworten kommen **mit Zitaten** — du siehst immer, aus welcher Datei die Information stammt.

---

## 3. Politiker-Datenbank nutzen

> **Hinweis:** Die Datenbank muss erst synchronisiert werden. Siehe `docs/user-guide.md` § 3.7.

### 3.1 Suche nach Abgeordneten

**Im Chat** (über das `@politician-search` Agent-Plugin):

```
@politician-search Alle AfD-Abgeordneten aus Sachsen
```

**Über die API:**

```bash
curl "http://localhost:3001/api/politician/search?q=Weidel&party=AfD" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 3.2 Profil eines Politikers anzeigen

```
@politician-search Zeig mir das Profil von Alice Weidel
```

Antwort enthält:
- Name, Geburtsdatum, Beruf
- Aktuelle Mandate (Bundestag, Wahlkreis)
- Fraktionszugehörigkeit
- Ausschuss-Mitgliedschaften
- Nebentätigkeiten (von Abgeordnetenwatch)
- Profilfoto (falls verfügbar)

### 3.3 Abstimmungsverhalten analysieren

```
@politician-search Wie hat Frauke Petry in der Migrationspolitik abgestimmt?
```

**Oder direkt in der UI:**

1. Politiker-Profil öffnen
2. Tab **Abstimmungen** klicken
3. Filter: Zeitraum, Thema, Ergebnis (dafür/dagegen/enthaltung)

**Anwendungsfall:** Für Oppositions-Analyse oder Koalitions-Argumente.

### 3.4 Plenarprotokoll-Reden durchsuchen

```
@politician-search Zeig mir alle Reden von Tino Chrupalla zur Energiepolitik
```

**Ergebnis:** Liste aller Reden mit:
- Datum, Sitzungsnummer
- Volltext-Auszug
- Kontext (vorherige/nächste Rede)
- Direktlink zum Original-Protokoll

### 3.5 Semantische Suche über alle Reden

**Beispiel-Anfrage:**

```
@politician-search Welche Reden befassen sich mit der Energiekrise 2022-2023?
```

Die KI nutzt **Vektor-Ähnlichkeit** (nicht nur Stichworte) und findet auch Reden, die das Thema anders formulieren.

**Hinweis:** Diese Funktion benötigt **PGVector** (nicht SQLite). Setup-Anleitung in `docs/supabase-self-hosted.md`.

### 3.6 Konkrete Workflows

**Workflow 1: Oppositions-Dossier erstellen**

1. `@politician-search Liste alle Reden der Grünen zum Heizungsgesetz`
2. KI listet 20+ Reden
3. Folgefrage: *"Fasse die Hauptargumente zusammen"*
4. Folgefrage: *"Welche Aussagen widersprechen sich?"*

**Workflow 2: Wahlkreis-Analyse**

1. `@politician-search Welcher Abgeordnete ist für PLZ 09111 zuständig?`
2. Profil + Ausschüsse anzeigen
3. Reden der letzten 6 Monate listen

**Workflow 3: Koalitions-Bruchstellen finden**

1. `@politician-search Alle Abstimmungen wo die Ampel-Koalition nicht einstimmig war`
2. Themen clustern
3. AfD-Position gegenüberstellen

### 3.7 Datenbank initial befüllen

Die Politiker-DB ist beim ersten Start leer. Zum Befüllen:

```bash
# Sync-Job manuell anstoßen
cd /Users/jeremy/dev/OpenSIN-Chat/server
node jobs/sync-politician-data.js
```

Der Job:
1. Lädt alle aktuellen Bundestags-Abgeordneten (~750)
2. Lädt Profile von Abgeordnetenwatch
3. Scrapt Plenarprotokolle der aktuellen Wahlperiode
4. Embeddet Reden für semantische Suche

**Dauer:** ~30-60 Minuten beim ersten Mal.

---

## 4. Deep Research Pipeline

Automatisierte Web-Recherche mit Quellenangaben.

### 4.1 Eine Recherche starten

**Im Chat** (über das `@deep-research` Plugin):

```
@deep-research Was sind die aktuellen Positionen der CDU zur Energiepolitik?
```

**Über die API:**

```bash
curl -X POST "http://localhost:3001/api/research/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"query": "Aktuelle Energiepolitik EU", "depth": "standard"}'
```

Antwort:

```json
{
  "jobId": "research-abc123",
  "status": "running",
  "query": "Aktuelle Energiepolitik EU"
}
```

### 4.2 Status prüfen

```bash
curl "http://localhost:3001/api/research/research-abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Status: `running` → `completed` | `failed`

### 4.3 Ergebnis abrufen

```bash
curl "http://localhost:3001/api/research/research-abc123/result" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Ergebnis enthält:**

- **Zusammenfassung** (LLM-generiert)
- **Quellen** (alle besuchten URLs mit Titel, Snippet, Zugriffszeit)
- **Confidence-Score** (0-100%, wie konsistent die Quellen sind)
- **Markdown-Export** (für Copy-Paste in PM)

### 4.4 Recherche-Optionen

| Parameter | Optionen | Beschreibung |
|-----------|----------|--------------|
| `depth` | `quick` / `standard` / `deep` | Wie viele Quellen besucht werden |
| `sources` | `web` / `news` / `academic` | Welche Quellen-Typen |
| `language` | `de` / `en` / `multi` | Sprachen |
| `maxAge` | `24h` / `7d` / `30d` | Max. Alter der Quellen |

**Beispiel:**

```json
{
  "query": "Aktuelle AfD-Umfragewerte 2026",
  "depth": "deep",
  "sources": ["news"],
  "maxAge": "7d"
}
```

### 4.5 Multi-Step-Research mit dem Orchestrator

Für komplexe Recherchen (z.B. "Recherchiere Migration + erstelle Dossier"):

```
@orchestrator Recherchiere die AfD-Position zur EU-Migrationspolitik,
               finde relevante Reden, erstelle ein PDF-Dossier
```

Der Orchestrator zerlegt die Aufgabe in:
1. Web-Recherche zu AfD-Positionen
2. Suche passende Plenarprotokoll-Reden
3. Erstelle strukturiertes Markdown
4. Generiere PDF

---

## 5. PDF Reports erstellen

### 5.1 Aus Chat-Verlauf einen Report generieren

**Im Chat:**

```
@generate-report Erstelle aus diesem Chat einen PDF-Bericht
```

**Optionen:**

- **Titel** (Default: erste Frage)
- **Branding** (Standard: AfD-Blau)
- **Cover-Page** (Standard: aktiv)
- **Quellenliste** (Standard: am Ende)

### 5.2 AfD-Branding

Jeder Report enthält:
- **Cover-Page** mit Titel, Datum, "OpenSIN Chat — Fraktionsresearch"
- **Header** auf jeder Seite: "OpenSIN Chat" (klein, rechts)
- **Footer** mit Seitenzahl + Logo-Platzhalter
- **Farbschema:** AfD-Blau `#009ee0` für Akzente

### 5.3 Report herunterladen

Nach der Generierung:

1. Notification "Report erstellt"
2. Klick → Download startet
3. Oder: Über die API `GET /api/reports/:id`

**Speicherort:** `server/storage/reports/report-{timestamp}.pdf`

### 5.4 Aus Research-Job generieren

```bash
curl -X POST "http://localhost:3001/api/reports/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "source": "research",
    "jobId": "research-abc123",
    "title": "Dossier: EU-Migrationspolitik 2026",
    "branding": "afd"
  }'
```

**Antwort:**

```json
{
  "reportId": "report-xyz789",
  "url": "/api/reports/report-xyz789",
  "size": 245678,
  "pages": 12
}
```

---

## 6. Agent-Plugins im Überblick

| Plugin | Slash-Command | Funktion |
|--------|---------------|----------|
| `@politician-search` | `/politician` | Politiker-DB abfragen |
| `@deep-research` | `/research` | Web-Recherche starten |
| `@generate-report` | `/report` | PDF erstellen |
| `@orchestrator` | `/orchestrate` | Multi-Step-Workflow |

### 6.1 Plugins im Chat aktivieren

**Slash-Commands funktionieren automatisch**, aber du kannst sie auch explizit aufrufen:

```
/politician Alice Weidel
/research Energiepolitik 2026
/report Erstelle PDF aus diesem Chat
```

### 6.2 Plugins kombinieren

**Beispiel-Workflow:**

```
@orchestrator Erstelle ein Dossier zum Thema "Heizungsgesetz":
  1. /research Aktuelle Debatte
  2. /politician Reden der relevanten Abgeordneten
  3. /report Generiere PDF
```

---

## 7. Konkrete Use-Cases für die AfD

### Use-Case 1: Pressemitteilung entwerfen

**Vorbereitung:**
1. Lade die Pressemitteilung des Gegners hoch (oder die Original-Stellungnahme der Regierung)
2. Lade relevante AfD-Positionen / Reden hoch

**Chat-Anfrage:**

```
Schreibe eine Pressemitteilung (300 Wörter) als Reaktion auf die
heutige Aussage des Bundeswirtschaftsministers zum Heizungsgesetz.
Ton: sachlich-kritisch, nicht polemisch. Nutze unsere AfD-Position
aus den hochgeladenen Dokumenten.
```

**Ergebnis:** PM-Entwurf mit Quellenangaben aus den AfD-Dokumenten.

---

### Use-Case 2: Abgeordneten-Dossier

**Chat-Anfrage:**

```
@politician-search Erstelle ein Dossier über [Name]:
  - Biografie
  - Aktuelle Mandate und Ausschüsse
  - Abstimmungsverhalten der letzten 12 Monate
  - Wichtigste Reden (Top 5)
  - Politische Positionen (aus Reden abgeleitet)
```

**Output:** Strukturiertes Markdown, kann direkt als PDF exportiert werden.

---

### Use-Case 3: Faktencheck

**Chat-Anfrage:**

```
@deep-research Prüfe folgende Aussage: "Die Energiepreise sind 2025
um 40% gestiegen."

Suche nach offiziellen Quellen (Destatis, BMWK, EU-Kommission).
Gib mir 3-5 Belege mit URL.
```

**Ergebnis:** Quellen-Liste mit Confidence-Score.

---

### Use-Case 4: Redenvorbereitung

**Vorbereitung:**
1. Lade das Thema + Tagesordnungspunkt hoch
2. Lade frühere Reden der eigenen Fraktion zu diesem Thema hoch
3. Lade Reden der politischen Gegner hoch

**Chat-Anfrage:**

```
Entwirf eine 10-Minuten-Rede (ca. 1500 Wörter) zu [Thema].
Struktur:
1. Aktuelle Lage (2 Min)
2. AfD-Position (3 Min)
3. Kritik am Regierungshandeln (3 Min)
4. Unsere Forderungen (2 Min)
Ton: sachlich, kämpferisch aber seriös.
```

---

### Use-Case 5: Bericht für Fraktionssitzung

**Chat-Anfrage:**

```
@orchestrator Erstelle einen Wochenbericht für die Fraktionssitzung:
  - Top-Themen der Woche (aus Plenarprotokollen)
  - Wichtige Abstimmungen + unsere Position
  - Medienecho (aus Deep Research)
  - Ausblick auf nächste Woche
  Format: Markdown → PDF
```

**Output:** Sofort druckfertiger Bericht.

---

### Use-Case 6: Oppositions-Analyse

**Chat-Anfrage:**

```
@orchestrator Analysiere die Regierungsposition zu [Thema]:
  1. Alle Minister-Aussagen der letzten 30 Tage
  2. Abstimmungsverhalten der Koalition
  3. Widersprüche zwischen Aussagen und Abstimmungen
  4. AfD-Gegenposition (aus unseren Dokumenten)
```

**Output:** Strukturiertes Dossier mit Schwachstellen-Analyse.

---

## 8. Tipps & Best Practices

### 8.1 Welche Dokumente laden?

**Gute Quellen:**

- Eigene Pressemitteilungen (für konsistente Argumentation)
- Bundestags-Drucksachen (offizielle Quellen)
- Eigene Positionspapiere
- Fraktionsinterne Papiere
- Wissenschaftliche Studien (für Sachargumente)

**Weniger gut:**

- Zeitungsartikel (oft meinungsgetrieben)
- Social-Media-Posts (Qualität schwankend)
- Veraltete Dokumente (mehr als 5 Jahre alt)

### 8.2 Wie fragt man die KI am besten?

**Schlecht:**

```
Was sagt die AfD zu Migration?
```

**Gut:**

```
Fasse die AfD-Position zur Migrationspolitik aus den hochgeladenen
Positionspapieren 2024-2026 zusammen. Liste konkrete Forderungen
mit Quellenangabe.
```

**Tipps:**

- Konkret statt allgemein
- Quellen angeben (welche Dokumente nutzen?)
- Format wünschen (Liste, Fließtext, Tabelle)
- Länge angeben (300 Wörter, 5 Punkte)

### 8.3 Module kombinieren

**Kombination 1: Recherche + Profil + Report**

```
@orchestrator Erstelle ein Dossier über [Politiker]:
  1. @politician-search Profil + Reden
  2. @deep-research Aktuelle Medienaussagen
  3. @generate-report PDF
```

**Kombination 2: Opposition analysieren**

```
@orchestrator Opposition-Analyse zu [Gesetz]:
  1. @politician-search Reden der Befürworter
  2. @politician-search Reden der Kritiker
  3. @deep-research Argumente aus Studien
  4. @generate-report Zusammenfassung als PDF
```

---

## 9. Häufige Fragen (FAQ)

### 9.1 Wie groß dürfen Dokumente sein?

- **Einzeldatei:** Bis 100 MB
- **Workspace gesamt:** Unbegrenzt (lokaler Speicher)
- **NVIDIA Nemotron:** 1M Context (= ca. 1500 Seiten Text)

### 9.2 Funktioniert das auch offline?

- **Vollständig offline:** Mit Ollama oder LM Studio als LLM-Provider
- **Bundestag-API:** Online (Bundesquelle)
- **Deep Research:** Online (Web-Suche)
- **PDF-Reports:** Offline (kein Cloud-Call)

### 9.3 Wie sicher sind meine Daten?

- **Self-Hosted:** Alle Daten auf deinem Server
- **Keine Telemetrie:** Null Outbound-Calls zu Dritten
- **DSGVO:** Volle Kontrolle, lokal in DE/EU hostbar
- **API-Keys:** Nur für die LLM-Provider, die du konfigurierst

### 9.4 Was kostet der Betrieb?

- **Server:** Eigener Mac/Linux/Windows (kein Cloud-Zwang)
- **LLM-Provider:**
  - **Lokal (Ollama):** 0 €/Monat (Stromkosten)
  - **Cloud:** 10-100 €/Monat je nach Nutzung
- **Keine Lizenzkosten:** MIT-Lizenz

### 9.5 Was tun wenn die Politiker-DB leer ist?

```bash
# 1. Sync-Job manuell starten
cd server && node jobs/sync-politician-data.js

# 2. Status prüfen
curl http://localhost:3001/api/politician/stats

# 3. Logs checken
tail -f server/storage/logs/politician-sync.log
```

### 9.6 Wie aktualisiere ich die App?

```bash
# 1. Code aktualisieren
git pull origin main

# 2. Dependencies
cd server && yarn install
cd ../frontend && yarn install

# 3. Rebuild
cd frontend && yarn build

# 4. Server neu starten
# (je nach Setup: docker compose restart, oder manuell)
```

### 9.7 Wo finde ich weitere Hilfe?

- **API-Dokumentation:** `docs/api.md`
- **Architektur:** `docs/architecture.md`
- **Roadmap:** `ROADMAP.md`
- **Issues:** https://github.com/Family-Team-Projects/OpenSIN-Chat/issues
- **Live-Demo:** https://sinchat.delqhi.com

---

## 10. Anhang: Tastatur-Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Cmd + K` | Schnellsuche |
| `Cmd + N` | Neuer Chat |
| `Cmd + U` | Datei hochladen |
| `Cmd + /` | Agent-Plugin-Menü |
| `Esc` | Modal schließen |

---

*Letztes Update: 2026-06-07 · Version: v0.1.0 · Maintainer: @Family-Team-Projects*
