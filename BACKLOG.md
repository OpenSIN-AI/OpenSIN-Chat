# OpenAfD-Chat — Offener Backlog (Stand: 2026-06-06)

## Aktueller Code-Status
- ESLint: **0 Errors, 0 Warnings** (446 JSX-Dateien)
- `vite build`: **Exit 0** (35.75s, 6260 Module)
- Prettier: vollständig bereinigt (253 Dateien)

---

## Bereits erledigt (dieser Sprint)
- [x] GitHub-Icon Footer verlinkt korrekt zum Repo
- [x] Semantisches HTML: `<nav>`, `<header>` in Sidebar
- [x] Accessibility: aria-labels, focus-visible-rings, aria-expanded
- [x] JSX-Fehler: kaputte Tag-Struktur, fehlende i18n-Keys
- [x] ESLint Bugs: duplicate props, unused vars, ref.current in Deps, useCallback
- [x] Prettier: repo-weiter Fix (253 Dateien, 860 Zeilen)
- [x] i18n: home.logoAlt Key in EN + DE ergänzt

---

## F-1 — 49 console.log aus Prod-Code entfernen [PRIO 1]
- 49 console.log/warn/error in Produktions-Komponenten
- Leaken interne Daten, verlangsamen Browser-Console
- Fix: systematisch entfernen, kein Verhaltensänderung

## F-2 — 83 hardcodierte Placeholder zu i18n migrieren [PRIO 1]
- 83 `placeholder="..."` auf Englisch
- Fix: durch `placeholder={t("...")}` ersetzen + Keys in EN/DE

## F-3 — 4 TODO-Kommentare adressieren [PRIO 2]
- TTSProvider.jsx:11 — System.keys()-Wrapping refactorn
- CometApiLLMOptions:78 — saubere Modell-Gruppierung
- ChatContainer/index.jsx:340 — WSS-Logik vereinfachen

## F-4 — Unit-Tests einrichten [PRIO 2] → Issue #22
- Kein Test-Framework vorhanden
- vitest + @testing-library/react einrichten
- Start mit geänderten Komponenten: Footer, SearchBox, SidebarTabs

## F-5 — Vite Chunk-Size-Warning beheben [PRIO 2]
- Build wirft Chunk > 500kb Warning
- Code-Splitting via dynamische Imports verbessern

## F-6 — DE-Lokalisierung vollständig verifizieren [PRIO 3]
- Automatisiertes EN↔DE Key-Diff Skript

---

## Server/Backend (bestehende Issues)

## S-1 — Dependency-Updates [PRIO 1] → Issues #11-#19
- express 4→5 (breaking), openai 4→6 (breaking), jest 29→30
- actions/checkout 4→6, actions/setup-node 4→6

## S-2 — SBOM generieren [PRIO 2] → Issue #23, #4
## S-3 — License-Header ergänzen [PRIO 2] → Issue #3
## S-4 — CEO Audit abschließen [PRIO 2] → Issue #24
## S-5 — Politician Sync Job starten [PRIO 3] → Issue #21
## S-6 — SIN-Browser-Tools integrieren [PRIO 3] → Issue #20, #8

---

## Empfohlene Reihenfolge
1. F-1 console.log entfernen (30min, kein Risiko)
2. F-5 Chunk-Warning (15min)
3. F-4 Unit-Tests Infra aufbauen
4. F-2 i18n Placeholders
5. S-1 Dep-Updates (express + openai zuerst)
6. F-3 TODOs refactorn
7. S-2/S-3 SBOM + Lizenz-Header
