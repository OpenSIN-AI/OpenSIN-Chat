// SPDX-License-Identifier: MIT
const { Telemetry } = require("../models/telemetry");
const {
  WorkspaceAgentInvocation,
} = require("../models/workspaceAgentInvocation");
const { AgentHandler } = require("../utils/agents");
const {
  WEBSOCKET_BAIL_COMMANDS,
} = require("../utils/agents/aibitat/plugins/websocket");
const { safeJsonParse } = require("../utils/http");

// Setup listener for incoming messages to relay to socket so it can be handled by agent plugin.
function relayToSocket(message) {
  if (this.handleFeedback) return this?.handleFeedback?.(message);
  if (this.handleToolApproval) return this?.handleToolApproval?.(message);
  if (this.handleClarificationResponse)
    return this?.handleClarificationResponse?.(message);
  this.checkBailCommand(message);
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
