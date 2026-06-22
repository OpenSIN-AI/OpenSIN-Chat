# OpenSIN Chat — PLAN: Phase 8 — Docs UI Polish

> **Erstellt:** 2026-06-22  
> **Phase:** 8 — Docs UI Polish  
> **Status:** ✅ COMPLETE  
> **Roadmap:** [ROADMAP.md](ROADMAP.md) — Phase 8  
> **Auslöser:** User-Feedback: Rechtes Inhaltsverzeichnis (TOC) auf der Docs-Seite ist nur auf sehr breiten Bildschirmen (`xl`) sichtbar; Dark/Light-Icon fehlt komplett. Ziel: TOC wie bei Nextra/Docusaurus und Theme-Toggle im Header.

---

## Staleness / Problem Audit

| # | Problem | Aktueller Zustand | Soll-Zustand | Schwere |
|---|---|---|---|---|
| P1 | Rechtes Inhaltsverzeichnis | Nur `hidden xl:block` sichtbar | Ab `lg` sichtbar + Mobile-Variante | Medium |
| P2 | Theme-Umschalter | Nicht in der Docs-Top-Bar vorhanden | Icon-Button in der Docs-Top-Bar | Medium |
| P3 | Mobile TOC | Keine dedizierte Mobile-TOC | Floating-Button + Drawer für kleine Viewports | Low |
| P4 | Tests | Keine Tests für Docs-UI | Unit-Tests für ThemeToggle + TOC-Verhalten | Medium |

---

## Waves (Executed)

### Wave 1: Right TOC — Always Visible on lg+ ✅

#### Task 1.1: Update `frontend/src/pages/Docs/index.tsx` TOC visibility

**files_modified:**
- `frontend/src/pages/Docs/index.tsx`

**action:**
- Rechte TOC-Spalte von `hidden xl:block w-64` zu `hidden lg:block w-60 xl:w-64` geändert.
- Haupt-Content-Layout angepasst: `max-w-3xl xl:mx-0` → `mx-auto max-w-3xl lg:mx-0`.
- Kein horizontaler Scrollbar auf `lg` durch Breiten-Layout.

**acceptance_criteria:** ✅
- Auf `lg` Breakpoint ist das rechte TOC-Panel sichtbar.
- Auf `md` und kleiner ist das TOC-Panel korrekt verborgen.
- `DocsToc` erhält weiterhin `headings` und `scrollRoot`.

---

#### Task 1.2: Mobile TOC (Floating Button / Drawer) ✅

**files_modified:**
- `frontend/src/pages/Docs/index.tsx`
- `frontend/src/pages/Docs/DocsToc.tsx` (optional `onNavigate` prop)

**action:**
- Floating-Button `bottom-6 right-6` hinzugefügt, sichtbar unter `lg` (`lg:hidden`).
- Mobile TOC Drawer mit Slide-up-Panel, Backdrop, Escape-Schließen.
- `DocsToc` bekommt optionalen `onNavigate` Prop, der nach Klick auf einen Eintrag den Drawer schließt.

**acceptance_criteria:** ✅
- Auf Viewports < `lg` ist der Floating-TOC-Button sichtbar.
- Klick öffnet Drawer; Klick auf Eintrag scrollt + schließt Drawer.
- Escape schließt Drawer.

---

### Wave 2: Theme Toggle in Docs Header ✅

#### Task 2.1: Extract reusable `ThemeToggle` component

**files_modified:**
- `frontend/src/components/ThemeToggle.tsx` (new)
- `frontend/src/components/Sidebar/index.tsx`
- `frontend/src/components/Sidebar/index.doc.md`
- `frontend/src/components/ThemeToggle.tsx.doc.md` (new)

**action:**
- Lokaler `ThemeToggle` aus `Sidebar/index.tsx` extrahiert.
- Neue `ThemeToggle.tsx` erstellt mit `useThemeContext`, optional `className` Prop, light→dark→system Rotation.
- Sidebar importiert und verwendet den neuen `ThemeToggle`.
- CoDocs-Companion für `ThemeToggle` erstellt.

**acceptance_criteria:** ✅
- `ThemeToggle.tsx` existiert und ist wiederverwendbar.
- Sidebar funktioniert weiterhin.
- `.doc.md` Companion vorhanden.

---

#### Task 2.2: Add ThemeToggle to Docs top bar

**files_modified:**
- `frontend/src/pages/Docs/index.tsx`

**action:**
- `ThemeToggle` aus `@/components/ThemeToggle` importiert.
- In den Docs-Header platziert (rechte Seite, neben "Zurück zur App").
- Theme-aware Styling angewendet.

