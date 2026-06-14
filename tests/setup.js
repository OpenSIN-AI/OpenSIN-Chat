// SPDX-License-Identifier: MIT
// Purpose: Global test setup for the tests/ Vitest suite.
// Docs: tests/setup.js
// Patches `global.fetch` so that `http://localhost:3001` targets the test
// server that `createApp()` starts on the IPv6 loopback (`::1`). This avoids
// conflicts with OrbStack/Cloudflare which often occupies port 3001 on IPv4.

const originalFetch = global.fetch;

global.fetch = async function patchedFetch(input, init) {
  let url = typeof input === "string" ? input : input.url;
  if (url.startsWith("http://localhost:3001/") || url === "http://localhost:3001") {
    url = url.replace("http://localhost:3001", "http://[::1]:3001");
    input = url;
  }
  return originalFetch(input, init);
};

// Expose the original fetch for any test that needs it.
global.__originalFetch = originalFetch;
