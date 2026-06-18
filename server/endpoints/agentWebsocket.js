// SPDX-License-Identifier: MIT
const { Telemetry } = require("../models/telemetry");
const {
  WorkspaceAgentInvocation,
} = require("../models/workspaceAgentInvocation");
const { AgentHandler } = require("../utils/agents");
const {
  WEBSOCKET_BAIL_COMMANDS,
} = require("../utils/agents/aibitat/plugins/websocket");
const { safeJsonParse, decodeJWT } = require("../utils/http");
const { SystemSettings } = require("../models/systemSettings");
const { User } = require("../models/user");
const { EncryptionManager } = require("../utils/EncryptionManager");
const { getAuthTokenHash } = require("../utils/middleware/validatedRequest");
const EncryptionMgr = new EncryptionManager();

// Setup listener for incoming messages to relay to socket so it can be handled by agent plugin.
function relayToSocket(message) {
  if (this.handleFeedback) return this?.handleFeedback?.(message);
  if (this.handleToolApproval) return this?.handleToolApproval?.(message);
  if (this.handleClarificationResponse)
    return this?.handleClarificationResponse?.(message);
  this.checkBailCommand(message);
}

async function isAuthorizedRequest(request) {
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENV === "test" ||
    !process.env.AUTH_TOKEN ||
    !process.env.JWT_SECRET
  ) {
    return true;
  }

  const auth = request.headers.authorization;
  const token = auth ? auth.split(" ")[1] : request.query?.token;
  if (!token) return false;

  const decoded = decodeJWT(token);
  if (!decoded) return false;

  const multiUserMode = await SystemSettings.isMultiUserMode();
  if (multiUserMode) {
    if (!decoded.id) return false;
    const user = await User.get({ id: decoded.id });
    if (!user || user.suspended) return false;
    return true;
  }

  const { p } = decoded;
  if (p === null || !/\w{32}:\w{32}/.test(p)) return false;

  const bcrypt = require("bcryptjs");
  return bcrypt.compareSync(EncryptionMgr.decrypt(p), getAuthTokenHash());
}

function agentWebsocket(app, routePrefix = "") {
  if (!app) return;
  // `@mintplex-labs/express-ws` only patches `.ws` onto objects that exist
  // (and are passed) when `expressWs(app)` runs. The main `app` always has it;
  // a plain `express.Router()` created *before* expressWs ran does NOT.
  // So this MUST be called with the main `app` (not the apiRouter), and we
  // prefix the route with `/api` so it still matches the client URL
  // `${websocketURI()}/api/agent-invocation/:uuid`.
  if (typeof app.ws !== "function") {
    // eslint-disable-next-line no-console
    console.error(
      "[agentWebsocket] `.ws` is not available on the provided app/router — " +
        "agent WebSocket route NOT registered. Agents will fail to connect. " +
        "Ensure agentWebsocket(app) is called with the main express app after expressWs(app).",
    );
    return;
  }

  app.ws(
    `${routePrefix}/agent-invocation/:uuid`,
    async function (socket, request) {
      try {
        if (!(await isAuthorizedRequest(request))) {
          socket.close(1008, "Unauthorized");
          return;
        }

        const agentHandler = await new AgentHandler({
          uuid: String(request.params.uuid),
        }).init();

        if (!agentHandler.invocation) {
          socket.close();
          return;
        }

        socket.on("message", relayToSocket);
        socket.on("close", () => {
          agentHandler.closeAlert();
          WorkspaceAgentInvocation.close(String(request.params.uuid));
          return;
        });

        socket.checkBailCommand = (data) => {
          const content = safeJsonParse(data)?.feedback;
          if (WEBSOCKET_BAIL_COMMANDS.includes(content)) {
            agentHandler.log(
              `User invoked bail command while processing. Closing session now.`,
            );
            agentHandler.aibitat.abort();
            socket.close();
            return;
          }
        };

        await Telemetry.sendTelemetry("agent_chat_started");
        await agentHandler.createAIbitat({ socket });
        await agentHandler.startAgentCluster();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        socket?.send(
          JSON.stringify({ type: "wssFailure", content: e.message }),
        );
        socket?.close();
      }
    },
  );
}

module.exports = { agentWebsocket };
