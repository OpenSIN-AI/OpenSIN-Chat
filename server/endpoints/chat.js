// SPDX-License-Identifier: MIT
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  ROLES,
  flexUserRoleValid,
} = require("../utils/middleware/multiUserProtected");
const {
  validWorkspaceAndThreadSlug,
  validWorkspaceSlug,
} = require("../utils/middleware/validWorkspace");
const { simpleRateLimit } = require("../utils/middleware/simpleRateLimit");
const { streamChatHandler } = require("../utils/helpers/chat/streamHandler");

const RATE_LIMIT = {
  bucket: "chat-stream",
  max: 60,
  windowMs: 60 * 1000,
};

function chatEndpoints(app) {
  if (!app) return;

  app.post(
    "/workspace/:slug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceSlug,
      simpleRateLimit(RATE_LIMIT),
    ],
    (request, response) =>
      streamChatHandler(request, response, { thread: null }),
  );

  app.post(
    "/workspace/:slug/thread/:threadSlug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
      simpleRateLimit(RATE_LIMIT),
    ],
    (request, response) =>
      streamChatHandler(request, response, {
        thread: response.locals.thread,
      }),
  );
}

module.exports = { chatEndpoints };
