<!-- SPDX-License-Identifier: MIT -->

# Major Version Upgrade Plan — OpenSIN-Chat

> **Research-only document.** No source files were modified during this analysis.
> Generated: 2026-06-22 · Base commit: `main` at v1.14.0

---

## Table of Contents

1. [Version Summary](#1-version-summary)
2. [React 18 → 19](#2-react-18--19)
3. [React Router v6 → v7](#3-react-router-v6--v7)
4. [Tailwind CSS v3 → v4](#4-tailwind-css-v3--v4)
5. [Prisma v5 → v7](#5-prisma-v5--v7)
6. [Recommended Upgrade Order](#6-recommended-upgrade-order)
7. [Risk Assessment](#7-risk-assessment)
8. [Rollback Strategy](#8-rollback-strategy)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Version Summary

| Dependency | Current Version | Target Version | Package Location |
|---|---|---|---|
| `react` | `^18.2.0` | `^19.0.0` | `frontend/package.json` |
| `react-dom` | `^18.2.0` | `^19.0.0` | `frontend/package.json` |
| `@types/react` | `^18.3.31` | `^19.0.0` | `frontend/package.json` (devDeps) |
| `@types/react-dom` | `^18.3.7` | `^19.0.0` | `frontend/package.json` (devDeps) |
| `react-router-dom` | `^6.30.4` | `^7.0.0` | `frontend/package.json` |
| `@remix-run/router` | `^1.23.2` (resolution) | bundled in RR v7 | `frontend/package.json` (resolutions) |
| `tailwindcss` | `^3.3.1` | `^4.0.0` | `frontend/package.json` (devDeps) |
| `@prisma/client` | `5.3.1` | `^7.0.0` | `server/package.json` |
| `prisma` (CLI) | `5.3.1` | `^7.0.0` | `server/package.json` |

---

## 2. React 18 → 19

### 2.1 Current Usage Analysis

| Pattern | Count | Files | Risk |
|---|---|---|---|
| `import ... from "react"` | 371 files | entire `frontend/src/` | Low — automatic with new JSX transform |
| `useState` / `useEffect` | 323 files | entire `frontend/src/` | None — unchanged API |
| `useRef` / `useMemo` / `useCallback` | 100+ files | hooks, pages, components | None — unchanged API |
| `useContext` / `createContext` | 66 matches | 20+ context files | None — unchanged API |
| `forwardRef` | 14 matches | 7 files | Low — still supported, but `ref`-as-prop is the new idiom |
| `React.lazy` / `Suspense` | 57 matches | 10+ files | None — unchanged API |
| `react-error-boundary` | 6 files | `App.tsx`, `WorkspaceChat/`, `Sidebars.tsx` | Medium — check peer dep |
| `ReactDOM.createRoot` | 1 (`main.tsx:484`) | `main.tsx` | None — already on v18 API |
| `React.Fragment` / `React.StrictMode` | 15 matches | `main.tsx`, `Sidebar/`, settings pages | None |
| `React.createElement` | 7 files | Admin/Agents panels, test files | None — still works |
| Class components (`extends Component`) | **0** | — | None — already fully functional |
| `defaultProps` on functions | **0** (only test variable names) | — | None |
| `propTypes` | **0** | — | None |
| `act()` from `@testing-library/react` | 65 calls | 15+ test files | None — already correct import path |

#### Key Dependent Libraries (peer dependency risk)

| Library | Current Version | React 19 Compat? | Action Needed |
|---|---|---|---|
| `react-toastify` | `^9.1.3` | Uncertain — v9 targets React 18 | Upgrade to `react-toastify@^10+` or replace |
| `react-tooltip` | `^5.30.1` | Likely OK (v5 uses floating-ui, no React peer hard-dep) | Test in isolation |
| `react-dropzone` | `^14.2.3` | Likely OK | Test in isolation |
| `react-virtuoso` | `^4.18.7` | Likely OK (v4 supports React 18/19) | Test in isolation |
| `react-markdown` | `^10.1.0` | OK (v10 is React 19 compatible) | None |
| `react-speech-recognition` | `^3.10.0` | Uncertain — wraps Web Speech API, uses React 16+ | Test thoroughly |
| `react-error-boundary` | `^6.1.2` | OK (v6 supports React 19) | None |
| `react-i18next` | `^14.1.1` | OK (v14 supports React 19) | None |
| `@tremor/react` | `^3.18.7` | **Blocker** — Tremor v3 targets React 18 + Tailwind v3 | Replace with `@tremor/react@^4+` or remove |
| `recharts` | `^2.12.5` | OK — recharts v2 supports React 18/19 | None |
| `swr` | `^2.4.1` | OK — SWR v2 is React-version agnostic | None |
| `@hello-pangea/dnd` | `^18.0.1` | Likely OK | Test in isolation |
| `@dnd-kit/core` | `^6.3.1` | OK | None |
| `react-confetti-explosion` | `^2.1.2` | Likely OK | Test |
| `react-highlight-words` | `^0.21.0` | Uncertain — unmaintained-ish | Test or replace |
| `react-loading-skeleton` | `^3.5.0` | Likely OK | Test |
| `react-tag-input-component` | `^2.0.2` | Uncertain | Test |
| `react-device-detect` | `^2.2.2` | OK — no React peer dep | None |
| `qrcode.react` | `^4.2.0` | OK | None |
| `@phosphor-icons/react` | `^2.1.10` | OK | None |
| `@testing-library/react` | `^16.3.2` / `^16.1.0` | OK — v16 supports React 19 | None |

### 2.2 React 19 Breaking Changes

| Breaking Change | Impact on OpenSIN-Chat | Severity |
|---|---|---|
| **`ReactDOM.render` removed** | **None** — already using `createRoot` in `main.tsx:484` | ✅ No action |
| **`react-dom/test-utils` removed** | **None** — all `act()` imports come from `@testing-library/react` | ✅ No action |
| **`defaultProps` removed for function components** | **None** — zero function components use `defaultProps` | ✅ No action |
| **`propTypes` removed** | **None** — zero components use `propTypes` | ✅ No action |
| **`ref` as a prop (no `forwardRef` needed)** | 7 files use `forwardRef` — still works, but can be simplified | Low — optional cleanup |
| **New JSX transform (no `import React`)** | 371 files import `React` — these imports become unused but harmless | Low — lint cleanup only |
| **`React.createElement` still works** | 7 files use it — no change needed | ✅ No action |
| **Strict Mode behavior changes** (double-invoke effects in dev) | `main.tsx:30` uses `React.StrictMode` in production only | Low — verify no double-execution bugs |
| **`useTransition` / `useDeferredValue`** (existing v18 hooks) | Not currently used — no impact | ✅ No action |
| **New hooks: `use`, `useActionState`, `useOptimistic`, `useFormStatus`** | Additive — no breaking impact | ✅ No action |
| **Server Components support** | Additive — this is a Vite SPA, no SSR server components | ✅ No action |
| **`ref` callback cleanup function** | Not used — no impact | ✅ No action |
| **`useRef` requires argument** | All existing `useRef` calls already pass an initial argument | ✅ No action |

### 2.3 Required Code Changes — React 19

| File(s) | Change | Effort |
|---|---|---|
| `frontend/package.json` | Bump `react`, `react-dom` to `^19`, `@types/react`, `@types/react-dom` to `^19` | 5 min |
| `frontend/package.json` | Upgrade `react-toastify` to `^10+` or replace with `sonner` | 2–4 hrs |
| `frontend/package.json` | Resolve `@tremor/react` v3 → v4+ (or remove Tremor dependency) | 4–8 hrs |
| `frontend/package.json` | Remove `@remix-run/router` resolution (if doing RR upgrade simultaneously) | 5 min |
| All 371 files with `import React` | Optional: remove unused `React` default imports (lint-driven) | 2–4 hrs (automated) |
| 7 files with `forwardRef` | Optional: simplify to `ref`-as-prop pattern | 1–2 hrs (optional) |
| `@vitejs/plugin-react` | Verify v6 compatibility with React 19 (likely already OK) | 30 min |
| `eslint-plugin-react` / `eslint-plugin-react-hooks` | Verify v7.x compatibility with React 19 | 30 min |

### 2.4 Estimated Effort — React 19

| Phase | Effort |
|---|---|
| Dependency bumps + resolution | 1 hr |
| `react-toastify` migration (if needed) | 2–4 hrs |
| `@tremor/react` migration (if needed) | 4–8 hrs |
| Lint cleanup (unused React imports) | 2–4 hrs (automated) |
| Test suite verification | 2–4 hrs |
| Manual QA (chat, settings, onboarding, embed) | 4–8 hrs |
| **Total** | **~2–3 days** |

---

## 3. React Router v6 → v7

### 3.1 Current Usage Analysis

| Pattern | Count | Files | Risk |
|---|---|---|---|
| `import ... from "react-router-dom"` | 121 files | entire `frontend/src/` | Central to navigation |
| `createBrowserRouter` + `RouterProvider` | 1 (`main.tsx`) | `main.tsx` | Already using v6 data router API |
| `lazy` route definitions | 30+ routes | `main.tsx` | Heavy use of code-splitting |
| `useNavigate` | 20+ files | pages, components, hooks | None — same API in v7 |
| `useParams` | 25+ files | pages, components | None — same API in v7 |
| `useLocation` | 8+ files | `App.tsx`, `Sidebar/`, `SettingsSidebar/` | None — same API in v7 |
| `useSearchParams` | 5 files | settings, prompt input | None — same API in v7 |
| `useMatch` | 3 files | `ActiveWorkspaces/`, `SettingsButton/` | None — same API in v7 |
| `Link` | 15+ files | docs, settings, sidebar | None — same API in v7 |
| `NavLink` | 1 file | `DefaultChat/` | None — same API in v7 |
| `Outlet` | 1 file | `App.tsx` | None — same API in v7 |
| `Navigate` | 3 files | `main.tsx`, `WorkspaceChat/` | None — same API in v7 |
| `MemoryRouter` (tests) | 8+ test files | various test files | None — same API in v7 |
| Loader/action patterns | **0** | — | N/A — no migration needed |
| `useLoaderData` / `useFetcher` / `useActionData` | **0** | — | N/A — not used |
| `@remix-run/router` resolution | 1 | `frontend/package.json` | Remove — bundled in v7 |

### 3.2 React Router v7 Breaking Changes

| Breaking Change | Impact on OpenSIN-Chat | Severity |
|---|---|---|
| **Package rename: `react-router-dom` → `react-router`** | 121 files import from `react-router-dom` — v7 re-exports from `react-router`, so `react-router-dom` still works as a compatibility shim | Low — imports still resolve |
| **Framework mode (Vite plugin)** | **Optional** — the "library mode" (createBrowserRouter + RouterProvider) is still fully supported | ✅ No action required |
| **`createBrowserRouter` API** | Unchanged signature — same `routes` + `opts` shape | ✅ No action |
| **`lazy` route property** | Still supported — same async import pattern | ✅ No action |
| **Type safety improvements** | Stricter types for `useParams<T>()` — current code uses `as { slug?: string }` casts | Low — types may need tightening |
| **Middleware support** | Additive — no existing middleware to migrate | ✅ No action |
| **`future` flags from v6** | v6 future flags (`v7_startTransition`, `v7_relativeSplatPath`, `v7_fetcherPersist`, `v7_normalizeFormMethod`, `v7_partialHydration`, `v7_skipActionErrorRevalidation`) are now defaults | Low — verify no behavioral changes |
| **`@remix-run/router` internal package** | Resolution in `package.json` becomes unnecessary | Low — remove resolution |
| **`unstable_*` APIs stabilized** | Not used in this codebase | ✅ No action |
| **Minimum React version: 18** | Already on React 18 (upgrading to 19 simultaneously is fine) | ✅ No action |

### 3.3 Required Code Changes — React Router v7

| File(s) | Change | Effort |
|---|---|---|
| `frontend/package.json` | Bump `react-router-dom` to `^7.0.0`, remove `@remix-run/router` resolution | 5 min |
| `frontend/package.json` | Remove `"react-router": "^6.30.4"` from resolutions | 5 min |
| `frontend/src/main.tsx` | No structural change — `createBrowserRouter` + `RouterProvider` + `lazy` all work in v7 | 0 min |
| 121 files importing `react-router-dom` | Optionally change to `react-router` import (compatibility shim keeps old imports working) | 2–4 hrs (optional) |
| Test files mocking `react-router-dom` | Verify mocks still work with v7's re-export structure | 1–2 hrs |
| `useParams` type casts | Optionally tighten types (e.g. `useParams<{ slug: string; tab?: string }>()`) | 1–2 hrs (optional) |

### 3.4 Estimated Effort — React Router v7

| Phase | Effort |
|---|---|
| Dependency bump + resolution cleanup | 30 min |
| Verify all 121 import sites compile | 1 hr |
| Test suite verification (MemoryRouter mocks) | 2–3 hrs |
| Manual QA (all routes, navigation, lazy loading) | 3–4 hrs |
| Optional: migrate imports to `react-router` | 2–4 hrs |
| **Total** | **~1–1.5 days** |

---

## 4. Tailwind CSS v3 → v4

### 4.1 Current Usage Analysis

| Pattern | Count | Location | Risk |
|---|---|---|---|
| `tailwind.config.js` (JS config) | 1 file, 293 lines | `frontend/tailwind.config.js` | **High** — v4 moves to CSS-first config |
| `postcss.config.js` | 1 file | `frontend/postcss.config.js` | **High** — plugin package changes |
| `@tailwind base/components/utilities` | 3 directives | `frontend/src/index.css:1-3` | **High** — replaced with `@import "tailwindcss"` |
| `@layer components` | 1 usage | `frontend/src/index.css:647` | Medium — still works but syntax changes |
| `@apply` | 10+ usages | `frontend/src/index.css` | Medium — still works in v4 |
| Custom theme colors (CSS variables) | 80+ `--theme-*` variables | `frontend/src/index.css:9-120+` | **High** — must move to `@theme` directive |
| `darkMode: "class"` | 1 config entry | `tailwind.config.js:4` | Medium — v4 changes dark mode default |
| Custom `light:` variant | 239 files use `light:` | across `frontend/src/` | **High** — custom plugin must be ported to CSS |
| Custom `pwa:` variant | 2 files use `pwa:` | across `frontend/src/` | Medium — custom plugin must be ported |
| `safelist` (regex patterns) | 6 patterns | `tailwind.config.js:258-286` | **High** — v4 safelist works differently |
| Custom `backgroundImage` gradients | 10 gradients | `tailwind.config.js:156-175` | Medium — must be in `@theme` |
| Custom `fontFamily` | 1 entry | `tailwind.config.js:177-195` | Low — moves to `@theme` |
| Custom `animation` / `keyframes` | 5 animations | `tailwind.config.js:196-248` | Medium — must be in `@theme` |
| Custom `rotate` values | 2 entries | `tailwind.config.js:16-19` | Low |
| Custom `variants.extend` | 2 entries | `tailwind.config.js:251-256` | Medium — variant API changes |
| `@tremor/react` dependency | 2 files | `Chartable/` | **Blocker** — Tremor v3 requires Tailwind v3 |
| `dark:` variant usage | 4 files | various | Low |
| `autoprefixer` in postcss | 1 | `postcss.config.js` | Removed in v4 (built-in) |

### 4.2 Tailwind v4 Breaking Changes

| Breaking Change | Impact on OpenSIN-Chat | Severity |
|---|---|---|
| **New Oxide engine** (Rust-based, Lightning CSS) | Build pipeline changes — faster but different | Medium — new build deps |
| **CSS-first config (`@theme` directive)** | 293-line `tailwind.config.js` must be converted to CSS `@theme` blocks | **High** — major migration |
| **`@tailwind` directives → `@import "tailwindcss"`** | `index.css:1-3` must change | Low — simple replacement |
| **PostCSS plugin: `@tailwindcss/postcss`** | `postcss.config.js` must swap `tailwindcss` → `@tailwindcss/postcss`, remove `autoprefixer` | Medium |
| **No default border color** (`currentColor` instead of `gray-200`) | Any `border` utility without explicit color may render differently | Medium — audit needed |
| **Rings are 1px by default** (was 3px blue) | Any `ring` utility without explicit size/color may change | Medium — audit needed |
| **Removed deprecated utilities** (`text-opacity-*`, `flex-grow-*`, `decoration-slice`) | Need to audit for usage — likely minimal | Low |
| **`darkMode: "class"` → CSS `@custom-variant`** | Config entry becomes `@custom-variant dark (&:where(.dark, .dark *))` | Medium |
| **Custom variants (`light:`, `pwa:`)** | JS plugin `addVariant` must become `@custom-variant` in CSS | **High** — 239 files affected |
| **`safelist`** | v4 uses `@source inline(...)` in CSS instead of JS config | Medium — 6 regex patterns to port |
| **`@tremor/react` v3 incompatibility** | Tremor v3 generates Tailwind v3 classes — **will break** | **Blocker** |
| **`content` config → automatic detection** | v4 auto-detects content paths; explicit config no longer needed | Low — can remove |
| **`@apply` with custom classes** | Still works but requires `@reference` when used in separate files | Low |
| **`@layer` directive** | Still supported but semantics slightly different | Low |

### 4.3 Required Code Changes — Tailwind v4

| File(s) | Change | Effort |
|---|---|---|
| `frontend/package.json` | Bump `tailwindcss` to `^4.0.0`, add `@tailwindcss/postcss`, remove `autoprefixer` | 10 min |
| `frontend/postcss.config.js` | Replace `tailwindcss` + `autoprefixer` with `@tailwindcss/postcss`; remove `tailwindConfig` import | 15 min |
| `frontend/src/index.css:1-3` | Replace `@tailwind base/components/utilities` with `@import "tailwindcss"` | 5 min |
| `frontend/src/index.css` (80+ `--theme-*` variables) | Move CSS variables into `@theme { ... }` block; map to Tailwind's naming convention | 4–8 hrs |
| `frontend/tailwind.config.js` → CSS `@theme` | Convert all custom colors, fonts, animations, keyframes, gradients, rotate values to `@theme` directives | 4–8 hrs |
| Custom `light:` variant | Port JS `addVariant('light', '.light &')` to `@custom-variant light (&:where(.light, .light *))` | 30 min |
| Custom `pwa:` variant | Port JS `addVariant('pwa', '.pwa &')` to `@custom-variant pwa (&:where(.pwa, .pwa *))` | 15 min |
| `darkMode: "class"` | Add `@custom-variant dark (&:where(.dark, .dark *))` to CSS | 15 min |
| `safelist` (6 regex patterns) | Convert to `@source inline(...)` CSS directives | 1–2 hrs |
| `@tremor/react` (2 files) | Upgrade to Tremor v4+ or remove dependency and use raw Recharts | 4–8 hrs |
| Audit `border` utilities without color | Search for bare `border` class usage, add explicit `border-{color}` | 2–4 hrs |
| Audit `ring` utilities without size/color | Search for bare `ring` class usage, add explicit `ring-{size}` / `ring-{color}` | 1–2 hrs |
| `@layer components` block | Verify `@apply` directives still work with v4's `@reference` requirement | 1 hr |
| `frontend/vite.config.js` | Vite v4 can use `@tailwindcss/vite` plugin instead of PostCSS (optional, faster) | 30 min (optional) |

### 4.4 Estimated Effort — Tailwind v4

| Phase | Effort |
|---|---|
| Dependency + PostCSS config | 30 min |
| `@import` + `@theme` migration | 4–8 hrs |
| Custom variants (`light:`, `pwa:`, `dark:`) | 1 hr |
| Safelist → `@source inline(...)` | 1–2 hrs |
| `@tremor/react` migration/removal | 4–8 hrs |
| Border/ring audit | 3–6 hrs |
| Build verification + visual QA | 4–8 hrs |
| **Total** | **~3–5 days** |

---

## 5. Prisma v5 → v7

### 5.1 Current Usage Analysis

| Pattern | Count | Location | Risk |
|---|---|---|---|
| `require("@prisma/client")` | 9 files | `server/utils/prisma/`, `server/jobs/`, `server/__tests__/` | Medium — import path may change |
| `new PrismaClient(config)` | 3 files | `server/utils/prisma/index.js`, `server/jobs/sync-politician-data.js`, `server/jobs/backfill-*.js` | Medium — config API changes |
| `prisma.{model}.*` calls | 100+ across 42+ files | `server/models/`, `server/endpoints/`, `server/utils/` | Low — query API is largely stable |
| `$transaction` (array form) | 10 usages | 18 files total | Low — both forms still supported |
| `$transaction` (interactive form) | 8 usages | `server/models/` | Low — still supported |
| `$queryRaw` / `$queryRawUnsafe` | 2 usages | `server/app.js:280`, `server/utils/prisma/index.js:49-50` | Low — still supported |
| `Prisma.PrismaClientKnownRequestError` | 4 usages | `server/models/user.js`, `modelRouter.js`, `modelRouterRule.js` | Medium — import path may change |
| `include:` / `select:` (nested reads) | 73 usages across 29 files | `server/models/`, `server/endpoints/`, `server/utils/` | Low — same API |
| `$extends` (client extensions) | **0** | — | N/A — not used |
| Cursor-based pagination | **0** | — | N/A — not used |
| `Unsupported("vector(1536)")` | 1 | `schema.prisma:696` (memories model) | Medium — type system changes |
| `generator client { provider = "prisma-client-js" }` | 1 | `schema.prisma:1-3` | **High** — new `prisma-client` generator |
| Prisma type imports (JSDoc) | 2 | `server/models/workspace.js:595,611` | Medium — type path changes |
| Schema models | 35+ | `server/prisma/schema.prisma` (773 lines) | Low — schema syntax is stable |
| SQLite datasource | 1 | `schema.prisma:9-12` | Low — still supported |
| PostgreSQL (commented) | 1 | `schema.prisma:14-18` | Low — still supported |
| `@map` / `@updatedAt` / `@default(now())` | many | throughout schema | Low — still supported |

### 5.2 Prisma v7 Breaking Changes

| Breaking Change | Impact on OpenSIN-Chat | Severity |
|---|---|---|
| **New `prisma-client` generator** (replaces `prisma-client-js`) | `schema.prisma:1-3` uses `prisma-client-js` — still works as legacy, but new generator is recommended | Medium — optional migration |
| **Generator `output` path required** (for new generator) | If migrating to `prisma-client`, must specify `output = "../generated/prisma"` | Low — one config change |
| **`binaryTargets` removed** (new generator uses JS drivers) | Not currently used in schema | ✅ No action |
| **Driver adapters required for some databases** | SQLite uses built-in driver — no adapter needed; PostgreSQL would need `@prisma/adapter-pg` | Low (SQLite) / Medium (PostgreSQL) |
| **`PrismaClient` import path changes** (with new generator) | `require("@prisma/client")` → `require("./generated/prisma")` if using new generator | Medium — 9 files to update |
| **`Prisma.PrismaClientKnownRequestError` import** | Still exported from `@prisma/client` with legacy generator; path changes with new generator | Medium — 4 files |
| **Type system changes** | `Prisma.TypeMap` JSDoc references in `workspace.js` may break | Medium — 2 files |
| **`Unsupported("vector(1536)")`** | Still supported — `Unsupported` type for native types is unchanged | ✅ No action |
| **`$transaction` API** | Both array and interactive forms unchanged | ✅ No action |
| **`$queryRaw` / `$queryRawUnsafe`** | Unchanged | ✅ No action |
| **`$extends`** | Unchanged (not used anyway) | ✅ No action |
| **Query API (`findMany`, `create`, `update`, `upsert`, etc.)** | Largely unchanged — same `where`, `include`, `select`, `data` shapes | ✅ No action |
| **Migration engine** | `prisma migrate dev` still works; engine improvements are internal | Low — verify migrations still apply |
| **`prisma db seed`** | `server/package.json:22` has `"prisma": { "seed": "node prisma/seed.js" }` — unchanged | ✅ No action |
| **`log` config option** | `server/utils/prisma/index.js:11-13` uses `log: ["error", "info", "warn"]` — still supported | ✅ No action |
| **`datasources` config** | `server/utils/prisma/index.js:35-43` sets `datasources.db.url` at runtime — still supported | ✅ No action |
| **Node.js minimum version** | v7 requires Node 18+ — project already requires `>=22.0.0` | ✅ No action |

### 5.3 Required Code Changes — Prisma v7

#### Option A: Stay on legacy generator (minimal change)

| File(s) | Change | Effort |
|---|---|---|
| `server/package.json` | Bump `@prisma/client` and `prisma` to `^7.0.0` | 5 min |
| `server/prisma/schema.prisma` | Keep `prisma-client-js` generator (still supported as legacy) | 0 min |
| `server/utils/prisma/index.js` | Verify `new PrismaClient(config)` still works with v7 | 30 min |
| `server/models/user.js`, `modelRouter.js`, `modelRouterRule.js` | Verify `Prisma.PrismaClientKnownRequestError` still exported | 30 min |
| `server/models/workspace.js:595,611` | Verify JSDoc `Prisma.TypeMap` types still valid | 1 hr |
| `server/app.js:280` | Verify `$queryRaw` still works | 15 min |
| Run `npx prisma generate` + `npx prisma migrate dev` | Regenerate client + verify migrations | 30 min |
| Full test suite | Run `yarn test:server` | 1–2 hrs |

**Option A Total: ~4–6 hrs**

#### Option B: Migrate to new `prisma-client` generator (recommended for future-proofing)

| File(s) | Change | Effort |
|---|---|---|
| All Option A changes | — | 4–6 hrs |
| `server/prisma/schema.prisma:1-3` | Change `provider = "prisma-client-js"` to `provider = "prisma-client"`, add `output = "../generated/prisma"` | 10 min |
| 9 files requiring `@prisma/client` | Change `require("@prisma/client")` to `require("../generated/prisma")` (adjust relative paths) | 1–2 hrs |
| 4 files using `Prisma.PrismaClientKnownRequestError` | Update import path | 30 min |
| `server/models/workspace.js:595,611` | Update JSDoc type paths | 30 min |
| `server/prisma/seed.js` | Update import path | 15 min |
| `.gitignore` | Add `server/generated/` if not already ignored | 5 min |
| `server/package.json` scripts | Verify `prisma:generate` still works with new output path | 15 min |

**Option B Total: ~1–1.5 days**

### 5.4 Estimated Effort — Prisma v7

| Phase | Option A (Legacy) | Option B (New Generator) |
|---|---|---|
| Dependency bump | 30 min | 30 min |
| Schema + generator migration | 0 | 30 min |
| Import path updates | 0 | 1–2 hrs |
| Type/JSDoc verification | 1 hr | 1.5 hrs |
| Client regeneration + migrations | 30 min | 30 min |
| Test suite | 1–2 hrs | 2–3 hrs |
| Manual QA (DB operations) | 2–3 hrs | 2–3 hrs |
| **Total** | **~4–6 hrs** | **~1–1.5 days** |

---

## 6. Recommended Upgrade Order

The four upgrades have interdependencies that dictate a specific sequence:

```
                    ┌──────────────────────────────────────┐
                    │         DEPENDENCY GRAPH             │
                    │                                      │
                    │  @tremor/react ──► Tailwind v3       │
                    │  @tremor/react ──► React 18          │
                    │  react-router-dom ──► React 18/19    │
                    │  Prisma (independent of frontend)    │
                    │                                      │
                    └──────────────────────────────────────┘
```

### Phase 1: Prisma v5 → v7 (Server, independent)

**Rationale:** Prisma is a server-side dependency with zero coupling to the frontend. It can be upgraded in complete isolation, tested independently, and deployed without touching the frontend.

- **Risk:** Lowest
- **Effort:** 4–6 hrs (Option A) or 1–1.5 days (Option B)
- **Blocker:** None
- **Testing:** `yarn test:server` + manual DB operations

### Phase 2: React 18 → 19 (Frontend, unblocks Router v7)

**Rationale:** React Router v7 requires React 18+ and works best with React 19. Upgrading React first unblocks the Router upgrade. The main blocker is `@tremor/react` v3 which depends on React 18 + Tailwind v3 — resolve this before or during this phase.

- **Risk:** Medium (library peer deps)
- **Effort:** 2–3 days
- **Blocker:** `@tremor/react` v3, `react-toastify` v9
- **Testing:** `yarn test` (frontend) + manual QA

### Phase 3: React Router v6 → v7 (Frontend, depends on React 19)

**Rationale:** Best done after React 19 is stable. The API is largely compatible (createBrowserRouter + RouterProvider + lazy routes all work in v7). This is the lowest-effort upgrade.

- **Risk:** Low
- **Effort:** 1–1.5 days
- **Blocker:** React 19 (Phase 2)
- **Testing:** `yarn test` (frontend) + all route navigation QA

### Phase 4: Tailwind v3 → v4 (Frontend, do LAST)

**Rationale:** Tailwind v4 is the highest-effort, highest-risk upgrade. It requires converting 293 lines of JS config to CSS, porting custom variants used in 239 files, and resolving `@tremor/react` v3 (which is incompatible with Tailwind v4). Doing this last means the other upgrades are already stable, reducing the debugging surface.

- **Risk:** Highest
- **Effort:** 3–5 days
- **Blocker:** `@tremor/react` v3 (must be resolved in Phase 2)
- **Testing:** Full visual QA of every page + component

### Summary

| Order | Upgrade | Effort | Risk | Depends On |
|---|---|---|---|---|
| 1st | Prisma v5 → v7 | 4–6 hrs | Low | None |
| 2nd | React 18 → 19 | 2–3 days | Medium | None (resolve Tremor + toastify) |
| 3rd | React Router v6 → v7 | 1–1.5 days | Low | React 19 |
| 4th | Tailwind v3 → v4 | 3–5 days | High | @tremor/react resolved |
| | **Total** | **~7–10 days** | | |

---

## 7. Risk Assessment

### 7.1 Risk Matrix

| Upgrade | Likelihood of Issues | Impact if Issues | Risk Level | Key Risk |
|---|---|---|---|---|
| **Prisma v7** | Low | High (data layer) | 🟡 Medium | Type path changes, migration engine |
| **React 19** | Medium | Medium (UI) | 🟡 Medium | `@tremor/react` + `react-toastify` peer deps |
| **React Router v7** | Low | Medium (navigation) | 🟢 Low | Test mock compatibility |
| **Tailwind v4** | High | High (entire UI) | 🔴 High | 239 files using `light:` variant, `@tremor/react`, 293-line config migration |

### 7.2 Critical Blockers

| Blocker | Blocks | Resolution |
|---|---|---|
| `@tremor/react` v3 | React 19 + Tailwind v4 | Upgrade to Tremor v4+ (if available) or replace with raw Recharts components |
| `react-toastify` v9 | React 19 | Upgrade to v10+ or replace with `sonner` |
| `light:` custom variant (239 files) | Tailwind v4 | Port to `@custom-variant` CSS directive |
| 293-line `tailwind.config.js` | Tailwind v4 | Convert all entries to `@theme` CSS blocks |

### 7.3 Risk Mitigations

1. **Branch per upgrade** — each upgrade on its own branch, merged independently
2. **`@tremor/react` audit first** — check if Tremor v4 exists and is compatible before starting React 19
3. **Visual regression baseline** — screenshot key pages before Tailwind v4 migration for diff comparison
4. **Incremental Tailwind migration** — v4 supports `@config` directive to load legacy JS config as a transition step
5. **Test suite as safety net** — 323 files with tests covering hooks, components, pages, utils

---

## 8. Rollback Strategy

### 8.1 Per-Upgrade Rollback

| Upgrade | Rollback Method | Time to Roll Back |
|---|---|---|
| **Prisma v7** | `git revert` + `yarn` in `server/` + `npx prisma generate` | < 5 min |
| **React 19** | `git revert` + `yarn` in `frontend/` | < 5 min |
| **React Router v7** | `git revert` + `yarn` in `frontend/` | < 5 min |
| **Tailwind v4** | `git revert` + `yarn` in `frontend/` + restore `tailwind.config.js` + `postcss.config.js` | < 10 min |

### 8.2 Database Rollback (Prisma-specific)

- Prisma migrations are forward-only by default
- Before Prisma upgrade: `npx prisma migrate dev --name pre-v7-upgrade` to create a known-good migration point
- If rollback needed: `npx prisma migrate resolve --rolled-back <migration_name>` + restore old client
- SQLite backup: `cp server/storage/openafd.db server/storage/openafd.db.pre-v7`

### 8.3 General Rollback Rules

1. Each upgrade is a separate PR with its own merge commit
2. No squashing — preserve the ability to `git revert` individual upgrades
3. Tag the pre-upgrade state: `git tag pre-major-upgrades`
4. Production deployment uses container images — rollback is `docker pull <previous-tag>`

---

## 9. Testing Strategy

### 9.1 Automated Tests

| Suite | Command | Coverage | When to Run |
|---|---|---|---|
| Frontend unit tests | `yarn test` (vitest) | 323+ files | After each upgrade |
| Frontend hooks tests | `yarn test:hooks` | hooks directory | After React 19 |
| Frontend component tests | `yarn test:components` | components + pages | After React 19 + RR v7 |
| Server tests | `yarn test:server` (jest) | models, utils | After Prisma v7 |
| Lint check | `yarn lint:check` | all source | After each upgrade |
| Bundle check | `yarn check:bundle` | frontend build | After React 19 + RR v7 |
| Brand check | `scripts/check-branding.sh` | branding strings | After each upgrade |

### 9.2 Manual QA Checklist

| Area | What to Test | After Which Upgrade |
|---|---|---|
| **Authentication** | Login, SSO, invite flow, password reset | React 19, RR v7 |
| **Chat** | New chat, thread navigation, streaming response, markdown render, code blocks | React 19, RR v7, Tailwind v4 |
| **Workspaces** | Create, delete, settings, document upload, vector DB | All four |
| **Settings** | All admin settings pages (LLM, embedding, vector DB, security, etc.) | React 19, RR v7, Tailwind v4 |
| **Onboarding** | Full onboarding flow, all steps | React 19, RR v7 |
| **Embed widget** | `/embed/:uuid` preview | React 19, RR v7 |
| **Politician sync** | Admin sync page, data display | Prisma v7 |
| **Scheduled jobs** | Create, run, view run history | Prisma v7 |
| **Theme switching** | Dark/light theme toggle — **critical for Tailwind v4** | Tailwind v4 |
| **Tooltips** | All tooltip-rendered components (30+ files) | React 19 |
| **Drag-and-drop** | Thread reordering, file upload DnD | React 19 |
| **Virtualized lists** | Chat history (react-virtuoso) | React 19 |
| **Charts** | Chartable component (@tremor/react) | React 19, Tailwind v4 |
| **Toast notifications** | Success/error toasts | React 19 |
| **Speech recognition** | Browser-native STT | React 19 |
| **Lazy-loaded routes** | All 30+ lazy routes load correctly | React 19, RR v7 |
| **404 page** | Catch-all route | RR v7 |
| **Mobile/responsive** | All breakpoints, PWA mode | Tailwind v4 |

### 9.3 Visual Regression Testing (Tailwind v4)

Before starting the Tailwind v4 migration:

1. Screenshot every major page in both dark and light themes
2. Screenshot key components (chat message, sidebar, settings panel, modal, tooltip)
3. After migration, compare screenshots pixel-by-pixel
4. Focus on: `border` utilities (color change), `ring` utilities (size change), `light:` variant (custom plugin)

---

## Appendix A: File Inventory

### Files Requiring Changes Per Upgrade

| Upgrade | Files to Modify | New Files |
|---|---|---|
| **Prisma v7** (Option A) | 2 (`server/package.json`, verify `schema.prisma`) | 0 |
| **Prisma v7** (Option B) | 12 (package.json, schema, 9 import files, seed, gitignore) | 0 |
| **React 19** | 2 (package.json, main.tsx optional) + 2 library upgrades | 0 |
| **React Router v7** | 1 (package.json) + optional 121 import rewrites | 0 |
| **Tailwind v4** | 4 (package.json, postcss.config.js, index.css, tailwind.config.js → CSS) | 0 |

### Key Files Analyzed

| File | Lines | Relevant Upgrades |
|---|---|---|
| `frontend/package.json` | 157 | React 19, RR v7, Tailwind v4 |
| `frontend/tailwind.config.js` | 293 | Tailwind v4 |
| `frontend/postcss.config.js` | 8 | Tailwind v4 |
| `frontend/src/index.css` | 1224 | Tailwind v4 |
| `frontend/src/main.tsx` | 488 | React 19, RR v7 |
| `frontend/vite.config.js` | 162 | Tailwind v4 (optional Vite plugin) |
| `server/package.json` | 164 | Prisma v7 |
| `server/prisma/schema.prisma` | 773 | Prisma v7 |
| `server/utils/prisma/index.js` | 54 | Prisma v7 |

---

*End of document. This is a research-only analysis — no source files were modified.*
