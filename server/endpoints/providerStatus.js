// SPDX-License-Identifier: MIT
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { getProviderKeyStatuses } = require("../utils/providerKeyStatus");
const {
  probeProvider,
  probeAllProviders,
} = require("../utils/providerConnectivity");
const { pathsHealth } = require("../utils/paths");

/**
 * Admin-only diagnostics:
 *  GET  /system/provider-key-status   -> key/fallback status + path health (fast, no network)
 *  GET  /system/provider-connectivity -> active reachability probes (network, ~4s max)
 *       optional ?provider=<id> to probe a single provider
 * No secrets are ever included in responses.
 * @param {import("express").Router} app
 */
function providerStatusEndpoints(app) {
  if (!app) return;

  app.get(
    "/system/provider-key-status",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (_request, response) => {
      try {
        response.status(200).json({
          providers: getProviderKeyStatuses(),
          paths: pathsHealth(),
          checkedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("provider-key-status failed:", e.message);
        response
          .status(500)
          .json({ providers: [], paths: null, error: e?.message || String(e) });
      }
    },
  );

  app.get(
    "/system/provider-connectivity",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { provider = null } = request.query;
        const results = provider
          ? [await probeProvider(String(provider))]
          : await probeAllProviders();
        response
          .status(200)
          .json({ results, checkedAt: new Date().toISOString() });
      } catch (e) {
        console.error("provider-connectivity failed:", e.message);
        response
          .status(500)
          .json({ results: [], error: e?.message || String(e) });
      }
    },
  );
}

module.exports = { providerStatusEndpoints };
