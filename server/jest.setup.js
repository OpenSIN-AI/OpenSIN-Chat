/* global jest */
// SPDX-License-Identifier: MIT
// Mock buffer-equal-constant-time for Node.js 18+ compatibility
// This package is deprecated and doesn't work with newer Node.js versions
jest.mock("buffer-equal-constant-time", () => {
  return (a, b) => {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result === 0;
  };
});

// Disable rate limiting in test runs — the fixed-window limiter
// would throttle sequential test calls to the same endpoint bucket.
process.env.DISABLE_RATE_LIMITS = "true";

// Shrink HTTP retry backoff in test runs so mocked-rejection assertions
// finish well within Jest's 5s default per-test budget. Production defaults
// (3 retries, 1s × 2^attempt + ≤1s jitter) remain unchanged for real deployments.
process.env.POLITICIAN_API_MAX_RETRIES = "0";
