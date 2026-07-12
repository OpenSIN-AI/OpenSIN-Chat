# useProviderEndpointAutoDiscovery

## Purpose

Provides shared React state for provider endpoint auto-discovery, base URL controls, advanced-section visibility, and optional auth-token inputs.

## Notes

- Masked secret placeholders made only of asterisks are treated as UI placeholders and are not sent to provider model-discovery requests.
- The hook keeps input values controlled so provider settings panels do not emit React controlled/uncontrolled warnings.
