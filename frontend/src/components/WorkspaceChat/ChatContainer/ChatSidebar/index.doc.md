# ChatSidebar

**Purpose:** React context provider for right sidebar panel state and helpers.

**Docs:** [ChatSidebar/index.tsx](index.tsx)

## What this file does

Provides a React context (`ChatSidebarContext`) that manages which right sidebar panel is active (`activeSidebar`), the data associated with it (`sidebarData`), source filters, preview data, and persistent console logs. It also exports specialized hooks for each panel type (e.g., `useSourcesSidebar`, `useDatabaseSidebar`) and a reusable `ChatSidebar` component that wraps a panel with a left-edge resize handle.

## Files that touch it

- [`Sidebars.tsx`](../Sidebars.tsx): consumes `activeSidebar` to decide which panel to render.
- [`RightSidebarIconBar/index.tsx`](../RightSidebarIconBar/index.tsx): uses `activeSidebar` and `toggleSidebar` to highlight and toggle panels.
- Every `*Sidebar` panel component: uses the specialized hooks exported from this file.
- [`ChatSidebar/index.test.jsx`](index.test.jsx): tests the provider context and specialized hooks.

## Important config values

- `SOURCE_FILTERS`: `all`, `documents`, `media`.
- `DOCUMENT_SOURCE_PREFIXES`: `paperless-ngx://`, `obsidian://`, `confluence://`, `drupalwiki://`, `github://`, `gitlab://`.
- `MEDIA_SOURCE_PREFIXES`: `youtube://`.
- `LOG_EVENT = "openafd:log"`: custom event name for console log entries.
- Default panel width (in `ChatSidebar` component): 366px by default (or `defaultWidth`), clamped to `minWidth`–`maxWidth`, persisted under `openafd-right-sidebar-width`.
- The resize handle is a 12px-wide strip on the left edge with a visible blue grip line so users can find and drag it.

## Why certain decisions were made

- The `rightSidebarOpen` collapse state was removed because the icon bar is now always visible; only the panel open/close state remains.
- `consoleLogs` are stored in the context so they survive panel swaps.
- `openPreview` is a callback that both sets preview data and activates the preview panel.
- The resize handle is attached to the left edge of the panel because the panel sits to the left of the icon rail; dragging left widens it.

## Usage

```tsx
<ChatSidebarProvider>
  <Sidebars workspace={workspace} />
</ChatSidebarProvider>
```

```tsx
const { activeSidebar, toggleSidebar } = useChatSidebar();
```

## Known caveats

- The `any` types on context values and helper functions are a known technical debt; the file predates stricter TypeScript adoption.
- The `localStorage` key `openafd_right_sidebar_open` is no longer used but may exist in users' browsers from previous versions; it is harmless.
- The panel width in `ChatSidebar` is stored separately from the fixed `PANEL_W = 360` used in `Sidebars.jsx`; the two can drift if not reconciled later.
