// SPDX-License-Identifier: MIT

const { globalSearch } = require("../utils/globalSearch");
const { normalizeQuery } = require("../utils/globalSearch/query");
const { userFromSession, multiUserMode } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");

function globalSearchEndpoints(app) {
  if (!app) return;

  app.get(
    "/global-search",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const isMultiUser = multiUserMode(response);
        const user = isMultiUser
          ? await userFromSession(request, response)
          : { id: 0, role: "admin" };

        if (isMultiUser && !user) {
          return response.status(401).json({
            success: false,
            error: "Authentication required.",
          });
        }

        const query = normalizeQuery(request.query.q);

        if (query.length < 2) {
          return response.status(200).json({
            success: true,
            query,
            results: [],
            counts: {},
            total: 0,
          });
        }

        const result = await globalSearch({
          user,
          query,
          types: request.query.types,
          limit: request.query.limit,
        });

        return response.status(200).json({
          success: true,
          ...result,
        });
      } catch (error) {
        console.error("[global-search]", error);
        return response.status(500).json({
          success: false,
          error: "Search is temporarily unavailable.",
        });
      }
    },
  );
}

module.exports = {
  globalSearchEndpoints,
};
