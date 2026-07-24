# DeleteWorkspace

## Purpose

Provides the workspace deletion UI with an accessible in-app confirmation dialog that clearly communicates permanent impact and requires intentional confirmation before proceeding.

## Design notes

- Uses `ConfirmDialog` primitive instead of native `window.confirm` for consistent accessible UX.
- Confirmation dialog is destructive-styled with clear warning about permanent data loss.
- Preserves existing deletion protection (`visible` prop), error handling, and post-deletion navigation.
- Dialog supports Escape key dismiss and focus management for screen readers.
