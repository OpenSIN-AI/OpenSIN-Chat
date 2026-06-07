# Issue #30 Nacharbeiten

## Abgeschlossen (Commits: 9e3e462..14c9772)

- [x] Startseiten-Buttons entfernt → `WorkspaceSources`-Komponente zeigt Workspace-Quellen
- [x] Plus-Button im Chat → Dropdown-Menü (`AddSourceMenu`)
  - "Dateien hinzufügen" (lokaler Upload)
  - "Aktuelle Quellen" (vorhandene Dateien aus `System.localFiles()`)
  - "Aus URL einfügen" (Webseiten/YouTube scrapen und embedden)
- [x] Rechtes Sidebar-Dropdown bereinigt
  - TextSize-Row entfernt
  - SourceFilter-Row entfernt
  - Schriftgröße in `Interface settings` (`settings/interface`) hinzugefügt

## Locale-Schlüssel ergänzt (de, en)
- `main-page.workspaceSources` — Titel, Add-Button, Empty-State
- `chat_window.attach_menu` — Menü-Optionen, URL-Input, Status-Nachrichten

## TODO

### 1. Fehlende Locales (i18n-Nachpflege)
Neue Keys müssen in alle vorhandenen Locales kopiert werden:
- `es` (Spanisch)
- `fr` (Französisch)
- `it` (Italienisch)
- `pt` (Portugiesisch)
- `zh` (Chinesisch)
- `ja` (Japanisch)

Keys zum Kopieren:
- `main-page.workspaceSources.*`
- `chat_window.attach_menu.*`

### 2. Browser-Test / QA
- Verifizieren, dass UI wie in Issue #30-Bildern aussieht
- Plus-Dropdown öffnet korrekt
- "Aktuelle Quellen" zeigt Dateien aus allen Workspaces
- URL-Embedding funktioniert und embeddet neu gescrapte Dokumente ins aktive Workspace
- Interface-Schriftgröße-Einstellung speichert und wendet sich an

### 3. Edge-Cases
- Leerzustände (kein Workspace, keine Quellen)
- Lange Quellen-Listen (Performance, Scrolling)
- Error-Handling bei URL-Upload-Fehlern
- Fehlertoasts beim Embedding
- Mobile-Layout des Dropdowns

### 4. Vercel Build-Fix
- [ ] `vercel.json` hinzufügen (Pfad: `frontend/vite.config.js` korrekt bauen)
- Siehe `docs/vercel-deploy-fix.md`
