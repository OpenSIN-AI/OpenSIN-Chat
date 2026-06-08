# Plan für Agent 3: Inline Styles Refactor (Issue #65)

## Kontext
- **Issue:** #65 — 142 Inline-`style={{...}}`-Blöcke im Frontend
- **Bereits erledigt:** 73 von 142 (durch Agent 2, commit `0399151a`)
- **Verbleibend:** 69 dynamische Inline-Styles
- **Dauer:** ~2-3h
- **Blockiert:** NIEMANDEN — kann parallel zu #80 (Agent 2) laufen

## Aufgabe für Agent 3

### Schritt 1: Audit (15min)
```bash
cd /Users/jeremy/dev/OpenAfD-Chat
grep -rn "style={{" frontend/src --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts" > /tmp/inline-styles-audit.txt
wc -l /tmp/inline-styles-audit.txt
```

Erwartet: ~69 verbleibende Styles (nicht 142, da 73 bereits entfernt)

### Schritt 2: Klassifizierung (30min)
Erstelle `docs/INLINE-STYLES-AUDIT.md` mit Tabelle:
| # | Datei | Zeile | Typ | Aktueller Wert | Geplante Lösung |
|---|-------|-------|-----|----------------|------------------|

Typen:
- **A: Dynamic values** → Tailwind arbitrary values `className="h-[calc(100%-32px)]"` oder CSS-Vars
- **B: Magic numbers** → Design-Tokens in `tailwind.config.js`
- **C: Theme-dependent** → CSS-Variablen `var(--bg-primary)`
- **D: Animation/Transform** → CSS-Vars mit dynamic value
- **E: Conditional** → `clsx()` + conditional classes

### Schritt 3: Design-Tokens definieren (30min)
Falls noch nicht vorhanden, in `frontend/tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'afd-blue': '#009ee0',
      'afd-blue-dark': '#003d7a',
      'primary': 'var(--color-primary)',
      'bg-primary': 'var(--bg-primary)',
      // ... weitere Tokens
    }
  }
}
```

CSS-Variablen in `frontend/src/index.css`:
```css
:root {
  --color-primary: #009ee0;
  --bg-primary: #18181b;
  --text-primary: #fafafa;
}
.light {
  --bg-primary: #ffffff;
  --text-primary: #0f172a;
}
```

### Schritt 4: Migration (1-2h)
Pro Datei:
1. Inline-Style ersetzen
2. Testen (Browser + `npm run test`)
3. Committen mit Conventional-Commits

### Schritt 5: Verifikation
```bash
grep -rn "style={{" frontend/src --include="*.jsx" --include="*.tsx" --include="*.js" --include="*.ts" | wc -l
# Erwartet: 0 (oder sehr wenige, die dokumentiert begründet sind)

npm run test  # Alle Tests müssen passing bleiben
```

## Commit-Strategie
- **1-3 Commits pro Datei-Gruppe** (z.B. "Sidebar-Styles", "ChatContainer-Styles")
- Conventional Commits: `style(frontend): replace inline styles with Tailwind tokens`
- **Pushe NICHT** — nur lokal committen, ich (Haupt-Agent) pushe am Ende
- **Niemals force-pushen**
- **Niemals Branches erstellen** — direkt auf main arbeiten

## Parallel-Aufgaben für Agent 3 (optional, wenn Zeit):

1. **#63 (Test Coverage)** — Coverage-Threshold auf 40% erhöhen
2. **#61 (SWR Hauptticket)** — Verbleibende useEffect-Fetches finden und zu SWR migrieren (140+ verbleibend!)

## Wichtige Regeln
- NIEMALS Branches (alles auf main)
- NIEMALS force-push
- NIEMALS Dependencies ändern ohne Rücksprache
- Bei Unsicherheit: STOPPEN und Haupt-Agent fragen
- **Andere Agenten laufen parallel** — vor jedem Edit: `git pull origin main`

## Aktueller Stand auf main
- HEAD: `c148b38f` (TS-Migration Merge)
- 0 Vulnerabilities
- 118/118 Tests passing
- 28 Test-Suites
