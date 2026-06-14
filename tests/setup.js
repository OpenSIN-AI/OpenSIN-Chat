// SPDX-License-Identifier: MIT
// Purpose: Global test setup for the tests/ Vitest suite.
// Docs: tests/setup.js
// Patches `global.fetch` so that `http://localhost:3001` targets the test
// server that `createApp()` starts on the IPv6 loopback (`::1`). This avoids
// conflicts with OrbStack/Cloudflare which often occupies port 3001 on IPv4.

const originalFetch = global.fetch;

const TEST_PORT = process.env.SERVER_PORT || "3001";
const LOCALHOST_URL = `http://localhost:${TEST_PORT}`;
const LOOPBACK_URL = `http://[::1]:${TEST_PORT}`;

global.fetch = async function patchedFetch(input, init) {
  let url = typeof input === "string" ? input : input.url;
  if (url.startsWith(`${LOCALHOST_URL}/`) || url === LOCALHOST_URL) {
    url = url.replace(LOCALHOST_URL, LOOPBACK_URL);
    input = url;
  }
  return originalFetch(input, init);
};

// Expose the original fetch for any test that needs it.
global.__originalFetch = originalFetch;
