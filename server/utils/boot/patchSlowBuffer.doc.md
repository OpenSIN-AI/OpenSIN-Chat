# Purpose: Companion docs for `patchSlowBuffer.js`
# Docs: this file

`patchSlowBuffer.js` installs a `Buffer.SlowBuffer` shim for Node.js ≥18, which removed the deprecated `SlowBuffer` constructor.

## Why this exists

The legacy npm package `buffer-equal-constant-time` (a transitive dep of `jsonwebtoken`) executes the following at module-load time:

```js
var origSlowBufEqual = SlowBuffer.prototype.equal; // ← crashes: SlowBuffer is undefined
```

In Node ≥18, `require('buffer').SlowBuffer` is `undefined`, so the require chain throws `TypeError: Cannot read properties of undefined (reading 'prototype')` and the server never boots.

## What the shim does

1. If `Buffer.SlowBuffer` already exists (legacy Node), the function is a no-op.
2. Otherwise, it defines a minimal `SlowBuffer` class extending `Buffer`, with a constant-time `.equal()` method on its prototype.
3. Logs a one-line confirmation so the patch is visible in the boot logs.

## Where it's loaded

`server/index.js` requires this shim **immediately after the logger init and before any other require**, so the shim is in place before `jsonwebtoken` is pulled in transitively by any auth code.

## Related files

- `server/utils/boot/patchSdkTimeouts.js` — sibling shim for undici / OpenAI / Anthropic SDK timeouts (same boot pattern).
- `server/utils/boot/patchSlowBuffer.js` — the shim itself.
- `server/index.js` — boot order (line ~1).

## Known caveats

- Only Node ≥18 is supported by this shim. For Node ≤16, `Buffer.SlowBuffer` exists natively and the shim is a no-op.
- The shim's `.equal()` is a constant-time XOR compare — identical to the algorithm in `buffer-equal-constant-time`. Safe to use for both `Buffer` and `SlowBuffer` instances.
