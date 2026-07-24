<!-- SPDX-License-Identifier: MIT -->

# Privacy And Data Handling Settings

## Purpose

Show data-handling controls and the immutable zero-telemetry status for
OpenSIN Chat administrators.

## Docs

- Provider-specific privacy information is rendered by `ProviderPrivacy`.
- OpenSIN telemetry is not user-configurable because the server telemetry API is
  a no-op compatibility layer. The UI must present this as a fixed status, not
  as a toggle.
- Do not reintroduce telemetry opt-in/out copy here unless the backend policy
  changes and receives an explicit product decision.
