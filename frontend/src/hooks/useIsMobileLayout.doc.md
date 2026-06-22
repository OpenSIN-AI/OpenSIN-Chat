# useIsMobileLayout

**Purpose:** Viewport-based mobile-layout detector for page layouts.

**Docs:** [useIsMobileLayout.ts](useIsMobileLayout.ts)

## What this file does

- Returns `true` when the viewport width is below `768px` and `false` otherwise.
- Listens to the `window` `resize` event so the value updates when the browser is resized or the device rotates.
- Uses only the viewport width; it does **not** use user-agent sniffing.

## Why viewport-only?

Older code combined `react-device-detect`'s `isMobile` with the viewport width. That caused mobile emulators with a desktop user-agent (e.g. Playwright) to report `false` and render the desktop sidebar on a 390px viewport, squeezing the chat area. The viewport-only approach matches the Tailwind `md` breakpoint and works correctly for:

- Desktop browsers resized to a narrow width.
- Mobile emulators with a desktop user-agent.
- Tablets in landscape with enough room for the desktop layout.

## Consumers

- `pages/Main/index.tsx`
- `pages/WorkspaceChat/index.tsx`
- `pages/WorkspaceSettings/index.tsx`
- Any other page layout that must choose between `Sidebar` and `SidebarMobileHeader`.

## Threshold

`768px` is the boundary. It matches Tailwind's `md` breakpoint so the layout decision and the CSS utilities stay in sync.
