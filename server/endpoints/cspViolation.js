// SPDX-License-Identifier: MIT
const crypto = require("node:crypto");
const express = require("express");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");

function cspViolationEndpoint(app) {
  if (!app) return;

  const reportParser = express.text({
    type: [
      "application/csp-report",
      "application/reports+json",
      "application/json",
      "text/plain",
    ],
    limit: "32kb",
  });

  app.post(
    "/csp-violation",
    [
      simpleRateLimit({
        bucket: "csp-violation",
        max: 30,
        windowMs: 60 * 1000,
      }),
      reportParser,
    ],
    async (request, response) => {
      const id = crypto.randomUUID();
      const raw = request.body;
      let body = {};

      if (raw && typeof raw === "string" && raw.length) {
        try {
          body = JSON.parse(raw);
        } catch {
          body = { raw };
        }
      } else if (raw && typeof raw === "object") {
        body = raw;
      }

      const truncated = JSON.stringify(body).slice(0, 500);
      console.warn(`[csp-violation id=${id}]`, truncated);
      response.status(204).end();
    },
  );
}

module.exports = cspViolationEndpoint;
