// SPDX-License-Identifier: MIT
// Telemetry is fully disabled in OpenSIN-Chat.
// This module keeps the original API surface so existing callers require()
// without changes — every method is a no-op, zero data ever leaves the server.

const Telemetry = {
  /** @returns {Promise<void>} */
  sendTelemetry: async function (
    _event,
    _eventProperties = {},
    _subUserId = null,
    _silent = false,
  ) {
    return;
  },

  /** @returns {Promise<void>} */
  flush: async function () {
    return;
  },

  /** @returns {Promise<string|null>} */
  id: async function () {
    return null;
  },

  runtime: function () {
    if (
      (process.env.OPENSIN_CHAT_RUNTIME || process.env.ANYTHING_LLM_RUNTIME) ===
      "docker"
    )
      return "docker";
    if (process.env.NODE_ENV === "production") return "production";
    return "other";
  },
};

module.exports = { Telemetry };
