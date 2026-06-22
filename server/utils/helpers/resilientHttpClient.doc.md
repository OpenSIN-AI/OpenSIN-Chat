<!-- SPDX-License-Identifier: MIT -->

# `ResilientHttpClient`

Purpose: Shared HTTP client for external API calls with timeout, retry,
rate-limit, circuit-breaker, and stale-while-revalidate caching.

Docs: `server/utils/helpers/resilientHttpClient.js`

## API

```js
const { ResilientHttpClient } = require("../utils/helpers/resilientHttpClient");

const client = new ResilientHttpClient({
  timeoutMs: 30_000,
  maxRetries: 3,
  retryDelayMs: 1_000,
  rateLimitDelayMs: 500,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldownMs: 60_000,
  cacheTtlMs: 6 * 60 * 60 * 1000,
  cacheMaxEntries: 500,
});

const response = await client.fetch(url, { headers: { Accept: "application/json" } });
```

## Behaviour

- **Timeout**: every request uses `fetchWithTimeout` with the configured timeout.
- **Retry**: retries on 5xx / network errors with exponential backoff (up to `maxRetries`).
- **Rate limit**: enforces a minimum delay between consecutive requests.
- **Circuit breaker**: after `threshold` consecutive failures, the breaker opens for `cooldownMs`. Subsequent calls return cached stale data or throw.
- **Cache**: successful responses are cached for `cacheTtlMs`; stale responses are used as fallback when the breaker is open.

## Configuration

All options are optional and have defaults (see `DEFAULT_*` exports).

## Tests

See `server/__tests__/utils/helpers/resilientHttpClient.test.js`.
