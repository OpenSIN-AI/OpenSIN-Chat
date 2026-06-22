<!-- SPDX-License-Identifier: MIT -->

# PLAN — Resilience & External-API Hardening (Epic E3)

> **Owner:** @Family-Team-Projects
> **Created:** 2026-06-22
> **Parent:** [`PLAN-PRODUCTION-READINESS.md`](./PLAN-PRODUCTION-READINESS.md)
> **Driver:** Politician sync depends on external APIs (Bundestag, Abgeordnetenwatch); hardening prevents cascade failures.

## Problem

- The politician sync job calls `bundestag.de`, `abgeordnetenwatch.de`, and
  `dserver.bundestag.de` without a shared resilience wrapper.
- Each API client had duplicated retry/rate-limit code.
- A failing upstream could block the whole sync, and there was no circuit
  breaker or stale-fallback mechanism.

## Solution

Introduced `server/utils/helpers/resilientHttpClient.js` — a shared HTTP
client used by all external API callers in the politician sync pipeline.

## Implemented

| Mechanic | How it works | Configuration |
|---|---|---|
| **Timeout** | Every request uses `fetchWithTimeout` | `timeoutMs` (default 30 s) |
| **Retry** | Exponential backoff with jitter on 5xx / network errors | `maxRetries`, `retryDelayMs` |
| **Rate limit** | Minimum delay between consecutive requests | `rateLimitDelayMs` |
| **Circuit breaker** | Opens after `threshold` consecutive failures; stays open for `cooldownMs` | `circuitBreakerThreshold`, `circuitBreakerCooldownMs` |
| **Stale fallback** | Uses cached last-successful response when the breaker is open | `cacheTtlMs` |

## Files changed

- `server/utils/helpers/resilientHttpClient.js` — new shared client
- `server/utils/helpers/resilientHttpClient.doc.md` — design docs
- `server/__tests__/utils/helpers/resilientHttpClient.test.js` — 10 unit tests
- `server/utils/politician/bundestagApi.js` — uses `ResilientHttpClient`
- `server/utils/politician/abgeordnetenwatchApi.js` — uses `ResilientHttpClient`
- `server/utils/politician/plenarScraper.js` — uses `ResilientHttpClient`

## Acceptance Criteria

- [x] Shared resilient client exists and is tested
- [x] All politician sync API callers use the shared client
- [x] Existing API tests (66) still pass
- [x] Full server test suite (1 876 tests) still passes
- [ ] Extend resilience wrapper to remaining external callers (web search, RSS, etc.) — future work

## Related Issues

- E3 external API hardening · issue #52
