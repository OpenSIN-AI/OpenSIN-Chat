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
 * Issue #373: The interval is .unref()'d so it does not keep the Node.js
 * event loop (and therefore the Jest worker process) alive. In production
 * the HTTP response lifecycle always outlives the interval because the
 * stop function is called on stream completion; in tests that forget to
 * call stop(), unref prevents the "worker failed to exit gracefully" warning.
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

  // Prevent the timer from keeping the event loop alive on its own.
  // The HTTP response itself holds the loop open while the stream is
  // active; the heartbeat should not be the sole reason the process stays up.
  interval.unref();

  return () => clearInterval(interval);
}

module.exports = { startSSEHeartbeat };
