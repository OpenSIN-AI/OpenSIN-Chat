<!-- SPDX-License-Identifier: MIT -->

# Major Version Upgrades — OpenSIN-Chat

> **Status:** ✅ ALLE UPGRADES ABGESCHLOSSEN
> **Ist-Zustand:** 2026-07-19 · Branch: `main` at v1.14.0
> **Ursprünglicher Plan:** 2026-06-22 (dieses Dokument)

---

## Table of Contents

1. [Version Summary](#1-version-summary)
2. [React 18 → 19](#2-react-18--19)
3. [React Router v6 → v8](#3-react-router-v6--v8)
4. [Tailwind CSS v3 → v4](#4-tailwind-css-v3--v4)
5. [Prisma v5 → v7](#5-prisma-v5--v7)
6. [Vite 5 → 8](#6-vite-5--8)
7. [TypeScript 4/5 → 6/7](#7-typescript-45--67)
8. [Upgrade-Reihenfolge & Ergebnisse](#8-upgrade-reihenfolge-ergebnisse)
9. [Verbleibende Follow-ups](#9-verbleibende-follow-ups)

---

## 1. Version Summary

| Dependency | Vorher (Plan 2026-06-22) | Ist (2026-07-19) | Status |
|---|---|---|---|
| `react` | `^18.2.0` | `^19.2.7` | ✅ Done |
| `react-dom` | `^18.2.0` | `^19.2.7` | ✅ Done |
| `@types/react` | `^18.3.31` | `^19.1.0` | ✅ Done |
| `@types/react-dom` | `^18.3.7` | `^19.1.0` | ✅ Done |
| `react-router` / `react-router-dom` | `^6.30.4` | `^8.2.0` (react-router) | ✅ Done |
| `tailwindcss` | `^3.3.1` | `^4.0.0` | ✅ Done |
| `@prisma/client` | `5.3.1` | `7.8.0` | ✅ Done |
| `prisma` (CLI) | `5.3.1` | `7.8.0` | ✅ Done |
| `vite` | `^5.x` | `8.1.4` | ✅ Done |
| `@vitejs/plugin-react` | `^4.x` | `^6.0.3` | ✅ Done |
| `typescript` | `^5.x` | `6.0.2` + `7.0.2` | ✅ Done |
| `eslint` | `^8.x` | `^9.39.2` | ✅ Done |
| `vitest` | `^1.x` | `^4.1.10` | ✅ Done |
| `@playwright/test` | `^1.40` | `^1.61.1` | ✅ Done |

---

## 2. React 18 → 19

### 2.1 Erledigte Änderungen

| Änderung | Status |
|---|---|
| `react` + `react-dom` auf ^19.2.7 | ✅ |
| `@types/react` + `@types/react-dom` auf ^19.1.0 | ✅ |
| `react-toastify` auf ^11.1.0 (vorher ^9) | ✅ |
| `@tremor/react` entfernt, `echarts-for-react` eingeführt | ✅ |
| `@remix-run/router` Resolution entfernt | ✅ |
| `@testing-library/react` ^16.1.0 (React 19 kompatibel) | ✅ |
| `react-error-boundary` ^6.1.2 (React 19 kompatibel) | ✅ |
| `react-i18next` ^17.0.9 (React 19 kompatibel) | ✅ |

### 2.2 Bemerkenswert

- **`forwardRef`** wird noch in ~7 Dateien genutzt — funktioniert, aber `ref`-als-Prop wäre der neue Stil
- **`import React`** in ~371 Dateien — harmless, könnte per Lint automatisiert bereinigt werden
- **Keine Class Components**, kein `defaultProps`, kein `propTypes` — sauber
- **`ReactDOM.createRoot`** in `main.tsx` — bereits korrekte API

---

## 3. React Router v6 → v8

### 3.1 Erledigte Änderungen

| Änderung | Status |
|---|---|
| `react-router` auf ^8.2.0 | ✅ |
| `createBrowserRouter` + `RouterProvider` + `lazy` Routes | ✅ funktioniert in v8 |
| `@remix-run/router` Resolution entfernt | ✅ |

### 3.2 Bemerkenswert

- **121 Dateien** importieren aus `react-router-dom` — funktioniert via Compatibility Shim
- **Framework/Data Mode** nicht aktiviert — nur Declarative Mode (SPA)
- **`useParams`-Typecasts** könnten strenger werden

---

## 4. Tailwind CSS v3 → v4

### 4.1 Erledigte Änderungen

| Änderung | Status |
|---|---|
| `tailwindcss` ^4.0.0 | ✅ |
| `@tailwindcss/postcss` als Plugin | ✅ |
| `@tailwind` Direktiven → `@import "tailwindcss"` | ✅ |
| Custom `light:` Variante via `@custom-variant` | ✅ (239 Dateien) |
| Custom `pwa:` Variante via `@custom-variant` | ✅ |
| `darkMode: "class"` via `@custom-variant` | ✅ |
| `safelist` → `@source inline(...)` | ✅ |
| CSS `@theme` Block für Custom Colors/Fonts/Animations | ✅ |
| `autoprefixer` entfernt (built-in in v4) | ✅ |

### 4.2 Bemerkenswert

- **239 Dateien** nutzen `light:` Custom Variant — funktioniert
- **Theming** vollständig via CSS Custom Properties in `@theme`

---

## 5. Prisma v5 → v7

### 5.1 Erledigte Änderungen

| Änderung | Status |
|---|---|
| `@prisma/client` 7.8.0 | ✅ |
| `prisma` CLI 7.8.0 | ✅ |
| `@prisma/adapter-better-sqlite3` 7.8.0 | ✅ |
| `prisma-client-js` Generator (Legacy) | ✅ beibehalten |

### 5.2 Bemerkenswert

- **Legacy-Generator** `prisma-client-js` wird noch genutzt — funktioniert, aber `prisma-client` wäre zukunftssicherer
- **35+ Models** im Schema, 773 Zeilen
- **SQLite** als Default, PostgreSQL capability vorhanden

---

## 6. Vite 5 → 8

| Änderung | Status |
|---|---|
| `vite` 8.1.4 | ✅ |
| `@vitejs/plugin-react` ^6.0.3 | ✅ |
| `vite-plugin-image-optimizer` ^2.0.0 | ✅ |

---

## 7. TypeScript 4/5 → 6/7

| Änderung | Status |
|---|---|
| `typescript` 6.0.2 (via `@typescript/typescript6`) | ✅ |
| `typescript-7` 7.0.2 (via `typescript` alias) | ✅ |
| `typescript-eslint` ^8.62.1 | ✅ |

### Bemerkenswert

- **Frontend `tsconfig.json`:** `strict: false`, `noImplicitAny: false`, `checkJs: false` — **NICHT STRICT**
- **Server `tsconfig.json`:** `strict: false`, `checkJs: false` — **NICHT STRICT**
- **`tsconfig.check.json`** (Frontend) hat eigene Regeln für Migration

---

## 8. Upgrade-Reihenfolge & Ergebnisse

```
Empfohlen (2026-06-22)          Tatsächlich (2026-07-19)
─────────────────────          ─────────────────────────
1. Prisma v5→v7                ✅ Erledigt (Option A: Legacy-Generator)
2. React 18→19                 ✅ Erledigt (inkl. Tremor-Entfernung, Toastify-Upgrade)
3. React Router v6→v7          ✅ Erledigt (eigentlich v8)
4. Tailwind v3→v4              ✅ Erledigt (inkl. Custom Variants, @theme Migration)
+ Vite 5→8                     ✅ Erledigt (nicht im ursprünglichen Plan)
+ TypeScript 4/5→6/7           ✅ Erledigt (nicht im ursprünglichen Plan)
```

---

## 9. Verbleibende Follow-ups

### P0 — Kritisch (sofort)

| # | Follow-up | Aufwand |
|---|---|---|
| 1 | **TypeScript Strict Mode aktivieren** — Frontend + Server `strict: true`, `noImplicitAny: true` | 1–2 Tage |
| 2 | **Express Security Headers** — `helmet()` für CSP, HSTS, X-Frame-Options | 2–4 Std. |

### P1 — Mittelbaldig

| # | Follow-up | Aufwand |
|---|---|---|
| 3 | `forwardRef` → ref-as-prop Migration (~7 Dateien) | 1–2 Std. |
| 4 | React Compiler Beta evaluieren / aktivieren | 1–2 Std. |
| 5 | React Router 8 Framework/Data Mode evaluieren | 2–4 Std. |
| 6 | Prisma-Generator auf `prisma-client` migrieren (Option B) | 1–2 Tage |
| 7 | CodeQL/SAST in CI hinzufügen | 2–4 Std. |
| 8 | OpenTelemetry für Node-Services evaluieren | 4–8 Std. |
| 9 | OWASP LLM Top 10 Agent/MCP-Security prüfen | 1 Tag |

### P2 — Später

| # | Follow-up | Aufwand |
|---|---|---|
| 10 | `findMany`-Limits (35 Stellen) — siehe FUTURE-PLAN.md | 4 Std. |
| 11 | `workspaceEndpoints()` Split (1520 LOC) | 8 Std. |
| 12 | 114 Zirkuläre Abhängigkeiten | 24 Std. |
| 13 | WCAG 2.2 AA Barrierefreiheits-Audit | 1–2 Tage |
| 14 | Playwright E2E-Tests ausbauen | 1–2 Tage |
| 15 | Docs-Drift bereinigen (CEO-AUDIT-REPORT, DEPENDENCY-HEALTH) | 4–8 Std. |

---

*Dieses Dokument wurde am 2026-07-19 auf den aktuellen Stand gebracht. Der ursprüngliche Plan von 2026-06-22 ist historisch.*
