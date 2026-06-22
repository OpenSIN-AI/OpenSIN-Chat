// SPDX-License-Identifier: MIT
/**
 * Cache module — short-TTL, stale-while-revalidate cache for research API calls.
 *
 * Purpose: Reduces redundant external API calls by caching results with a
 * configurable TTL. Stale entries are served immediately while a background
 * revalidation fetch runs.
 */

# Research Cache

## API

| Function | Signature | Description |
|----------|-----------|-------------|
| `getCached` | `(key, ttl?) → value\|null` | Returns fresh value or `null` if stale/missing |
| `getStale` | `(key) → value\|null` | Returns any cached value regardless of age |
| `setCached` | `(key, value) → void` | Stores value with current timestamp |
| `withCache` | `(key, fn, ttl?) → Promise<value>` | SWR: fresh → return; stale → return + background revalidate; missing → await fn |
| `clearCache` | `() → void` | Empties the entire cache (for tests/reset) |
| `deleteCached` | `(key) → void` | Removes a single entry |
| `cacheSize` | `() → number` | Current entry count |

## SWR Flow

```
withCache("search:energie", () => fetchResults("energie"), 60_000)
  │
  ├─ fresh (< TTL)  ──► return cached value
  ├─ stale (> TTL)  ──► return stale value + fire-and-forget fn()
  └─ miss (no cache) ──► await fn(), cache result, return it
```

## Config

- Default TTL: 60 000 ms (60 s), overridable per call via the `ttl` parameter.
- Storage: in-memory `Map` — per-process, not persisted.
