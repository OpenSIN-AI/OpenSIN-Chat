// SPDX-License-Identifier: MIT
/**
 * Circuit breaker module — protects external API calls from cascading failures.
 *
 * Purpose: After N consecutive failures, opens the circuit to short-circuit
 * subsequent calls. After a cooldown, allows a trial (half-open) call.
 */

# Circuit Breaker

## API

### `createCircuitBreaker(name, opts?)`

Returns `{ call, getState, reset, forceOpen }`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `failureThreshold` | `number` | `5` | Consecutive failures before opening |
| `cooldownMs` | `number` | `30000` | Time before half-open trial |

### State machine

```
CLOSED ── failures ≥ threshold ──► OPEN
OPEN   ── cooldown elapsed ──► HALF-OPEN
HALF-OPEN ── success ──► CLOSED
HALF-OPEN ── failure ──► OPEN
```

### `call(fn)`

- **Closed**: invokes `fn()`, tracks success/failure.
- **Open**: throws immediately if cooldown hasn't elapsed.
- **Half-open**: invokes `fn()` once; success closes, failure re-opens.

### `getState()`

Returns `{ name, state, failureCount, failureThreshold, cooldownMs, lastFailureTime }`.

### `reset()` / `forceOpen()`

Test/utility helpers to manipulate state directly.
