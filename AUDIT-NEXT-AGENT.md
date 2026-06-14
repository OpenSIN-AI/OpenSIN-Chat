# AUDIT-NEXT-AGENT

> Onboarding-Leitfaden für den nächsten Agenten, der einen **optischen / UX-Audit**
> von OpenSIN-Chat durchführt. Enthält alles, was zu Beginn gefehlt hat, um
> **sofort** loslegen zu können — ohne dieselben Sackgassen erneut zu durchlaufen.
>
> Stand: 2026-06-14 · Branch `audit-next-agent`

---

## 0. TL;DR — In 60 Sekunden startklar

```bash
# 1. Dependencies (Monorepo: Root + Frontend getrennt!)
cd /vercel/share/v0-project        && npm install --legacy-peer-deps
cd /vercel/share/v0-project/frontend && npm install --legacy-peer-deps

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
| 1 | Zwei separate `npm install` nötig (Root **und** `frontend/`) | `cross-env: not found`, Dev-Server startet nicht | §2 |
| 2 | Peer-Dependency-Konflikte | `npm install` bricht ab | `--legacy-peer-deps` (§2) |
| 3 | **Onboarding-Gate** leitet jede Route auf `/onboarding` um | Man sieht NUR Onboarding, nie die echte App | §3 |
| 4 | Kein Backend in dieser Umgebung (nur Frontend auf :3000) | `/api/*`-Calls schlagen fehl → Gate greift, Logo lädt nicht | §3, §5 |
| 5 | App nutzt **Browser-Sprache** (Fallback `en`) | App wirkt fälschlich „komplett englisch" | §4 |
| 6 | Zwei System-Models: `system.js` **und** `system.ts` | Vite lädt `.js` zuerst — Edits an `.ts` wirken nicht | §6 |
| 7 | Falsche Settings-URLs → „404" | Scheinbarer Bug, real nur falscher Pfad | §5 |

> **Wichtigste Lehre:** Vor jedem „Befund" rigoros verifizieren. Vieles, was nach
> einem Bug aussieht (englische Texte, kaputtes Logo, 404), ist nur ein Artefakt
> der reinen Frontend-Umgebung. **Keine Befunde fabrizieren.**

---

## 2. Setup & Dev-Server

- **Monorepo**: Root-`package.json` (Workspace/Server-Tooling) + `frontend/`
  (Vite + React, ein AnythingLLM-Fork).
- Beide Verzeichnisse brauchen `npm install --legacy-peer-deps`.
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
- Vor PR mit neuen Keys: `cd frontend && npm run verify:translations`.

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
`pdf-corpus-AFTER-fixed.png`; `npm run verify:translations` ✅; eslint ✅.

### Offene, echte To-Dos für den nächsten Agenten
1. Docs-Seite (`/docs`) auf gemischte DE/EN-Inhalte prüfen und vereinheitlichen.
2. Mit laufendem Backend die Admin-/Settings-Screens optisch auditieren
   (in dieser Umgebung nicht erreichbar).
3. Web-Vitals-Baseline mit Production-Build erheben (Dev verfälscht Timings).
4. Logo-Fallback prüfen: sinnvolles Fallback statt roher Alt-Text bei Ladefehler.

---

## 10. Quick-Reference Befehle

```bash
# Start der App (mit vollständigem Setup)
cd /vercel/share/v0-project && npm install --legacy-peer-deps
cd frontend && npm install --legacy-peer-deps && npm run dev

# Onboarding bypassen
agent-browser storage local set anythingllm_disable_onboarding true

# Deutsch einstellen
agent-browser storage local set i18nextLng de

# Zur App navigieren
agent-browser open http://localhost:3000/

# Screenshots verschiedener Viewports
agent-browser set viewport 1280 720 && agent-browser screenshot /tmp/desktop.png
agent-browser set viewport 375 812  && agent-browser screenshot /tmp/mobile.png

# Accessibility-Tree anschauen
agent-browser snapshot

# i18n-Keys verifizieren (vor PR)
cd frontend && npm run verify:translations

# Linting und Auto-Format
./node_modules/.bin/eslint --fix src/locales/de/common.js src/locales/en/common.js

# Git-Status & Commits
git status
git log --oneline -10
git diff HEAD
```

---

## 11. Behobene Bugs & neue Features (PR-Übersicht)

| PR | Titel | Was | Status |
|-----|-------|-----|--------|
| #161 | Audit-Leitfaden + Dev-Onboarding-Bypass | AUDIT-NEXT-AGENT.md + `isOnboardingBypassEnabled()` in `system.js` | ✅ merged main |
| #162 | PDF-Analyse i18n fix | `pdfAnalysis.panel.*` + `pdfAnalysis.corpus.*` Keys + `deepScan` Forwarding | ✅ merged main |
| #163 | PDF Analysis icon to right sidebar | FilePdf-Icon in `RightSidebarIconBar` → navigate `/pdf-analysis` | ✅ merged main |

---

## 12. Kommende Audits — worauf der nächste Agent achten sollte

1. **Mit Backend laufen:** Starte `npm run dev` im Root (beide Ports :3000 + :3001)
   → Admin-Screens, Settings, Workspace-Modal werden erreichbar.
2. **Docs-Seite konsistenter machen:** `/docs` hat gemischte DE/EN; entweder komplett
   übersetzen oder auf eine Sprache einigen.
3. **Logo-Fallback:** Wenn Custom-Logo fehlschlägt, sollte es ein Fallback-SVG
   zeigen (nicht Alt-Text).
4. **Web Vitals Baseline:** Mit `npm run build && npm run preview` Production-Metriken
   erheben (dev-mode verfälscht LCP/INP).
5. **Dark Mode auf neuen Komponenten:** Bei neuen UI-Elementen `light:` Varianten
   prüfen (z.B. `light:bg-white`, `light:text-slate-900`).
6. **i18n-Schlüssel vor Merge:** Immer `npm run verify:translations` laufen lassen —
   spart Nacharbeit.

---

## 13. Wo finde ich was? (Codebase-Übersicht)

```
frontend/src/
├── components/
│   ├── WorkspaceChat/ChatContainer/RightSidebarIconBar/  ← PDF-Icon hier
│   ├── PrivateRoute/index.tsx                             ← Onboarding-Gate
│   └── Modals/ManageWorkspace/Documents/UploadFile/       ← Dokument-Upload
├── pages/
│   ├── Main/index.jsx                                     ← Haupt-Chat
│   └── PdfAnalysis/index.jsx                              ← PDF-Analyse (orphaned bis PR#163)
├── models/
│   ├── system.js (AKTIV)                                  ← Onboarding-Check
│   ├── system.ts (Spiegel)                                ← nicht benutzt
│   └── pdfAnalysis.js                                     ← PDF-Modell (deepScan-Fix in PR#162)
├── locales/
│   ├── de/common.js                                       ← Deutsche Keys
│   └── en/common.js                                       ← Englische Keys (Template)
├── utils/
│   ├── paths.ts                                           ← `paths.pdfAnalysis()`
│   └── constants.ts                                       ← API_BASE
└── main.tsx                                               ← Router + Routes
```

**Wichtigste Dateien zum Auditen:**
- Übersetzungen: `frontend/src/locales/{de,en}/common.js`
- Haupt-UI: `frontend/src/components/WorkspaceChat/`
- PDF: `frontend/src/pages/PdfAnalysis/` + `frontend/src/models/pdfAnalysis.js`

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
