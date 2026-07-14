# WorkspaceChat page

## Purpose
Top-level page component for the workspace chat view. Renders the sidebar, left icon bar, chat container, and the CommandPalette. Owns the local ⌘K handler that toggles the CommandPalette.

## Docs
- `WorkspaceChatLayout` is the main layout component; `ShowWorkspaceChat` resolves the workspace from the URL param and renders `WorkspaceChatContainer`.
- ⌘K and ⌘N are handled locally via a `window.keydown` listener in `WorkspaceChatLayout`.
- The `NAVIGATE_HOME_EVENT` listener (for ⌘I) uses `useNavigate()` from React Router for client-side navigation to the current workspace or home.
- The `CommandPalette` receives `commandItems` that include workspace threads, workspaces, docs, and workspace settings (admin-only items filtered by `user?.role`).

## Changelog
- **2026-07-14** — Added `NAVIGATE_HOME_EVENT` listener to handle ⌘I via React Router `navigate()` instead of the admin-only `window.location.href` path. Imported `NAVIGATE_HOME_EVENT` from `@/utils/keyboardShortcuts`.
