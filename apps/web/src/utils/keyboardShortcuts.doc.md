# keyboardShortcuts.ts

## Purpose
Central keyboard-shortcut registry and listener for the OpenSIN-Chat SPA. Defines all global shortcuts, registers a window `keydown` listener via `initKeyboardShortcuts()`, and exposes a `KeyboardShortcutWrapper` component that wires shortcuts into the React lifecycle.

## Docs
- Shortcuts are defined in the `SHORTCUTS` object keyed by human-readable strings (e.g. `"⌘ + K"`).
- The `LISTENERS` map is derived at module scope by normalising those keys to lowercase `meta+…`/`ctrl+…` form.
- `initKeyboardShortcuts()` installs a single `window.keydown` handler; it returns a cleanup function.
- `KeyboardShortcutWrapper` calls `initKeyboardShortcuts` inside a `useEffect`, gated on user role (admin or single-user only).
- Navigation shortcuts use `history.pushState` + a synthetic `popstate` event so React Router picks up the change without a full-page reload.
- ⌘K is **not** in the global registry — it is handled locally by `WorkspaceChat` to toggle the CommandPalette.
- ⌘I dispatches a `keyboard-navigate-home` custom event; `WorkspaceChat` listens for it and navigates via React Router to the current workspace (or `/` if none).
- Typing guards: shortcuts are suppressed when the focus is inside an `<input>`, `<textarea>`, `<select>`, or `contentEditable` element, except for help shortcuts (⌘⇧? and F1).

## Changelog
- **2026-07-14** — Removed ⌘K from global shortcuts (conflicted with CommandPalette in WorkspaceChat). Changed ⌘I from navigating to the admin-only `/settings/workspaces` to dispatching `NAVIGATE_HOME_EVENT`. Replaced all `window.location.href` navigation with `history.pushState` + `popstate` for client-side routing.
