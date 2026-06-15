# AUDIT-NEXT-AGENT

> Onboarding-Leitfaden für den nächsten Agenten, der an **OpenSIN-Chat** weiterarbeitet.
> Enthält alles, was zu Beginn gefehlt hat, um sofort loslegen zu können — ohne
> dieselben Sackgassen erneut zu durchlaufen.
>
> Stand: 2026-06-15 · Aktueller Arbeits-Branch: `v0/naurimans-1224-ae14ea34`
>
> **Kapitelübersicht**
> - §A CI/Lint-Infrastruktur — Stolpersteine + Runbook ← NEU (Issues #178–#186)
> - §B Dependency-Security-Workflow ← NEU
> - §C Branch-Strategie & offene Issues ← NEU
> - §0 TL;DR — 60-Sekunden-Startblock (UX-Audit)
> - §1–§13 UX-Audit-Leitfaden (unverandert, Stand 2026-06-14)

---

## A. CI / Lint-Infrastruktur — Runbook & bekannte Fallstricke

> Dieses Kapitel deckt die Bugs aus Issues #178–#182 und #185–#186 ab.
> Wer nur UX-Audit macht, kann direkt zu §0 springen.

### A.1 Projektstruktur (Monorepo, drei unabhängige Workspaces)

```
OpenSIN-Chat/
├── frontend/         Vite + React  (yarn, eslint.config.js)
├── server/           Node/Express  (yarn, eslint.config.mjs)
├── collector/        Node          (yarn, eslint.config.mjs)
├── package.json      Root-Tooling  (yarn scripts: lint:ci, test)
└── docs/LINT-AND-AUDIT.md   detailliertes Runbook (alle Befehle)
```

Jedes Workspace hat sein **eigenes** `yarn.lock` und `node_modules`.
`npm install` auf Root-Ebene ist falsch — immer workspace-spezifisch mit `yarn` installieren.

### A.2 Korrekte Install-Befehle

```bash
# devDependencies MUSS installiert sein (Pflicht vor lint:check!)
# NICHT --production — dann fehlt eslint -> exit 127
cd frontend  && yarn install --frozen-lockfile --network-timeout 100000
cd server    && yarn install --frozen-lockfile --network-timeout 100000
cd collector && yarn install --frozen-lockfile --network-timeout 100000
```

**Sonderfall collector:** Die Abhängigkeit `epub2-static` ist als `git+ssh://`-URL
im `yarn.lock` gecacht. In Sandbox-Umgebungen ohne SSH-Zugang muss vor dem Install
ein Git-URL-Rewrite gesetzt werden:

```bash
git config --global url."https://github.com/".insteadOf "ssh://git@github.com/"
git config --global --add url."https://github.com/".insteadOf "git@github.com:"
```

### A.3 Lint-Befehle

```bash
# Einzel-Workspace (im jeweiligen Verzeichnis):
yarn lint:check     # CI-Gate — schlägt bei Errors fehl, Warnings erlaubt
yarn lint           # Auto-Fix (prettier, no-var, import-Sortierung)

# Alle drei Workspaces sequenziell (aus Root):
yarn lint:ci
```

Erwartetes Steady-State: **0 Errors** in jedem Workspace.
`no-console`- und `i18next/no-literal-string`-Warnings sind absichtlich nicht-fehlend.

### A.4 Bekannte ESLint-Crashs und warum sie entstehen

> **Kern-Regel:** Security-Resolutions müssen die gepatchte Version **innerhalb
> des vom Consumer akzeptierten Ranges** verwenden — nie blind den neuesten Major
> erzwingen. Ein falscher Major bricht zur Laufzeit mit kryptischen TypeErrors,
> nicht mit einer hilfreichen Fehlermeldung.

| Symptom | Ursache | Fix |
|---------|---------|-----|
| `TypeError: Cannot set properties of undefined (setting 'defaultMeta')` | `"ajv": ">=8.18.0"` in resolutions erzwingt ajv v8, aber `@eslint/eslintrc` (ESLint 9 Legacy-Shim) nutzt ajv **v6** API intern | `"ajv": "^6.14.0"` (wie frontend) |
| `TypeError: expand is not a function` (in minimatch) | `"brace-expansion": ">=5.0.5"` erzwingt v5 (ESM-only), aber `minimatch@3` (genutzt von `@eslint/config-array`) erwartet v1-CommonJS-Funktion | `"brace-expansion": "^1.1.13"` — CVE-2025-5889 ist ab v1.1.12 gepatcht, v1 bleibt kompatibel |
| `eslint: command not found` / exit 127 | devDependencies nicht installiert (`--production` oder fehlgeschlagener Install) | `yarn install --frozen-lockfile` ohne `--production` |

Aktuelle Resolutions in allen drei `package.json`-Dateien sind korrekt gesetzt.
**Nach jeder Resolution-Änderung:** `yarn install && yarn lint:check` lokal verifizieren,
bevor committed wird.

### A.5 Frontend: `no-undef` false positives auf TypeScript-Dateien

ESLints `no-undef`-Regel kennt keine TypeScript-Ambient-Typen aus `@types/react`
(`React`, `JSX`) oder `lib.dom.d.ts` (`EventListener`) und erzeugt falsch-positive
Errors in allen `.tsx`-Dateien. Gelöst in `frontend/eslint.config.js` durch einen
Override-Block, der **zwingend als letzter Block** platziert sein muss (ESLint Flat
Config: letzter Block gewinnt):

```js
// MUSS der letzte Block in eslint.config.js sein!
{
  files: ["src/**/*.{ts,tsx}"],
  rules: { "no-undef": "off" }
}
```

TypeScript selbst übernimmt den Undefined-Check zur Compile-Zeit.

### A.6 Collector `yarn.lock` Konflikt (form-data)

Die Resolution `"form-data": ">=4.0.4"` ist absichtlich ein Range-Pin, keine
Exact-Version. Eine Abhängigkeit im Collector-Tree benötigt `^4.0.5`, was eine
Exact-Pin `4.0.4` verletzen würde. Der Range-Pin `>=4.0.4` erfüllt beide.
**Nicht auf eine Exact-Version zurücksetzen.**

### A.7 `package-lock.json` niemals committen

Diese Dateien sind git-ignored in allen Workspaces und im Root. `yarn.lock` ist
die einzige Quelle der Wahrheit. Das npm-Lockfile existiert nur transient für
`npm audit`.

**Kritisch:** `npm install` (ohne `--package-lock-only`) im Frontend-Dir
**überschreibt `yarn.lock`** mit npm-aufgelösten Versionen — danach kehren
ESLint-Errors zurück. Immer nur `yarn install` oder `npm install --package-lock-only`
verwenden.

---

## B. Dependency-Security-Workflow

### B.1 Das Problem mit `yarn audit` (Yarn 1.x)

`yarn audit` (Yarn 1.x) schlägt für Scoped-Packages regelmäßig fehl:
`Unexpected audit response (Missing Metadata): false` — bekannter Yarn-1.x-Bug
ohne Upstream-Fix. **Nicht für den CI-Gate verwenden.**

### B.2 Korrekte Audit-Befehle

**Frontend** (einziger Workspace mit npm-audit-Skripten — selbst-enthaltend):

```bash
cd frontend

# Lockfile generieren + Audit auf "moderate" und höher (CI-Gate)
yarn run audit

# Nur "high" und höher
yarn run audit:high

# Nur Lockfile neu generieren (ohne Audit)
yarn run audit:prepare
```

`yarn run audit` führt intern aus:
1. `npm install --package-lock-only --legacy-peer-deps` (transientes Lockfile aus yarn.lock)
2. `npm audit --audit-level=moderate`

**Server / Collector:**

```bash
cd server    && yarn audit --level moderate
cd collector && yarn audit --level moderate
```

### B.3 Resolutions-Regeln

| Regel | Begründung |
|-------|-----------|
| Security-Floors als Range (`>=X.Y.Z`), nicht Exact (`X.Y.Z`) | Erlaubt Patch-Updates, verhindert Downgrade |
| Major niemals erzwingen wenn Consumer älteren Range hat | `brace-expansion ^1.x` ist sicher; `>=5.x` bricht minimatch |
| `ajv` immer `"^6.14.0"` | ESLint 9.x-Internas nutzen ajv v6 API |
| Nach jeder Resolution-Änderung: `yarn install && yarn lint:check` | Schnelles Feedback bevor CI scheitert |

---

## C. Branch-Strategie & offene Issues

### C.1 Aktiver Branch

| Branch | Inhalt |
|--------|--------|
| `v0/naurimans-1224-ae14ea34` | Alle Fixes #178–#182 + #185–#186 (aktueller Arbeits-Branch) |
| `main` | Stable baseline |

**Commits über main hinaus (Zusammenfassung):**

```
fix(collector): sync security resolutions (#178)
fix(frontend/eslint): eliminate no-undef false positives (#179)
fix: ajv + brace-expansion resolutions + frontend audit script (#180-182)
ci: collector/server lint jobs + frontend npm audit gate (#180-182)
fix(frontend): auto-fix prettier/no-var errors; gitignore package-lock
fix(server): auto-fix prettier; remove unused catch binding
fix(collector): auto-fix prettier; fix form-data range; update yarn.lock
feat(docs): LINT-AND-AUDIT.md runbook; update AUDIT-NEXT-AGENT.md
```

PR #183 ist offen gegen `main`.

### C.2 Status aller Issues aus der #176-er CEO-Audit-Serie

| Issue | Titel | Status |
|-------|-------|--------|
| #178 | Collector: 3 CRITICAL + 54 HIGH vulns | Gefixt, committed |
| #179 | Frontend: 226 ESLint Errors (no-undef false positives) | Gefixt, committed |
| #180 | Server ESLint crash (TypeError: ajv defaultMeta) | Gefixt, committed |
| #181 | Frontend yarn audit fails (Missing Metadata) | Gefixt, committed |
| #182 | Collector lint not operational (eslint: command not found) | Gefixt, committed |
| #185 | [P1] Frontend yarn audit "Missing Metadata" | Gefixt (self-contained npm audit script) |
| #186 | [P0] Restore lint infra: server crash, frontend errors, collector missing | Gefixt (brace-expansion + auto-fix + CI-Jobs) |

### C.3 Nächstes TODO für nächsten Agenten

1. **PR #183 reviewen und mergen** — alle Fixes sind committed.
2. **`no-console`-Warnings reduzieren** — server: 141, collector: einige.
   Kein CI-Blocker, aber Tech-Debt. Empfehlung: strukturierten Logger einfühlen.
3. **Neue Pakete installieren:** immer `yarn install` (nicht `npm install`) im
   jeweiligen Workspace; danach `yarn lint:check`.
4. **Neue Security-Resolutions:** Range-Pin statt Exact-Pin; nach Änderung
   immer `yarn install && yarn lint:check` lokal laufen lassen.

---

## 0. TL;DR — In 60 Sekunden startklar

```bash
# 1. Dependencies (Monorepo: drei separate Workspaces — YARN, nicht npm!)
cd /vercel/share/v0-project/frontend  && yarn install --frozen-lockfile
cd /vercel/share/v0-project/server    && yarn install --frozen-lockfile
cd /vercel/share/v0-project/collector && yarn install --frozen-lockfile

# 2. Dev-Server läuft in dieser Umgebung bereits auf Port 3000 (nur Frontend).
#    Prüfen mit:
curl -sI http://localhost:3000 | head -1

# 3. Onboarding-Gate umgehen + Sprache auf Deutsch (siehe §3 / §4)
agent-browser open http://localhost:3000/
agent-browser storage local set anythingllm_disable_onboarding true
agent-browser storage local set i18nextLng de
agent-browser open http://localhost:3000/           # -> echte App statt /onboarding

# 4. Screenshot
agent-browser screenshot /tmp/app.png
```

---

## 1. Was mir zu Beginn gefehlt hat (Lessons Learned)

Diese Punkte haben den Start blockiert bzw. zu **falschen Schlüssen** geführt.
Genau deshalb existiert dieses Dokument:

| # | Problem | Auswirkung | Lösung (siehe §) |
|---|---------|-----------|------------------|
| 1 | Drei separate `yarn install` nötig (Root + `frontend/` + `server/` + `collector/`) | `cross-env: not found`, Dev-Server startet nicht | §A.2 |
| 2 | `npm install` statt `yarn install` → überschreibt `yarn.lock` | ESLint-Errors kehren zurück | §A.7 |
| 3 | **Onboarding-Gate** leitet jede Route auf `/onboarding` um | Man sieht NUR Onboarding, nie die echte App | §3 |
| 4 | Kein Backend in dieser Umgebung (nur Frontend auf :3000) | `/api/*`-Calls schlagen fehl → Gate greift, Logo lädt nicht | §3, §5 |
| 5 | App nutzt **Browser-Sprache** (Fallback `en`) | App wirkt fälschlich „komplett englisch" | §4 |
| 6 | Zwei System-Models: `system.js` **und** `system.ts` | Vite lädt `.js` zuerst — Edits an `.ts` wirken nicht | §6 |
| 7 | Falsche Settings-URLs → „404" | Scheinbarer Bug, real nur falscher Pfad | §5 |
| 8 | ESLint crasht mit TypeError nach Security-Resolution-Änderung | CI/lint:check bricht ohne hilfreiche Meldung ab | §A.4 |

> **Wichtigste Lehre:** Vor jedem „Befund" rigoros verifizieren. Vieles, was nach
> einem Bug aussieht (englische Texte, kaputtes Logo, 404), ist nur ein Artefakt
> der reinen Frontend-Umgebung. **Keine Befunde fabrizieren.**

---

## 2. Setup & Dev-Server

- **Monorepo**: Root-`package.json` (Workspace/Server-Tooling) + `frontend/`
  (Vite + React, ein AnythingLLM-Fork) + `server/` + `collector/`.
- Alle vier Verzeichnisse brauchen `yarn install --frozen-lockfile` (siehe §A.2).
- Der Frontend-Dev-Server läuft in dieser Umgebung **automatisch auf Port 3000**
  (`$DEV_PORT`). Es gibt **kein laufendes Backend** (normalerweise Port 3001).
- Startskript bei Bedarf: `npm run dev` (nutzt `cross-env`, daher Install zwingend).

---

## 3. Onboarding deaktivieren / als abgeschlossen markieren  ⭐

Jede geschützte Route ist in `<PrivateRoute>` gewrappt. Dieses ruft
`System.isOnboardingComplete()` auf → `fetch('/api/onboarding')`. Ohne Backend
liefert das `false` → **Redirect auf `/onboarding`**. Deshalb sieht man ohne
Eingriff niemals die echte App.

### 3a. Kanonischer Weg (Produktion / mit Backend) — Datenbank-Setting ⭐

Um das Onboarding **dauerhaft** zu deaktivieren, muss in der Datenbank der
Eintrag mit `label = "onboarding_complete"` den Wert `value = "true"` haben.
Setze den Wert auf `"true"`, dann wird das Onboarding nicht mehr angezeigt:

| Ort | Wert | Bedeutung |
|-----|------|-----------|
| DB-Tabelle (Label `onboarding_complete`) | `"true"`  | Onboarding deaktiviert / abgeschlossen |
| DB-Tabelle (Label `onboarding_complete`) | `"false"` oder nicht vorhanden | Onboarding aktiv |

**Relevante Code-Stellen** (Zeilennummern verifiziert, Stand 2026-06-14):
- Backend-Logik: `server/models/systemSettings.js`
  - `isOnboardingComplete()` (Z. 836) prüft `setting?.value === "true"` (Z. 838–839)
  - `markOnboardingComplete()` (Z. 847) schreibt `onboarding_complete: true` (Z. 849)
  - `onboarding_complete` ist ein **`protectedField`** (Z. 59)
- API-Endpunkt: `server/endpoints/system.js`
  - `GET /onboarding` (Z. 110) gibt den Status zurück (`{ onboardingComplete }`)
  - `POST /onboarding` (Z. 122) markiert es als abgeschlossen
- Boot-Patch: `server/utils/boot/markOnboarded.js`
  - Setzt beim Start automatisch `true`, wenn es eine bereits eingerichtete
    Legacy-Instanz ist (Migration alter Instanzen ohne explizites Setting).

**Alternative:** Einfach die App einmal durch das Onboarding klicken — über
`POST /onboarding` wird der Wert dann automatisch auf `true` gesetzt.

### 3b. Audit-Weg (nur Frontend, KEIN Backend) — Dev-Bypass

Für reine optische Audits ohne Backend wurde ein **dev-only** Bypass ergänzt
(Commit `feat: add onboarding bypass feature for dev builds`). Er ist auf
`import.meta.env.DEV` begrenzt und in Produktion **wirkungslos**.

Aktivieren (kein Rebuild nötig):
```bash
agent-browser storage local set anythingllm_disable_onboarding true
# oder per Build-Env: VITE_DISABLE_ONBOARDING=true
```

Implementiert in **beiden** Model-Dateien (`system.js` aktiv, `system.ts` Spiegel):
```js
isOnboardingComplete: async function () {
  if (import.meta.env.DEV && isOnboardingBypassEnabled()) return true;
  // ... normaler fetch('/api/onboarding')
}
```

---

## 4. Sprache umschalten (i18n) — wichtig für korrekte Befunde

- i18n nutzt `i18next-browser-languagedetector`, **Fallback `en`**
  (`frontend/src/i18n.ts`).
- In einem englischsprachigen Test-Browser rendert die App **englisch** —
  das ist **kein Bug**, sondern Locale-Erkennung.
- Sprache forcieren über localStorage-Key `i18nextLng`:

```bash
agent-browser storage local set i18nextLng de   # Deutsch
agent-browser storage local set i18nextLng en   # Englisch
```

- Verfügbare Sprachen: `frontend/src/locales/{en,de}/common.js`
  (`en` = Ground-Truth für Keys, `de` = Übersetzung).
- Vor PR mit neuen Keys: `cd frontend && yarn verify:translations`.

---

## 5. Bekannte Frontend-only-Artefakte (KEINE Produktions-Bugs)

| Artefakt | Ursache | In Produktion? |
|----------|---------|----------------|
| Logo oben links zeigt Alt-Text „Logo" | Custom-Logo wird als `blob:` vom Backend geladen (`naturalWidth=0`) | ✅ lädt mit Backend |
| `/settings/*` teils „404" | Falsche URL **oder** Route braucht Backend/Admin-Rolle | ✅ mit Backend |
| App wirkt „englisch" | Browser-Locale = en | ✅ DE bei `i18nextLng=de` |
| Docs-Seite gemischt DE/EN | Teilweise statischer Inhalt | teilweise zu prüfen |

**Gültige Settings-Routen** (Auszug aus `frontend/src/main.tsx`):
`/settings/llm-preference`, `/settings/system-health`,
`/settings/transcription-preference`, `/settings/audio-preference`,
`/settings/embedding-preference`, `/settings/text-splitter-preference`,
`/settings/vector-database`, `/settings/agents`, `/settings/agents/builder`.
(Es gibt **kein** `/settings/appearance`.)

---

## 6. Architektur-Stolpersteine

- **Doppelte Models:** `frontend/src/models/system.js` (aktiv, von Vite zuerst
  aufgelöst) und `system.ts` (Spiegel). Änderungen an Verhalten **in `.js`**
  vornehmen, `.ts` synchron halten.
- **Routing:** zentral in `frontend/src/main.tsx`; geschützte Routen via
  `components/PrivateRoute/index.tsx`.
- **Auto-Commit:** Datei-Edits in dieser Umgebung werden teils automatisch
  committet — vor dem eigenen Commit `git log --oneline -5` prüfen.

---

## 7. Audit-Methodik (agent-browser)

```bash
# Desktop
agent-browser set viewport 1280 720
agent-browser open http://localhost:3000/ ; agent-browser screenshot /tmp/desktop.png

# Mobile
agent-browser set viewport 375 812
agent-browser open http://localhost:3000/ ; agent-browser screenshot /tmp/mobile.png

# Struktur / a11y
agent-browser snapshot

# Dark/Light-Toggle (frische Snapshot-Refs holen!)
agent-browser find role button click --name "Switch to dark mode"

# Web Vitals
agent-browser vitals http://localhost:3000/ --json
```

Checkliste pro Screen: Layout (Desktop/Tablet/Mobile), Dark+Light, i18n DE+EN,
Kontrast/Fokus, Alt-Texte, Tastaturbedienung, Konsole sauber.

---

## 8. Verifizierte Befunde (Stand 2026-06-14)

Mit echten Screenshots (`docs/audit-screens/`) belegt:

| Bereich | Status | Anmerkung |
|---------|--------|-----------|
| Haupt-Chat (DE) | ✅ | Vollständig übersetzt: „Wie kann ich Ihnen heute helfen?", „Schreibe eine Nachricht", „Werkzeuge", „Quellen des Workspace" |
| Haupt-Chat (EN) | ✅ | Korrekte EN-Strings (Locale-bedingt, kein Bug) |
| Onboarding LLM-Preference | ✅ | Rendert; EN/DE je nach Locale |
| 404-Seite | ✅ | DE-Übersetzung vorhanden (`notFound.title: "404 - Seite nicht gefunden"`) |
| Sidebar / Account-Menü | ✅ | „OpenAfD / Demo-Konto", Suche, Workspaces |
| Logo | ⚠️ Artefakt | Bricht ohne Backend (blob) — kein Prod-Bug |
| **PDF-Analyse (`/pdf-analysis`)** | ✅ **behoben** | War **echter Bug**: rohe i18n-Keys statt Text — siehe unten |

> Ein früherer „Audit-Bericht" mit Scores war **nicht verifiziert**. Künftig
> gilt: jeder Befund muss durch Screenshot/Snapshot/Code belegt sein.

### Behobener Bug: PDF-Upload/Analyse zeigte rohe i18n-Keys (2026-06-14)

**Symptom (optisch belegt):** Die Seite `/pdf-analysis` rendert in den Tabs
*Analysen*, *Fakten-Speicher* und *Korpus-Vergleich* statt Labels die rohen
Übersetzungsschlüssel („pdfAnalysis.panel.title", „PDFANALYSIS.PANEL.NEWANALYSIS",
„pdfAnalysis.panel.pdfFile" …). Das PDF-Upload-Formular war faktisch unbeschriftet.
Screenshot: `docs/audit-screens/pdf-analysis-BEFORE-raw-keys.png`.

**Ursache:** Die Namespaces `pdfAnalysis.panel.*` (~66 Keys) und
`pdfAnalysis.corpus.*` (~28 Keys) fehlten **komplett** in `de/common.js` **und**
`en/common.js`; vorhanden waren nur `crossCheck`, `sourceTypes`, `verdicts`.

**Fix:**
1. `panel`- und `corpus`-Blöcke in beiden Locales ergänzt (DE + EN).
2. Bonus-Bug: `models/pdfAnalysis.js` → `start()` verwarf `deepScan`, obwohl
   Formular & Backend (`server/endpoints/pdfAnalysis.js`) es unterstützen — die
   „Tiefen-Scan"-Checkbox war ohne Wirkung. Jetzt korrekt weitergereicht.

**Verifiziert:** Screenshots `pdf-analysis-AFTER-fixed.png`,
`pdf-corpus-AFTER-fixed.png`; `yarn verify:translations` ✅; eslint ✅.

### Behobener Bug: SpeechToText unmount crash bei Navigation zu `/settings/interface`

**Symptom:** Navigation von `/` nach `/settings/interface` crashte mit
`TypeError: SpeechRecognition.stopListening is not a function` und warf eine
Weiß-Bildschirm-ErrorBoundary.

**Ursache:** Der `useEffect`-Cleanup in `BrowserNative/index.tsx` rief
`SpeechRecognition.stopListening()` bedingungslos auf. In Headless-Browsern
und unsupportierten Umgebungen ist `SpeechRecognition` ein Polyfill-Mock ohne
diese Methode.

**Fix:** Guard `typeof SpeechRecognition.stopListening === "function"` vor dem Aufruf.
Datei: `frontend/src/components/WorkspaceChat/ChatContainer/PromptInput/SpeechToText/BrowserNative/index.tsx`.

**Verifiziert:** Screenshot `docs/audit-screens/stt-fix-settings-interface.png` —
`/settings/interface` lädt vollständig auf Deutsch ohne Crash.

---

### Neu: PDF-Upload DEV-Mock (MSW)

Für Audits und UI-Tests ohne Backend wurde ein vollständiger
**Mock Service Worker**-Layer eingebaut:

**Dateien:**
- `frontend/src/mocks/pdfAnalysisHandlers.ts` — MSW-Handler für alle
  `/api/pdf-analysis/*`-Endpunkte (upload, start, list, status, result,
  cancel, facts, crosscheck, corpus).
- `frontend/src/mocks/browser.ts` — MSW-Worker-Setup.
- `frontend/public/mockServiceWorker.js` — Service Worker (via `npx msw init`).
- `frontend/src/main.tsx` — DEV-Guard: lädt Mock wenn
  `localStorage.getItem("anythingllm_pdf_mock") === "true"`.

**Aktivieren:**
```bash
agent-browser storage local set anythingllm_pdf_mock true
agent-browser reload
```

**Getestete States (alle mit Screenshot belegt in `docs/audit-screens/`):**
1. Leer-State: Formular bereit, "Noch keine Analyse gestartet."
2. Formular ausgefüllt: Datei `test-audit.pdf` + Aufgabe sichtbar im Input.
3. Job-Start: Status "Initialisierung", 0/12 Abschnitte, "Abbrechen"-Button.
4. Job abgeschlossen: Status "Abgeschlossen" (grün), "Bericht anzeigen"-Button.
5. Bericht-Modal: Markdown-Inhalt, "Als Markdown herunterladen", "Schließen".
6. Fakten-Speicher: Suchformular auf Deutsch; "Keine Fakten gefunden"
   (In-Memory-Mock hat keinen Persist über Tab-Wechsel).
7. Fehler-State: Roter Hinweistext "Bitte wählen Sie eine PDF-Datei und geben
   Sie eine Aufgabe an." wenn Pflichtfelder fehlen.

**Hinweis für nächsten Agenten:** Der MSW-Store lebt nur im aktuellen
Service-Worker-Kontext. Fakten sind nach Seiten-Reload weg — das ist
kein Bug, sondern ein Artefakt des DEV-Mocks.

---

## 9. Offene To-Dos (aus früherem Audit-Bericht, noch nicht erledigt)

1. Docs-Seite (`/docs`) auf gemischte DE/EN-Inhalte prüfen und vereinheitlichen.
2. Mit laufendem Backend die Admin-/Settings-Screens optisch auditieren
   (in dieser Umgebung nicht erreichbar).
3. Web-Vitals-Baseline mit Production-Build erheben (Dev verfälscht Timings).
4. Logo-Fallback prüfen: sinnvolles Fallback statt roher Alt-Text bei Ladefehler.
5. Mobile-Sidebar-Überlagerung: Bei 375px Breite schiebt sich die Sidebar über den
   Chat-Content ohne ihn auszublenden — `Sidebar`-Komponente braucht ein Overlay-Muster.

---

## 10. Quick-Reference Befehle

```bash
# Dependencies (yarn, nicht npm!)
cd frontend  && yarn install --frozen-lockfile
cd server    && yarn install --frozen-lockfile
cd collector && yarn install --frozen-lockfile

# Lint (aus jeweiligem Workspace-Verzeichnis)
yarn lint:check     # CI-Gate
yarn lint           # Auto-Fix

# Lint alle Workspaces (aus Root)
yarn lint:ci

# Dependency Audit (Frontend — zuverlässig via npm)
cd frontend && yarn run audit           # moderate+
cd frontend && yarn run audit:high      # high+

# Onboarding bypassen
agent-browser storage local set anythingllm_disable_onboarding true

# Deutsch einstellen
agent-browser storage local set i18nextLng de

# Zur App navigieren
agent-browser open http://localhost:3000/

# Screenshots verschiedener Viewports
agent-browser set viewport 1280 720 && agent-browser screenshot /tmp/desktop.png
agent-browser set viewport 375 812  && agent-browser screenshot /tmp/mobile.png

# Accessibility-Tree
agent-browser snapshot

# i18n-Keys verifizieren (vor PR)
cd frontend && yarn verify:translations

# Git-Status & Commits
git status
git log --oneline -10
git diff HEAD
```

---

## 11. Behobene Bugs & neue Features (PR-Übersicht)

| PR / Commit | Titel | Was | Status |
|-------------|-------|-----|--------|
| #161 | Audit-Leitfaden + Dev-Onboarding-Bypass | AUDIT-NEXT-AGENT.md + `isOnboardingBypassEnabled()` in `system.js` | ✅ merged main |
| #162 | PDF-Analyse i18n fix | `pdfAnalysis.panel.*` + `pdfAnalysis.corpus.*` Keys + `deepScan` Forwarding | ✅ merged main |
| #163 | PDF Analysis icon to right sidebar | FilePdf-Icon in `RightSidebarIconBar` → navigate `/pdf-analysis` | ✅ merged main |
| #183 | Fix #178–#182: vulns, lint crashes, audit failures | ajv/brace-expansion resolutions, no-undef override, npm audit script, CI lint jobs | PR offen |
| — | SpeechToText unmount crash fix | Guard in `BrowserNative/index.tsx` | ✅ |
| — | PDF-Upload DEV-Mock (MSW) | MSW-Handler + Service Worker | ✅ |
| — | #185/#186: frontend audit + lint infra | brace-expansion fix, auto-fix, LINT-AND-AUDIT.md | ✅ committed |

---

## 12. Kommende Audits — worauf der nächste Agent achten sollte

1. **Mit Backend laufen:** Starte `yarn dev` im Root (beide Ports :3000 + :3001)
   → Admin-Screens, Settings, Workspace-Modal werden erreichbar.
2. **Docs-Seite konsistenter machen:** `/docs` hat gemischte DE/EN; entweder komplett
   übersetzen oder auf eine Sprache einigen.
3. **Logo-Fallback:** Wenn Custom-Logo fehlschlägt, sollte es ein Fallback-SVG
   zeigen (nicht Alt-Text).
4. **Web Vitals Baseline:** Mit `yarn build && yarn preview` Production-Metriken
   erheben (dev-mode verfälscht LCP/INP).
5. **Dark Mode auf neuen Komponenten:** Bei neuen UI-Elementen `light:` Varianten
   prüfen (z.B. `light:bg-white`, `light:text-slate-900`).
6. **i18n-Schlüssel vor Merge:** Immer `yarn verify:translations` laufen lassen.
7. **Neue Security-Resolutions:** Immer §B.3 befolgen; `yarn lint:check` nach
   jeder Änderung lokal verifizieren.

---

## 13. Wo finde ich was? (Codebase-Übersicht)

```
frontend/src/
├── components/
│   ├── WorkspaceChat/ChatContainer/RightSidebarIconBar/  <- PDF-Icon hier
│   ├── PrivateRoute/index.tsx                             <- Onboarding-Gate
│   └── Modals/ManageWorkspace/Documents/UploadFile/       <- Dokument-Upload
├── pages/
│   ├── Main/index.jsx                                     <- Haupt-Chat
│   └── PdfAnalysis/index.jsx                              <- PDF-Analyse
├── models/
│   ├── system.js (AKTIV)                                  <- Onboarding-Check
│   ├── system.ts (Spiegel)                                <- nicht benutzt
│   └── pdfAnalysis.js                                     <- PDF-Modell
├── locales/
│   ├── de/common.js                                       <- Deutsche Keys
│   └── en/common.js                                       <- Englische Keys (Template)
├── utils/
│   ├── paths.ts                                           <- paths.pdfAnalysis()
│   └── constants.ts                                       <- API_BASE
└── main.tsx                                               <- Router + Routes

eslint.config.js                                           <- no-undef-Override MUSS letzter Block sein!

server/package.json  }
collector/package.json }  <- ajv: ^6.14.0 + brace-expansion: ^1.1.13 (nie ändern!)
frontend/package.json }

docs/LINT-AND-AUDIT.md   <- vollständiges Lint/Audit-Runbook
```

**Wichtigste Dateien zum Auditieren:**
- Übersetzungen: `frontend/src/locales/{de,en}/common.js`
- Haupt-UI: `frontend/src/components/WorkspaceChat/`
- PDF: `frontend/src/pages/PdfAnalysis/` + `frontend/src/models/pdfAnalysis.js`
- ESLint: `frontend/eslint.config.js`, `server/eslint.config.mjs`, `collector/eslint.config.mjs`
- Resolutions: `server/package.json`, `collector/package.json`, `frontend/package.json`

---

Im Repo unter `docs/audit-screens/`:
- `main-app-de.png` — Haupt-App, Deutsch
- `main-app-en.png` — Haupt-App, Englisch (Locale)
- `onboarding-llm-preference.png` — Onboarding-Schritt
- `404-en.png` — 404-Seite
- `docs-page.png` — Entwickler-Doku-Seite
- `pdf-analysis-BEFORE-raw-keys.png` — PDF-Analyse mit rohen i18n-Keys (Bug)
- `pdf-analysis-AFTER-fixed.png` — PDF-Analyse nach Fix (DE)
- `pdf-corpus-AFTER-fixed.png` — Korpus-Vergleich-Tab nach Fix (DE)
