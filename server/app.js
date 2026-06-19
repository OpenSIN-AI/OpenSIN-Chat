// SPDX-License-Identifier: MIT
// Purpose: Express app factory for the server.
// Docs: server/app.doc.md
// This file exports the app factory so that both the production entry point
// (server/index.js) and the Vitest test suites in tests/ can build the same
// Express application without duplicating route wiring.

process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

require("./utils/logger")();
require("./utils/boot/patchSlowBuffer")();
require("./utils/boot/patchSdkTimeouts")();
require("./utils/boot/ensureJwtSecret")();
require("./utils/boot/ensureJwtSecret").ensureEncryptionSecrets();
const { logBootDiagnostics } = require("./utils/boot/logBootDiagnostics");
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { reqBody } = require("./utils/http");
const { systemEndpoints } = require("./endpoints/system");
const { workspaceEndpoints } = require("./endpoints/workspaces");
const { chatEndpoints } = require("./endpoints/chat");
const { embeddedEndpoints } = require("./endpoints/embed");
const { embedManagementEndpoints } = require("./endpoints/embedManagement");
const { getVectorDbClass } = require("./utils/helpers");
const { adminEndpoints } = require("./endpoints/admin");
const { modelRouterEndpoints } = require("./endpoints/modelRouter");
const { inviteEndpoints } = require("./endpoints/invite");
const { utilEndpoints } = require("./endpoints/utils");
const { developerEndpoints } = require("./endpoints/api");
const { extensionEndpoints } = require("./endpoints/extensions");
const { bootHTTP, bootSSL } = require("./utils/boot");
const { workspaceThreadEndpoints } = require("./endpoints/workspaceThreads");
const { documentEndpoints } = require("./endpoints/document");
const { agentWebsocket } = require("./endpoints/agentWebsocket");
const {
  agentSkillWhitelistEndpoints,
} = require("./endpoints/agentSkillWhitelist");
const { agentFileServerEndpoints } = require("./endpoints/agentFileServer");
const { experimentalEndpoints } = require("./endpoints/experimental");
const { browserExtensionEndpoints } = require("./endpoints/browserExtension");
const { communityHubEndpoints } = require("./endpoints/communityHub");
const { agentFlowEndpoints } = require("./endpoints/agentFlows");
const { mcpServersEndpoints } = require("./endpoints/mcpServers");
const { mobileEndpoints } = require("./endpoints/mobile");
const { scheduledJobEndpoints } = require("./endpoints/scheduledJobs");
const {
  outlookAgentEndpoints,
} = require("./endpoints/utils/outlookAgentUtils");
const {
  googleAgentSkillEndpoints,
} = require("./endpoints/utils/googleAgentSkillEndpoints");
const { memoryEndpoints } = require("./endpoints/memory");
const { providerStatusEndpoints } = require("./endpoints/providerStatus");
const { pdfAnalysisEndpoints } = require("./endpoints/pdfAnalysis");
const { httpLogger } = require("./middleware/httpLogger");
const { securityHeaders } = require("./utils/middleware/securityHeaders");

const FILE_LIMIT = process.env.BODY_LIMIT || "5120MB";

let activeApp = null;
// Kept as a reference to prevent the HTTP server from being garbage-collected.
let _activeServer = null;

