# Sidebars

**Purpose:** Renders the right sidebar: icon bar + active panel side by side.

**Docs:** [Sidebars.jsx](Sidebars.jsx)

## What this file does

Coordinates the right sidebar layout. It renders the active panel (360px wide) when a panel type is selected, and always renders the `RightSidebarIconBar` (44px rail) so users can switch panels or close the current one.

## Files that touch it

- [`ChatContainer/index.jsx`](./index.jsx): imports `Sidebars` and places it inside the workspace chat layout.
- [`RightSidebarIconBar/index.tsx`](./RightSidebarIconBar/index.tsx): the icon rail component always rendered by this file.
- [`ChatSidebar/index.tsx`](./ChatSidebar/index.tsx): provides `activeSidebar` and `toggleSidebar` via context.
- All `*Sidebar` panel components (`SourcesSidebar`, `MemoriesSidebar`, `PreviewSidebar`, `ConsoleSidebar`, `FilesystemSidebar`, `DatabaseSidebar`, `PoliticalSidebar`) are rendered conditionally here.
- [`Sidebars.test.jsx`](Sidebars.test.jsx): unit tests for panel selection and icon bar visibility.

## Important config values

- `PANEL_W = 360`: default width of the active panel content area.
- The panel area is only rendered when `activeSidebar` is non-null.
- The icon bar is always rendered regardless of `activeSidebar`.

## Why certain decisions were made

- The icon bar is always visible to give users one-click access to all panels without an extra collapse/expand toggle.
- The panel is shown to the left of the icon rail, so the rail stays at the right edge of the viewport.

## Usage

```jsx
<Sidebars workspace={workspace} />
```

## Known caveats

- `workspace` is forwarded only to `SourcesSidebar` and `MemoriesSidebar`; other panels do not need it.
- The panel width is currently hard-coded at 360px; the `ChatSidebar` resize wrapper stores a different width key for drag resizing.
