<!-- SPDX-License-Identifier: MIT -->

# `AdminTerminal` page

Purpose: Admin-only UI for executing server-side terminal commands via `POST /api/terminal/exec`.

Docs: `frontend/src/pages/Admin/Terminal/index.tsx`

## What it does

- Renders a settings-layout page with the standard sidebar.
- Provides a textarea for the command, an input for the working directory, and an execute button.
- Calls `System.execTerminalCommand` and displays stdout, stderr, exit code, and any error.
- Shows a prominent warning that the feature is admin-only and potentially dangerous.

## Security

- The route is wrapped in `<AdminRoute>`.
- The sidebar option is hidden for non-admin users (`roles: ["admin"]`).
- The backend enforces admin role and gates execution behind `ENABLE_TERMINAL_EXEC=true` or `NODE_ENV=development`.

## i18n keys

- `terminal.title`
- `terminal.description`
- `terminal.warning`
- `terminal.commandLabel`
- `terminal.commandPlaceholder`
- `terminal.cwdLabel`
- `terminal.execute`
- `terminal.executing`
- `terminal.output`
- `terminal.exitCode`
- `terminal.noOutput`
- `terminal.missingCommand`
- `terminal.disabled`