function buildApp() {
  const app = express();

  app.set("trust proxy", parseInt(process.env.TRUST_PROXY ?? "1", 10));
  app.use(securityHeaders());

  if (
    process.env.NODE_ENV === "development" &&
    !!process.env.ENABLE_HTTP_LOGGER
  ) {
    app.use(
      httpLogger({
        enableTimestamps: !!process.env.ENABLE_HTTP_LOGGER_TIMESTAMPS,
      }),
    );
  }

  const corsOrigin = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
    : true;
  app.use(cors({ origin: corsOrigin }));
  app.use(bodyParser.text({ limit: FILE_LIMIT }));
  app.use(bodyParser.json({ limit: FILE_LIMIT }));
  app.use(bodyParser.urlencoded({ limit: FILE_LIMIT, extended: true }));

  const apiRouter = express.Router();
  app.use("/api", apiRouter);
  // During Vitest runs the suites in tests/ call endpoints without the /api
  // prefix, so we also mount the API router at root in test mode. This keeps
  // production routes unchanged while making the existing test files work.
  if (process.env.NODE_ENV === "test") {
    app.use("/", apiRouter);
  }

  systemEndpoints(apiRouter);
  extensionEndpoints(apiRouter);
  workspaceEndpoints(apiRouter);
  workspaceThreadEndpoints(apiRouter);
  chatEndpoints(apiRouter);
  adminEndpoints(apiRouter);
  modelRouterEndpoints(apiRouter);
  inviteEndpoints(apiRouter);
  embedManagementEndpoints(apiRouter);
  utilEndpoints(apiRouter);
  documentEndpoints(apiRouter);

  // Load WebSocket support before registering the agent WebSocket route.
  // In HTTPS mode this is handled by bootSSL; in test mode it is not needed.
  if (process.env.NODE_ENV !== "test" && process.env.ENABLE_HTTPS !== "true") {
    require("@mintplex-labs/express-ws").default(app);
  }

  agentWebsocket(app, "/api");
  agentSkillWhitelistEndpoints(apiRouter);
  agentFileServerEndpoints(apiRouter);
  experimentalEndpoints(apiRouter);
  developerEndpoints(app, apiRouter);
  communityHubEndpoints(apiRouter);
  agentFlowEndpoints(apiRouter);
  mcpServersEndpoints(apiRouter);
  mobileEndpoints(apiRouter);
  scheduledJobEndpoints(apiRouter);
  outlookAgentEndpoints(apiRouter);
  googleAgentSkillEndpoints(apiRouter);
  pdfAnalysisEndpoints(apiRouter);
  memoryEndpoints(apiRouter);
  providerStatusEndpoints(apiRouter);
  logBootDiagnostics();
  embeddedEndpoints(apiRouter);
  browserExtensionEndpoints(apiRouter);

  if (
    process.env.NODE_ENV !== "development" &&
    process.env.NODE_ENV !== "test"
  ) {
    const { MetaGenerator } = require("./utils/boot/MetaGenerator");
    const IndexPage = new MetaGenerator();

    app.use(
      express.static(path.resolve(__dirname, "public"), {
        extensions: ["js"],
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html") || filePath.endsWith("_index.html")) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
          } else if (
            filePath.includes("vendor-") ||
            filePath.includes("/assets/index-")
          ) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
          } else if (
            filePath.endsWith("/index.js") ||
            filePath.endsWith("/index.css")
          ) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
          } else if (filePath.includes("/assets/")) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable",
            );
          }
        },
      }),
    );

    app.get("/robots.txt", function (_, response) {
      response.type("text/plain");
      response.send("User-agent: *\nDisallow: /").end();
    });

    app.get("/manifest.json", async function (_, response) {
      IndexPage.generateManifest(response);
    });

    app.use("/", function (_, response) {
      IndexPage.generate(response);
    });
  } else {
    apiRouter.post("/v/:command", async (request, response) => {
      try {
        const VectorDb = getVectorDbClass();
        const { command } = request.params;
        if (!Object.getOwnPropertyNames(VectorDb).includes(command)) {
          response.status(500).json({
            message: "invalid interface command",
            commands: Object.getOwnPropertyNames(VectorDb),
          });
          return;
        }
        try {
          const body = reqBody(request);
          const resBody = await VectorDb[command](body);
          response.status(200).json({ ...resBody });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e?.message || "Unknown error", e);
          response.status(500).json({ error: e?.message || String(e) });
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    });
  }

  app.use(function (_, response) {
    response.sendStatus(404);
  });

  return app;
}

/**
 * Build and return the Express application. If this is called from a test,
 * also start the HTTP server on the configured port (default 3001) so the
 * test suites can use `fetch` against localhost. The singleton is used to
 * avoid EADDRINUSE when many tests run in the same process.
 */
function createApp() {
  if (activeApp) return activeApp;

  activeApp = buildApp();
  if (process.env.ENABLE_HTTPS !== "true") {
    const port = process.env.SERVER_PORT || 3001;
    // In test mode bind to IPv6 loopback only. Port 3001 is often occupied by
    // OrbStack/Cloudflare on IPv4, so we avoid the conflict and rely on the
    // tests/vitest setup to target the same interface.
    const host = process.env.NODE_ENV === "test" ? "::1" : undefined;
    _activeServer = activeApp.listen(port, host, () => {
      // Silent in tests to avoid console noise; production uses bootHTTP.
    });
  }
  return activeApp;
}

/**
 * Production bootstrap: start the app with full boot services (telemetry,
 * encryption, background workers, etc.). Used by server/index.js.
 */
function bootApp(app, port = 3001) {
  if (process.env.ENABLE_HTTPS === "true") {
    return bootSSL(app, port);
  }
  return bootHTTP(app, port);
}

module.exports = { buildApp, createApp, bootApp };
