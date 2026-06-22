// SPDX-License-Identifier: MIT
/**
 * fetchWithTimeout — wrapper around global fetch with an AbortSignal timeout.
 *
 * Purpose: Provides a single, reusable fetch wrapper so every external HTTP
 * call in the research pipeline gets a consistent timeout.
 */

# fetchWithTimeout

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `url` | `string` | — | Target URL |
| `options` | `object` | `{}` | Standard fetch options |
| `timeoutMs` | `number` | `15000` | Timeout in milliseconds |

## Behaviour

- If `options.signal` is already set, it is respected as-is (caller-managed abort).
- Otherwise, `AbortSignal.timeout(timeoutMs)` is attached automatically.
- On timeout the fetch rejects with an `AbortError` (browser/Node standard).

## Usage

```js
const { fetchWithTimeout } = require("../helpers/fetchWithTimeout");
const res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, 10_000);
```
