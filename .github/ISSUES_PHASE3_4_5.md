# Phase 3–5 Issues: Complete Modernization Plan

Diese Datei dokumentiert die ausstehenden Issues für die nächsten Phasen. Sie können direkt als GitHub Issues erstellt werden.

---

## Issue 1: Phase 3 (continued) — Complete dependency and package cleanup

**Labels:** `enhancement`, `audit`  
**Milestone:** Cleanup & Optimization

### Description

Phase 3 hat den Provider-Zoo reduziert und deprecated Dependencies entfernt. Diese finale Aufgabe validiert alle Migrationen und testet die neuen Pakete.

### Tasks

- [ ] Test native embedder mit neuem `@huggingface/transformers` package
- [ ] Verify native reranker works correctly mit HF transformers
- [ ] Run embeddings auf Test-Dokumenten — Output-Qualität verifizieren
- [ ] Test native SSE streaming in workspace chat (reconnection, error handling)
- [ ] Test SSE in thread-based chat + embedding progress streaming
- [ ] Verify proper cleanup on connection close
- [ ] Confirm keine Referenzen zu deleted providers mehr im Code
- [ ] Update `.env.example` — deleted VDB options entfernen
- [ ] Document supported vector databases in README
- [ ] Full integration test: embeddings → storage → search
- [ ] Test LanceDB mit verschiedenen Dokument-Types
- [ ] Test PGVector mit Postgres backend
- [ ] Benchmark: Bundle-Größe Reduktion vs. Phase 2

**Blocked by:** Phases 1–3 completion  
**Expected effort:** 4–6 Stunden

---

## Issue 2: Phase 4 — ENV-as-Database → DB-Settings Migration

**Labels:** `architecture`, `database`, `breaking-change`  
**Milestone:** Core Refactor

### Description

Entfernen des AnythingLLM Anti-Patterns: Nicht mehr `process.env` zur Laufzeit mutieren und in `.env` schreiben. Alle persistenten Settings gehören in die Datenbank mit Verschlüsselung und Audit-Trail.

### Architecture

- [ ] `system_settings` table schema mit Verschlüsselung (field-level für sensitive keys)
- [ ] SettingsManager abstraction über DB operations
- [ ] `audit_log` table für Setting-Änderungen tracking
- [ ] Graceful fallback zu Env-Variablen während Migration

### Code-Migrationen (High Impact)

- [ ] `server/utils/helpers/updateENV/` komplett refaktorieren
- [ ] `server/models/systemSettings.js` auf DB-Backend migrieren
- [ ] Alle `process.env[key] = value` Mutationen durch DB-Writes ersetzen
- [ ] `dumpENV()` function löschen (durch DB-Commit ersetzt)
- [ ] Alle Endpoints die Settings lesen/schreiben auf SettingsManager updaten

### Zu migrierende Settings

- Vector DB configuration (provider + credentials)
- LLM provider settings (keys, models, URLs)
- Embedding engine settings (provider, chunk size/overlap)
- UI preferences (theme, language defaults)
- Rate limiting & quotas
- Feature flags & experimental settings

### Validierung & Sicherheit

- [ ] Data migration script (ENV → DB, one-time setup)
- [ ] Rollback capability für Setting-Änderungen
- [ ] Permission checks (nur admin darf settings ändern)
- [ ] Full test coverage für SettingsManager
- [ ] Performance: settings cache mit TTL (avoid repeated DB hits)

### Breaking Changes

- Settings sind jetzt persistent across restarts (ENV wird ignoriert falls DB hat Werte)
- Benötigt database migration on first boot
- Setting-Änderungen sind jetzt atomic (kein partial writes möglich)

**Blocked by:** Phases 1–3 completion  
**Blocks:** Phase 5  
**Expected effort:** 8–12 Stunden

---

## Issue 3: Phase 5 — Design System v0-Style (Tailwind 4 + Token Consolidation)

**Labels:** `design`, `frontend`, `refactor`  
**Milestone:** Design System

### Description

Eliminate 80 unique Hex-Farben und 57 Inline-Style-Dateien. Migrate zu Tailwind v4 mit 5-Farben semantischem Token-System (v0 Best-Practices).

### Tailwind 4 Migration

- [ ] Upgrade tailwind v3 → v4
- [ ] `tailwind.config.js` durch inline `@theme` tokens in `globals.css` ersetzen
- [ ] Tailwind Oxide Engine enablen für 3x schnellere Builds

### Design Token System (v0 Pattern)

Define 5 core colors + semantische tokens:

```css
@theme {
  --color-primary: #065986;      /* brand color — CTAs, highlights */
  --color-secondary: #7c3aed;    /* complementary actions */
  --color-surface: #ffffff;      /* backgrounds */
  --color-muted: #9ca3af;        /* disabled, ghost states */
  --color-error: #ef4444;        /* status indicators */
  
  --radius: 0.5rem;              /* consistent rounding */
}
```

### CSS Refactor

- [ ] Consolidate 1.352 Zeilen `index.css` → < 200 Zeilen (nur tokens)
- [ ] Alle Color-Class-Overrides entfernen (`.bg-royalblue`, `.text-purple`, etc.)
- [ ] 57 Dateien mit Inline-Styles löschen (replace mit Tailwind utilities)
- [ ] Semantische Tailwind component classes für common patterns erstellen

### TypeScript Migration (God Files)

- [ ] Split `system.js` (1.018 Zeilen) → focused modules
- [ ] Split `workspace.js` (849 Zeilen) → focused modules
- [ ] Type safety für component props (full TS coverage)

### Component Library Audit

- [ ] Alle UI-Components katalogisieren (current styling)
- [ ] Duplicate components identifizieren (consolidate)
- [ ] Component-Varianten dokumentieren (default, hover, active, disabled)
- [ ] Storybook stories für 20+ core components

### Accessibility & Semantics

- [ ] 4.5:1 Kontrast-Verhältnis auf allen Token-Kombinationen
- [ ] ARIA labels auf allen interactive elements
- [ ] Screen reader testing (focus order, announcements)
- [ ] Keyboard navigation: Tab, Enter, Escape alle working

### Performance Validation

- [ ] CSS bundle size < 30 KB (gzip)
- [ ] Layout shift (CLS) < 0.1
- [ ] Paint timing: First Paint < 1.5s on 4G
- [ ] Lighthouse audit: alle scores > 90

**Blocked by:** Phases 1–4 completion  
**Expected effort:** 12–16 Stunden

---

## Summary: Full Audit Plan

| Phase | Status | LOC Saved | Deps Removed | Impact |
|-------|--------|-----------|--------------|--------|
| 1 | ✅ Done | 147K | PostHog + 3 endpoints | Telemetry/CommunityHub gone |
| 2 | ✅ Done | 50KB bundle | – | i18n lazy-load + async I/O |
| 3 | ✅ Done | 547 lines | 14 + 8 providers | ~50% lighter bundle |
| 4 | 📋 Todo | ~200 | – | Proper architecture (DB settings) |
| 5 | 📋 Todo | ~1K | – | Best-practice design system |

**Total expected improvement:** 200KB+ bundle reduction, 100+ performance metrics improvements, enterprise-grade architecture.
