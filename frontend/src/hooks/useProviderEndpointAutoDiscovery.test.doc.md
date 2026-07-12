# useProviderEndpointAutoDiscovery Tests

## Purpose

Regression tests for endpoint auto-discovery, editable base/auth state, manual auto-detect, and masked-secret request handling.

## Notes

- Masked stored secrets must remain UI-only and must not be sent as provider auth tokens during model probing.
