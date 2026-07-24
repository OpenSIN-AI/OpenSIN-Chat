# KeyboardShortcutsHelp

## Purpose
Modal overlay that displays all available keyboard shortcuts. Opens via the `keyboard-shortcuts-help` custom event (triggered by ⌘⇧? or F1) and closes on Escape or clicking the backdrop/close button.

## Docs
- Reads `SHORTCUTS` from `@/utils/keyboardShortcuts` to render the list.
- Uses `isMac` to decide whether to display ⌘ or Ctrl in the `<kbd>` labels.
- Traps focus inside the dialog while open and restores the previously-focused element on close.
- Renders nothing when closed (`isOpen === false`).

## Changelog
- **2026-07-14** — Updated to reflect removal of ⌘K from SHORTCUTS and remapped ⌘I label.
