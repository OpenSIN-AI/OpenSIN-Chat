# Sidebar

**Purpose:** Renders the persistent desktop sidebar and the mobile top navigation header, including the theme toggle.

**Docs:** [Sidebar/index.tsx](index.tsx)

## What this file does

- Provides `Sidebar` (desktop) with resizable width, logo, search, workspace list, and footer.
- Provides `SidebarMobileHeader` (mobile) fixed top bar with hamburger, logo, and theme toggle.
- Defines a local `ThemeToggle` component that cycles through light/dark/system using `useThemeContext`.
- The desktop `Sidebar` is hidden below the `md` breakpoint (`768px`) via `hidden md:flex` so it can never squeeze the chat area on mobile, even if a parent page renders it unconditionally.

## Files that touch it

- `pages/Main/index.tsx` / `pages/WorkspaceChat/index.tsx` / `pages/WorkspaceSettings/index.tsx`: use `useIsMobileLayout` to choose between `Sidebar` and `SidebarMobileHeader`.
- `pages/PdfAnalysis/index.tsx`: renders `Sidebar` unconditionally; it relies on the `hidden md:flex` guard for mobile viewports.
- `components/WorkspaceChat/ChatContainer/ChatHeader.tsx`: imports `SidebarMobileHeader` for mobile chat layout.
- `ThemeContext.tsx`: supplies theme state and setter to `ThemeToggle`.
- `Sidebar/index.test.jsx`: unit tests for the desktop sidebar.

## Important config values

- `SIDEBAR_WIDTH_STORAGE_KEY` = "openafd-sidebar-width".
- `SIDEBAR_MIN_WIDTH` = 220, `SIDEBAR_MAX_WIDTH` = 480, `SIDEBAR_DEFAULT_WIDTH` = 292.

## Why certain decisions were made

- The theme toggle is placed in the desktop sidebar header and in the mobile header so it remains visible even when the sidebar is collapsed or on small screens.
- `ThemeToggle` cycles through `light` -> `dark` -> `system` to match the existing appearance preference.

## Usage

```jsx
<Sidebar />
<SidebarMobileHeader />
```

## Known caveats

- The local `ThemeToggle` is not exported; it is reused inside both Sidebar and SidebarMobileHeader.
- Without a `ThemeProvider`, `ThemeToggle` renders nothing to avoid runtime errors.
