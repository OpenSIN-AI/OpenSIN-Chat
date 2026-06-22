# DatabaseSidebar

**Purpose:** Right-hand sidebar panel for the chat view that lets users browse, search, and filter the local politician database and add politicians to the current workspace as embedded sources.

**Docs:** [DatabaseSidebar/index.tsx](index.tsx)

## What this file does

Renders a resizable `ChatSidebar` panel (`minWidth={420}`) containing a search input, party/state filters, a selectable list of politicians, and bulk/per-politician actions to add them to the workspace.

## Files that touch it

- [`ChatSidebar/index.tsx`](../ChatSidebar/index.tsx): reusable resizable panel wrapper; enforces the 420px minimum width.
- [`usePoliticians.js`](../../../../hooks/usePoliticians.js): hook for fetching and filtering politicians.
- [`Sidebars.tsx`](../Sidebars.tsx): conditionally renders this panel when `activeSidebar === "database"`.
- [`Politician` model](../../../../models/politician.js): `addToWorkspace` API call.
- `frontend/src/locales/de/common.js` and `en/common.js`: `sidebar.database.*` translation keys.

## Data sources

- `/api/politician/search` — filtered politician list.
- `/api/politician/parties` — party dropdown options.
- `/api/politician/states` — state dropdown options.
- `POST /api/politician/:id/add-to-workspace` — add politician as source.

## Props

- `workspace?: { slug?: string }` — current workspace slug. Passed from `Sidebars.tsx`. If absent, the add-to-workspace buttons are disabled.

## Known caveats

- The default party filter is `"AfD"` (set in `usePoliticians.js`), optimized for the primary target audience.
- The `minWidth={420}` prop is the current fix for issue #270; keep it in sync with any layout changes.
