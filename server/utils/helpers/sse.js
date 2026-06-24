// SPDX-License-Identifier: MIT
// Purpose: Shared SSE heartbeat utility used by all SSE endpoints.
// Docs: server/endpoints/chat.js.doc.md, server/utils/EmbeddingWorkerManager.js

/**
 * Start an SSE heartbeat that sends a comment-line keepalive every 15s.
 * Returns a stop function that clears the interval.
 * Prevents proxy/load-balancer timeouts (Cloudflare, nginx, etc.) during
 * long prep phases (vector search, doc fetching, prompt assembly) before
 * the first token is streamed.
 *
 * The comment line (": heartbeat\n\n") is valid SSE and ignored by the
 * EventSource parser on the client.
 *
 * @param {import("express").Response} response
 * @returns {() => void} stop function that clears the interval
 */
function startSSEHeartbeat(response) {
  const interval = setInterval(() => {
    if (response.writableEnded || response.destroyed) {
      clearInterval(interval);
      return;
    }
    try {
      response.write(": heartbeat\n\n");
    } catch {
      clearInterval(interval);
    }
  }, 15_000);
  return () => clearInterval(interval);
}

module.exports = { startSSEHeartbeat };
