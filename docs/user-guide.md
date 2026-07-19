# OpenSIN Chat — Benutzer-Handbuch

> **Zielgruppe:** Endnutzer — Pressestelle, Fraktionsmitarbeiter, Researcher, politische Mitarbeiter
> **Voraussetzung:** OpenSIN Chat läuft auf `http://localhost:3001` oder `https://sinchat.delqhi.com`
> **Repository:** [OpenSIN-AI/OpenSIN-Chat](https://github.com/OpenSIN-AI/OpenSIN-Chat)
> **Stand:** 2026-07-19 · **Version:** v1.14.0

---

## 1. Erste Schritte

### 1.1 Login

OpenSIN Chat wird durch ein einzelnes Passwort geschützt, das in der `.env`-Datei als `AUTH_TOKEN` konfiguriert wird.

- **Produktion:** Setze `AUTH_TOKEN` in der `.env` auf ein starkes Passwort. Beim Aufruf der Seite wirst du zur Login-Maske weitergeleitet. Gib das Passwort ein — danach bist du eingeloggt.
- **Lokale Entwicklung:** Wenn kein `AUTH_TOKEN` gesetzt ist, kannst du die App ohne Passwort öffnen (nur für `localhost`).

![Login](../screenshots/login-light.png)

### 1.2 Dashboard-Übersicht

Nach dem Login siehst du ein dreispaltiges Layout:

![Dashboard Übersicht](../screenshots/empty-state-light.png)

- **Linke Sidebar:**
  - Oben: Workspace-Liste (Wechsel zwischen Workspaces per Klick)
  - Mitte: Thread-Liste des aktiven Workspaces (alle Chat-Verläufe)
  - Unten (sticky): **"Neuer Chat"** und **"Neuer Ordner"** Buttons
  - Ganz oben rechts: **Design-Button** für Dark/Light Mode Toggle

- **Mitte (Chat-Bereich):**
  - **Empty State:** Wenn kein Chat aktiv ist, siehst du 4 Capability-Karten (Dokumente hochladen, Chat starten, Notizen machen, Politiker-Datenbank)
  - **Chat-Verlauf:** Wenn ein Thread aktiv ist, werden die Nachrichten angezeigt (zentriert, max. 800px breit)

- **Rechte Sidebar:**
  - Icons für **Quellen** (Dokumente), **Notizen** (Notepad), **Einstellungen** (Gear-Icon)
  - Auf Mobile wird die rechte Sidebar als Overlay-Panel eingeblendet

### 1.3 Workspace anlegen

1. Klicke auf **+ New Workspace** in der Sidebar
2. Vergib einen Namen (z.B. "Bundestag Wahlperiode 21")
3. Wähle eine LLM-Provider-Konfiguration
4. Optional: Wähle eine Vektor-DB (Standard: LanceDB lokal)

![Sidebar](../screenshots/sidebar-light.png)

---

## 2. Dokumente hochladen (RAG)

Das **Kern-Feature**: Du lädst Dokumente hoch und die KI beantwortet Fragen **nur aus diesen Quellen**.

![Dokumente](../screenshots/documents-light.png)

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

### 2.3 Grounding Badge

Wenn die KI Antworten aus deinen Dokumenten generiert, erscheint ein **Sparkle-Symbol (✨)** mit dem Modellnamen unter der Antwort. Dieses "Grounding Badge" zeigt dir, dass die Antwort auf deinen hochgeladenen Quellen basiert und nicht frei erfunden wurde.

![Grounding](../screenshots/grounding-dark.png)

---

## 3. Chat-UI

Der Chat-Bereich ist das Herzstück von OpenSIN Chat. Das Layout ist zentriert (max. 800px breit), ähnlich wie bei ChatGPT, Claude oder Gemini.

### 3.1 Nachrichten-Design

- **Deine Nachrichten (User):** Rechts ausgerichtet, abgerundete Bubble (`bg-zinc-700` im Dark Mode / `bg-slate-100` im Light Mode), max. 80% Breite
- **KI-Antworten (AI):** Links ausgerichtet, keine Bubble (fließender Text), max. 85% Breite, vollständiges Markdown-Rendering (Überschriften, Listen, Tabellen, Links)

### 3.2 Code-Blöcke

![Chat mit Code-Block](../screenshots/chat-codeblock-light.png)

- **Syntax-Highlighting** für alle gängigen Sprachen (Python, JavaScript, Bash, SQL, etc.)
- **Kopieren-Button** oben rechts im Code-Block-Header
- **Language-Label** wird im Header des Code-Blocks angezeigt

### 3.3 Inline-Code

Inline-Code (z.B. `AUTH_TOKEN`) wird mit Hintergrundfarbe, Padding und abgerundeten Ecken dargestellt — klar vom Fließtext abgehoben.

### 3.4 Action-Buttons

Unter jeder **KI-Antwort** erscheinen bei **Hover** u. a.:

| Button | Funktion |
|--------|----------|
| Vorlesen | Nachricht wird vorgelesen (Text-to-Speech) |
| Kopieren | Antwort in die Zwischenablage kopieren |
| Bearbeiten | Antworttext anpassen (z. B. vor Export) |
| Weitere Aktionen | z. B. als Notiz speichern |

Unter **deinen eigenen (User-)Nachrichten** kannst du den **Prompt bearbeiten**. Danach wird der Thread ab dieser Stelle neu generiert (**Rewind**): neuere Antworten werden verworfen und die KI antwortet auf den geänderten Prompt.

**Zeitstempel** unter Nachrichten erscheinen nur bei **Hover** — so bleibt der Chat ruhiger.

### 3.5 Feedback melden (GitHub-Issue)

Thumbs-up/„Gute Antwort“ gibt es **nicht** mehr. Feedback läuft über den Account-Bereich:

1. Unten links auf dein **Profil / Account-Menü** klicken  
2. **Feedback / Problem melden** wählen  
3. Im **In-App-Modal** Titel und Beschreibung eingeben  
4. Absenden erstellt ein **GitHub-Issue** im Projekt-Repo (sofern `GITHUB_FEEDBACK_TOKEN` serverseitig konfiguriert ist)

So bleiben Fehlermeldungen und Verbesserungsvorschläge im Issue-Tracker, ohne die Chat-UI zu verlassen.

### 3.6 Loading-Animation

Während die KI antwortet, siehst du **3 Pulse-Dots** als Loading-Indikator.

### 3.7 Scroll-to-Bottom

Wenn du im Chat-Verlauf nach oben scrollst, erscheint ein kleiner **Scroll-to-Bottom-Button**. Ein Klick bringt dich zurück zur neuesten Nachricht.

![Dark Mode](../screenshots/chat-codeblock-dark.png)

---

## 3A. Quellen im Chat (Attach, Kontext, Zitate)

OpenSIN Chat unterscheidet mehrere Quellen-Ebenen — das ist wichtig, damit Antworten nachvollziehbar bleiben:

| Ebene | Was passiert |
|-------|----------------|
| **Workspace-Dokumente** | Dateien im Workspace sind für RAG (semantische Suche) indexiert |
| **Kontextmodus** (pro Datei) | `aus` / `Zusammenfassung` / `voll` — „immer im Kontext“, unabhängig von der reinen Suche |
| **Chat-Anhang (Attach)** | Datei **nur für diesen Thread** (Parsed Files), nicht automatisch Workspace-Wissen |
| **Pinnen** | Wichtige Docs dauerhaft im Prompt (sync mit Kontextmodus „voll“) |
| **Inline-Zitate** | Antworten nutzen Marker wie `[source:N]` / Context-Quellen — klickbar zur Quelle |

### Typischer Ablauf

1. Dokumente in den **Workspace** laden (Sidebar **Quellen** / Manage Workspace).  
2. Optional pro Datei den **Kontextmodus** setzen (Summary vs. Full).  
3. Im Prompt-Feld über **+ / Anhängen** eine Datei nur für den aktuellen Chat wählen.  
4. Antwort prüfen: **Zitate** und Quellenliste zeigen, woher die Information kommt.  
5. Die **Quellen-Sidebar** filtert/listet Workspace- und Thread-Kontext.

> **Tipp:** „Full“ + Pin für wenige Kern-Dokumente; den Rest per RAG suchen lassen — spart Tokens und hält Antworten schärfer.

---

## 4. Notizblock (Notepad)

OpenSIN Chat hat einen integrierten Notizblock, mit dem du Notizen direkt im Workspace verwalten kannst.

### 4.1 Notepad öffnen

Zwei Wege, um das Notepad zu öffnen:

1. **Capability-Karte:** Klicke im Empty State auf die Karte **"Notizen machen"**
2. **Sidebar-Icon:** Klicke auf das **Notepad-Icon** in der rechten Sidebar

![Notepad](../screenshots/notepad-light.png)

### 4.2 Notizen verwalten

- **Erstellen:** Klicke auf "Neue Notiz" und schreibe deinen Text
- **Bearbeiten:** Klicke auf eine Notiz und bearbeite sie — Änderungen werden **automatisch gespeichert** (Auto-Save)
- **Pinnen:** Wichtige Notizen oben anpinnen, damit sie immer sichtbar bleiben
- **Löschen:** Nicht mehr benötigte Notizen entfernen

**Wichtig:** Notizen sind **pro-Workspace** — jeder Workspace hat seine eigenen Notizen.

---

## 5. Dark/Light Mode

OpenSIN Chat unterstützt beide Themes vollständig.

### 5.1 Umschalten

Klicke auf den **Design-Button** oben rechts in der Sidebar, um zwischen Dark und Light Mode zu wechseln.

### 5.2 Light Mode

- Heller Hintergrund (`slate-50` / `slate-100`)
- Dunkler Text
- Helles Sidebar- und Panel-Design

### 5.3 Dark Mode

- Dunkler Hintergrund (`zinc-950`)
- Heller Text
- Dunkles Sidebar- und Panel-Design

### 5.4 Vollständige Unterstützung

Alle UI-Elemente unterstützen beide Modi:
- Code-Blöcke (angepasstes Syntax-Highlighting)
- Tabellen (angepasste Rahmen und Hintergründe)
- Inline-Code (angepasste Hintergrundfarbe)
- Chat-Bubbles (angepasste Farben)
- Notepad und Settings-Panels

---

## 6. Mobile Nutzung

OpenSIN Chat ist vollständig responsive und ab **375px Breite** nutzbar.

![Mobile](../screenshots/mobile-empty-state.png)

- **Responsive Layout:** Alle Elemente passen sich an die Bildschirmgröße an
- **Rechte Sidebar:** Wird auf Mobile als **Overlay-Panel** eingeblendet (öffnen per Icon-Tap)
- **Prompt Input:** Volle Breite am unteren Rand
- **Sidebar:** Bleibt zugänglich (als ausklappbares Menü)
- **Empty State:** Capability-Karten werden untereinander gestapelt

---

## 7. Politiker-Datenbank nutzen

> **Hinweis:** Die Datenbank muss erst synchronisiert werden. Siehe § 7.7.

### 7.1 Suche nach Abgeordneten

**Im Chat** (über das `@politician-search` Agent-Plugin):

```
@politician-search Alle AfD-Abgeordneten aus Sachsen
```

**Über die API:**

```bash
curl "http://localhost:3001/api/politician/search?q=Weidel&party=AfD" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 7.2 Profil eines Politikers anzeigen

```
@politician-search Zeig mir das Profil von Alice Weidel
```

Antwort enthält:
- Name, Geburtsdatum, Beruf
- Aktuelle Mandate (Bundestag, Wahlkreis)
- Fraktionszugehörigkeiten
- Ausschuss-Mitgliedschaften
- Nebentätigkeiten (von Abgeordnetenwatch)
- Profilfoto (falls verfügbar)

### 7.3 Abstimmungsverhalten analysieren

```
@politician-search Wie hat Frauke Petry in der Migrationspolitik abgestimmt?
```

**Oder direkt in der UI:**

1. Politiker-Profil öffnen
2. Tab **Abstimmungen** klicken
3. Filter: Zeitraum, Thema, Ergebnis (dafür/dagegen/enthaltung)

**Anwendungsfall:** Für Oppositions-Analyse oder Koalitions-Argumente.

### 7.4 Plenarprotokoll-Reden durchsuchen

```
@politician-search Zeig mir alle Reden von Tino Chrupalla zur Energiepolitik
```

**Ergebnis:** Liste aller Reden mit:
- Datum, Sitzungsnummer
- Volltext-Auszug
- Kontext (vorherige/nächste Rede)
- Direktlink zum Original-Protokoll

### 7.5 Semantische Suche über alle Reden

**Beispiel-Anfrage:**

```
@politician-search Welche Reden befassen sich mit der Energiekrise 2022-2023?
```

Die KI nutzt **Vektor-Ähnlichkeit** (nicht nur Stichworte) und findet auch Reden, die das Thema anders formulieren.

**Hinweis:** Diese Funktion benötigt **PGVector** (nicht SQLite). Setup-Anleitung in `docs/supabase-self-hosted.md`.

### 7.6 Konkrete Workflows

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

### 7.7 Datenbank initial befüllen

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

## 8. Deep Research Pipeline

Automatisierte Web-Recherche mit Quellenangaben.

### 8.1 Eine Recherche starten

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

### 8.2 Status prüfen

```bash
curl "http://localhost:3001/api/research/research-abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Status: `running` → `completed` | `failed`

### 8.3 Ergebnis abrufen

```bash
curl "http://localhost:3001/api/research/research-abc123/result" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Ergebnis enthält:**

- **Zusammenfassung** (LLM-generiert)
- **Quellen** (alle besuchten URLs mit Titel, Snippet, Zugriffszeit)
- **Confidence-Score** (0-100%, wie konsistent die Quellen sind)
- **Markdown-Export** (für Copy-Paste in PM)

### 8.4 Recherche-Optionen

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

### 8.5 Multi-Step-Research mit dem Orchestrator

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

## 9. PDF Reports erstellen

### 9.1 Aus Chat-Verlauf einen Report generieren

**Im Chat:**

```
@generate-report Erstelle aus diesem Chat einen PDF-Bericht
```

**Optionen:**

- **Titel** (Default: erste Frage)
- **Branding** (Standard: AfD-Blau)
- **Cover-Page** (Standard: aktiv)
- **Quellenliste** (Standard: am Ende)

### 9.2 AfD-Branding

Jeder Report enthält:
- **Cover-Page** mit Titel, Datum, "OpenSIN Chat — Fraktionsresearch"
- **Header** auf jeder Seite: "OpenSIN Chat" (klein, rechts)
- **Footer** mit Seitenzahl + Logo-Platzhalter
- **Farbschema:** AfD-Blau `#009ee0` für Akzente

### 9.3 Report herunterladen

Nach der Generierung:

1. Notification "Report erstellt"
2. Klick → Download startet
3. Oder: Über die API `GET /api/reports/:id`

**Speicherort:** `server/storage/reports/report-{timestamp}.pdf`

### 9.4 Aus Research-Job generieren

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

## 10. Agent-Plugins im Überblick

| Plugin | Slash-Command | Funktion |
|--------|---------------|----------|
| `@politician-search` | `/politician` | Politiker-DB abfragen |
| `@deep-research` | `/research` | Web-Recherche starten |
| `@generate-report` | `/report` | PDF erstellen |
| `@orchestrator` | `/orchestrate` | Multi-Step-Workflow |

### 10.1 Plugins im Chat aktivieren

**Slash-Commands funktionieren automatisch**, aber du kannst sie auch explizit aufrufen:

```
/politician Alice Weidel
/research Energiepolitik 2026
/report Erstelle PDF aus diesem Chat
```

### 10.2 Plugins kombinieren

**Beispiel-Workflow:**

```
@orchestrator Erstelle ein Dossier zum Thema "Heizungsgesetz":
  1. /research Aktuelle Debatte
  2. /politician Reden der relevanten Abgeordneten
  3. /report Generiere PDF
```

---

## 11. Konkrete Use-Cases für die AfD

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

## 12. Einstellungen

Öffne die Einstellungen über das **Gear-Icon** (Zahnrad) in der rechten Sidebar.

![Settings](../screenshots/settings-light.png)

Verfügbare Einstellungen:

- **LLM-Provider:** Auswahl des Modells (Fireworks AI, etc.)
- **System-Prompt:** Anpassung des Workspace-System-Prompts
- **Vektor-DB:** Konfiguration der Embedding-Datenbank
- **Temperatur:** Kreativität vs. Präzision der Antworten
- **Token-Limit:** Maximale Antwortlänge

---

## 13. Tipps & Best Practices

### 13.1 Welche Dokumente laden?

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

### 13.2 Wie fragt man die KI am besten?

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

### 13.3 Module kombinieren

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

## 14. TTS-Provider einrichten

OpenSIN Chat unterstützt **7 TTS-Engines**. Die Auswahl erfolgt in den
Audio-Einstellungen (`Einstellungen → Audio → TTS-Provider`).

### 14.1 Verfügbare Provider

| Provider | Typ | API-Key nötig | Besonderheit |
|---|---|---|---|
| **Native** | Browser Web Speech API | ❌ | Kein Internet, keine Qualitätsgarantie |
| **OpenAI** | Cloud | ✅ | Offizielle OpenAI-TTS-Stimmen (alloy, echo, …) |
| **OpenAI-kompatibel** | Cloud | ✅ | Funktioniert mit jedem OpenAI-kompatiblen Endpoint |
| **ElevenLabs** | Cloud | ✅ | Premium-Stimmen, hohe Qualität |
| **Kokoro** | Lokal | ❌ | ONNX-Modell, läuft auf eigener Hardware |
| **Piper** | Lokal | ❌ | Schnell, ressourcenschonend |
| **NVIDIA NIM** | Cloud | ✅ | NVIDIA Magpie TTS via NIM-API |
| **cvoice.ai** | Cloud | ✅ | **Deutsche Promi-Stimmen** (Gronkh, Dieter Bohlen, Joko, Julien Bam, Bushido, Daniela Katzenberger) + 20.000 Community-Stimmen |

### 14.2 cvoice.ai einrichten (empfohlen für deutsche Inhalte)

1. **Account erstellen:** https://cvoice.ai/dashboard/api
2. **API-Key kopieren** (Format: `cvai_...`)
3. **In `server/.env` eintragen:**
   ```bash
   TTS_PROVIDER="cvoice"
   TTS_CVOICE_API_KEY=cvai_dein_key_hier
   TTS_CVOICE_VOICE_MODEL=625332f3-27a9-4ecf-9a90-25265d901e72  # Gronkh (default)
   ```
4. **Server neu starten** — die Einstellung `Audio-Einstellungen → TTS-Provider → cvoice.ai`
   wird automatisch verfügbar.

**Wichtig:** Der API-Key bleibt serverseitig. Das Frontend sieht nur einen
Boolean, ob ein Key gesetzt ist — der Key selbst wird nie an den Browser gesendet.

### 14.3 Rate-Limits (cvoice.ai Gratis-Tier)

- **10 Requests/Minute**
- **1.000 Requests/Tag**

OpenSIN Chat mildert das mit einem **256-Entry-LRU-Cache** ab: identische
Texte + Stimme liefern immer dieselbe URL von cvoice.ai, also wird gecachte
Audio ohne neuen API-Call ausgeliefert.

---

## 15. Häufige Fragen (FAQ)

### 15.1 Wie groß dürfen Dokumente sein?

- **Einzeldatei:** Bis 100 MB
- **Workspace gesamt:** Unbegrenzt (lokaler Speicher)
- **NVIDIA Nemotron:** 1M Context (= ca. 1500 Seiten Text)

### 15.2 Funktioniert das auch offline?

- **Vollständig offline:** Mit Ollama oder LM Studio als LLM-Provider
- **Bundestag-API:** Online (Bundesquelle)
- **Deep Research:** Online (Web-Suche)
- **PDF-Reports:** Offline (kein Cloud-Call)

### 15.3 Wie sicher sind meine Daten?

- **Self-Hosted:** Alle Daten auf deinem Server
- **Keine Telemetrie:** Null Outbound-Calls zu Dritten
- **DSGVO:** Volle Kontrolle, lokal in DE/EU hostbar
- **API-Keys:** Nur für die LLM-Provider, die du konfigurierst

### 15.4 Was kostet der Betrieb?

- **Server:** Eigener Mac/Linux/Windows (kein Cloud-Zwang)
- **LLM-Provider:**
  - **Fireworks AI** (primärer Provider): Kosten variieren nach Modell — von günstigen Modellen (wenige Cent pro Anfrage) bis zu Premium-Modellen
  - **SINator Pool Router:** Automatisches Key-Rotation und Load-Balancing über einen Pool von Fireworks API-Keys
  - **Lokal (Ollama / LM Studio):** 0 €/Monat (nur Stromkosten)
- **Keine Lizenzkosten:** MIT-Lizenz

### 15.5 Was tun wenn die Politiker-DB leer ist?

```bash
# 1. Sync-Job manuell starten
cd server && node jobs/sync-politician-data.js

# 2. Status prüfen
curl http://localhost:3001/api/politician/stats

# 3. Logs checken
tail -f server/storage/logs/politician-sync.log
```

### 15.6 Wie aktualisiere ich die App?

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

### 15.7 Wo finde ich weitere Hilfe?

- **API-Dokumentation:** `docs/api.md`
- **Architektur:** `docs/architecture.md`
- **Roadmap:** `ROADMAP.md`
- **Issues:** https://github.com/OpenSIN-AI/OpenSIN-Chat/issues
- **Live-Demo:** https://sinchat.delqhi.com

---

## 16. Anhang: Tastatur-Shortcuts

| Shortcut | Aktion |
|----------|--------|
| `Cmd + K` | Schnellsuche |
| `Cmd + N` | Neuer Chat |
| `Cmd + U` | Datei hochladen |
| `Cmd + /` | Agent-Plugin-Menü |
| `Esc` | Modal schließen |

> **Hinweis:** Shortcuts funktionieren nur im Desktop-Modus.

---

*Letztes Update: 2026-07-19 · Version: v1.14.0 · Maintainer: @OpenSIN-AI*
