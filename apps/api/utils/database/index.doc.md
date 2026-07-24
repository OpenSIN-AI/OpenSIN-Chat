<!-- SPDX-License-Identifier: MIT -->

# Database Utilities

## Purpose

Provide legacy SQLite migration helpers used by older model modules and keep
the historical telemetry setup export as a no-op compatibility path.

## Docs

- `validateTablePragmas` runs model-level migrations in development or when
  explicitly forced.
- `checkForMigrations` validates table/column identifiers before building
  SQLite pragma SQL.
- `setupTelemetry` must remain non-networked. OpenSIN Chat telemetry is
  permanently disabled; this export exists only for older call sites.
