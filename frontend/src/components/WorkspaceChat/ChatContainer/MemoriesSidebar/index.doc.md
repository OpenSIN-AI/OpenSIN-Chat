# MemoriesSidebar

**Purpose:** Right-side "Erinnerungen" (Memories) panel for the active workspace.

**Docs:** [MemoriesSidebar/index.tsx](index.tsx)

## What this file does

Renders the collapsible right sidebar panel that hosts three tabs:

- **Memories** — user-created memory snippets, managed via `MemoriesContext`.
- **Chats** — workspace threads, fetched with `useThreads`.
- **URLs** — URL sources that have been added to the workspace (e.g. uploaded links or website scrapes). The list is built from `workspace.documents` filtered by the same URL heuristic used elsewhere (`metadata.url`, `metadata.sourceUrl`, `docpath` containing `link`, or a `filename` starting with `http`).

The panel is wrapped in `ChatSidebar` for open/close animation and `MemoriesProvider` for memory state.

## Files that touch it

- [`ChatSidebar/index.tsx`](../ChatSidebar/index.tsx): provides sidebar open/close context and animation wrapper.
- [`MemoriesSidebar/MemoriesContext.tsx`](MemoriesContext.tsx): provides memory CRUD state and the modal wrapper.
- [`RightSidebarIconBar/index.tsx`](../RightSidebarIconBar/index.tsx): toggles this panel from the right-side icon rail.
- [`Sidebars.tsx`](../Sidebars.tsx): imports and renders the panel alongside the other right-side sidebars.

## Important config values

- Tab state is local to `SidebarHeaderWithTabs` (`"memories" | "chats" | "urls"`).
- URL rows use the `Globe` icon and display the source URL as a clickable link when it starts with `http`.
- Empty state for the URL tab uses `chat_window.no_urls`.

## Why certain decisions were made

- The old "Dateien" tab was renamed to "URLs" and now shows only URL sources, because the separate "Verzeichnis" icon in `RightSidebarIconBar` already opens the full filesystem browser. This avoids duplicating file-browsing functionality.
- `workspace.documents` is reused instead of adding a new API call, because the workspace model already includes documents with embedded URL metadata.

## Usage

```tsx
<MemoriesSidebar workspace={workspace} />
```

## Known caveats

- The URL extraction is heuristic-based. If a link document lacks `metadata.url`/`metadata.sourceUrl` and does not have an HTTP filename, the displayed URL falls back to `docpath` and is rendered as plain text.