**acceptance_criteria:** ✅
- Docs-Header zeigt Theme-Toggle-Button.
- Klick wechselt das Theme.
- Icon wechselt zwischen Sun/Moon.
- Button ist zugänglich (`aria-label`).

---

### Wave 3: Tests & Verification ✅

#### Task 3.1: Add unit tests for ThemeToggle

**files_modified:**
- `frontend/src/components/ThemeToggle.test.tsx` (new)

**action:**
- 6 Tests für `ThemeToggle` erstellt: null context, Moon/Sun icons, theme cycling, aria-label/title, className prop.

**acceptance_criteria:** ✅
- `ThemeToggle.test.tsx` läuft grün.
- `yarn test ThemeToggle` exit 0.

---

#### Task 3.2: Add tests for Docs TOC visibility

**files_modified:**
- `frontend/src/pages/Docs/index.test.tsx` (new)

**action:**
- 8 Tests für Docs-Page: ThemeToggle in Header, Back-to-App, responsive TOC classes, mobile drawer open/close, heading propagation.

**acceptance_criteria:** ✅
- `Docs/index.test.tsx` läuft grün.
- `yarn test Docs/index` exit 0.

---

#### Task 3.3: Build, Lint, Branding verification

**action:**
- `cd frontend && yarn build` ✅
- `yarn lint:check` ✅
- `yarn test` ✅ 2211 Tests
- `./scripts/check-branding.sh` ✅
- Manuelle Verifikation: TOC sichtbar, Theme-Toggle funktioniert, Mobile-Drawer funktioniert.

**acceptance_criteria:** ✅
- Alle Checks grün.

---

## Definition of Done (All Checked)

- [x] Rechtes TOC ist ab `lg` sichtbar (nicht nur `xl`)
- [x] Mobile TOC-Variante (Floating-Button + Drawer) ist implementiert
- [x] Theme-Toggle ist in der Docs-Top-Bar sichtbar und funktioniert
- [x] `ThemeToggle` ist in `frontend/src/components/ThemeToggle.tsx` extrahiert und wiederverwendbar
- [x] `Sidebar/index.tsx` verwendet den extrahierten `ThemeToggle`
- [x] `ThemeToggle` hat eine `.doc.md`-Companion-Datei
- [x] Unit-Tests für `ThemeToggle` existieren und laufen grün
- [x] Unit-Tests für Docs-Page-Layout/TOC existieren und laufen grün
- [x] `yarn build` exit 0
- [x] `yarn lint:check` exit 0
- [x] `yarn test` keine neuen Failures
- [x] `check-branding.sh` exit 0
- [x] Manuelle Verifikation der Docs-Seite erfolgreich

---

## Must-Haves (Verified)

1. **TOC immer sichtbar auf Desktop** ✅
2. **Theme Toggle vorhanden** ✅
3. **Keine Regression** ✅
4. **Wiederverwendbarkeit** ✅

---

## Files Changed

| File | Change |
|---|---|
| `frontend/src/components/ThemeToggle.tsx` | New reusable component |
| `frontend/src/components/ThemeToggle.tsx.doc.md` | CoDocs companion |
| `frontend/src/components/ThemeToggle.test.tsx` | New unit tests |
| `frontend/src/components/Sidebar/index.tsx` | Uses external `ThemeToggle` |
| `frontend/src/components/Sidebar/index.doc.md` | Updated to reflect ThemeToggle extraction |
| `frontend/src/pages/Docs/index.tsx` | TOC lg visibility, mobile TOC drawer, ThemeToggle in header |
| `frontend/src/pages/Docs/DocsToc.tsx` | Added optional `onNavigate` prop |
| `frontend/src/pages/Docs/index.test.tsx` | New unit tests |
| `frontend/src/hooks/useRouteTitle.ts` | Skip title override for `/docs/:slug` |
| `frontend/src/hooks/useRouteTitle.test.tsx` | Updated test for docs-sub-route skip |
| `frontend/src/utils/htmlLang.ts` | Removed `syncDocumentTitle()` from `attachLanguageDomSync()` |

---

## Verifikation

| Check | Result |
|---|---|
| `cd frontend && yarn build` | ✅ |
| `yarn lint:check` | ✅ |
| `yarn test` | ✅ 2211 tests |
| `./scripts/check-branding.sh` | ✅ |
| Manuelle Docs-Seite-Verifikation | ✅ |

---

*Generated: 2026-06-22 | Phase 8: Docs UI Polish | 3 Waves, 8 Tasks | ✅ COMPLETE*
