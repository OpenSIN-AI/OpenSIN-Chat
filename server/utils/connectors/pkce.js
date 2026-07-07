// SPDX-License-Identifier: MIT
// Purpose: PKCE (Proof Key for Code Exchange) helper + state store with TTL.
//          Used by OAuth connector flow for CSRF protection and code interception prevention.
// Docs: pkce.doc.md

const crypto = require("node:crypto");

/**
 * Base64url encode a Buffer (no padding).
 * @param {Buffer} buf
 * @returns {string}
 */
function base64url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a PKCE verifier + challenge pair (S256).
 * @returns {{ verifier: string, challenge: string }}
 */
function createPKCE() {
  const verifier = base64url(crypto.randomBytes(32));
  const challenge = base64url(
    crypto.createHash("sha256").update(verifier).digest(),
  );
  return { verifier, challenge };
}

// --- State Store (in-memory, TTL-based) ---
// Single-VM sufficient. For horizontal scaling, use Redis.
const stateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Store a state value with associated data.
 * @param {string} state
 * @param {Object} data - { verifier, provider, product, userId, scopes }
 */
function putState(state, data) {
  stateStore.set(state, { ...data, exp: Date.now() + STATE_TTL_MS });
}

/**
 * Consume a state value (one-time use). Returns null if expired or not found.
 * @param {string} state
 * @returns {Object|null}
 */
function takeState(state) {
  const v = stateStore.get(state);
  stateStore.delete(state);
  if (!v || v.exp < Date.now()) return null;
  return v;
}

// Periodic cleanup of expired states
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of stateStore) {
    if (v.exp < now) stateStore.delete(k);
  }
}, 60_000).unref();

module.exports = { createPKCE, putState, takeState };
