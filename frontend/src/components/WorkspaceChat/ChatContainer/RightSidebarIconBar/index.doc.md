# RightSidebarIconBar

**Purpose:** Always-visible icon rail for the right sidebar panels.

**Docs:** [RightSidebarIconBar/index.tsx](index.tsx)

## What this file does

Renders the 44px-wide vertical icon rail on the right edge of the chat workspace. It contains the panel icons (preview, filesystem, database, political, sources, memories, pdf-analysis). Clicking an icon toggles the corresponding panel via `toggleSidebar` from the `ChatSidebar` context.

## Files that touch it

- [`Sidebars.tsx`](../Sidebars.tsx): imports and renders the icon rail next to the active panel.
- [`ChatSidebar/index.tsx`](../ChatSidebar/index.tsx): provides `activeSidebar` and `toggleSidebar` via React context.
- [`RightSidebarIconBar/index.test.jsx`](index.test.jsx): unit tests for the icon rail.
- [`PdfAnalysisSidebar/index.tsx`](../PdfAnalysisSidebar/index.tsx): panel rendered by the pdf-analysis icon toggle.

## Important config values

- Rail width: `w-[44px]` (Tailwind).
- Icon count: 6 (matches the panel types in `Sidebars.tsx`).
- Tooltips: `react-tooltip` with 300ms delay, placed left.

## Why certain decisions were made

- The collapse/expand toggle was removed because the icon bar is meant to be always visible, giving users one-click access to every panel.
- The rail is rendered as a flex column with `flex-shrink-0` so it stays at the right edge and never wraps.

## Usage

```tsx
<RightSidebarIconBar />
```

## Known caveats

- Mobile layout is handled by the parent `Sidebars.jsx` / `ChatContainer` flex layout; this component does not implement its own responsive behavior.
- The icon labels are translated via `react-i18next` and fall back to German defaults.
