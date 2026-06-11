// SPDX-License-Identifier: MIT
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
const { webPushEndpoints } = require("./endpoints/webPush");
const { telegramEndpoints } = require("./endpoints/telegram");
const { scheduledJobEndpoints } = require("./endpoints/scheduledJobs");
const { pdfAnalysisEndpoints } = require("./endpoints/pdfAnalysis");
const {
  outlookAgentEndpoints,
} = require("./endpoints/utils/outlookAgentUtils");
const {
  googleAgentSkillEndpoints,
} = require("./endpoints/utils/googleAgentSkillEndpoints");
const { memoryEndpoints } = require("./endpoints/memory");
const { providerStatusEndpoints } = require("./endpoints/providerStatus");
const { httpLogger } = require("./middleware/httpLogger");
const { securityHeaders } = require("./utils/middleware/securityHeaders");
const BackgroundQueue = require("./utils/backgroundJobs/queue");
const app = express();
// Required for correct client IPs (rate limiting, logging) behind a
// reverse proxy (nginx, Cloudflare). Set TRUST_PROXY=0 to disable when
// the server is directly exposed.
app.set("trust proxy", parseInt(process.env.TRUST_PROXY ?? "1", 10));
app.use(securityHeaders());
const apiRouter = express.Router();
// Body-parser limit. Historically 5120MB to support huge raw-text document
// uploads via JSON. Operators SHOULD lower this in production (e.g. 50MB)
// via BODY_LIMIT — large bodies are buffered fully in memory BEFORE any
// auth middleware runs, so this is an unauthenticated memory-DoS vector.
const FILE_LIMIT = process.env.BODY_LIMIT || "5120MB";

// Only log HTTP requests in development mode and if the ENABLE_HTTP_LOGGER environment variable is set to true
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
app.use(cors({ origin: true }));
app.use(bodyParser.text({ limit: FILE_LIMIT }));
app.use(bodyParser.json({ limit: FILE_LIMIT }));
app.use(
  bodyParser.urlencoded({
    limit: FILE_LIMIT,
    extended: true,
  }),
);

if (!!process.env.ENABLE_HTTPS) {
  bootSSL(app, process.env.SERVER_PORT || 3001);
} else {
  require("@mintplex-labs/express-ws").default(app); // load WebSockets in non-SSL mode.
}

app.use("/api", apiRouter);
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
// NOTE: agentWebsocket must be registered on the main `app` (not apiRouter).
// `apiRouter` is created before expressWs(app) runs, so it never receives the
// `.ws` method. We pass the main app + "/api" prefix so the route still matches
// the client URL `/api/agent-invocation/:uuid`.
agentWebsocket(app, "/api");
agentSkillWhitelistEndpoints(apiRouter);
agentFileServerEndpoints(apiRouter);
experimentalEndpoints(apiRouter);
developerEndpoints(app, apiRouter);
communityHubEndpoints(apiRouter);
agentFlowEndpoints(apiRouter);
mcpServersEndpoints(apiRouter);
mobileEndpoints(apiRouter);
webPushEndpoints(apiRouter);
telegramEndpoints(apiRouter);
scheduledJobEndpoints(apiRouter);
outlookAgentEndpoints(apiRouter);
googleAgentSkillEndpoints(apiRouter);
pdfAnalysisEndpoints(apiRouter);
memoryEndpoints(apiRouter);
providerStatusEndpoints(apiRouter);
logBootDiagnostics();
// Externally facing embedder endpoints
embeddedEndpoints(apiRouter);

// Externally facing browser extension endpoints
browserExtensionEndpoints(apiRouter);

// Unterbrochene PDF-Analyse-Jobs nach Neustart automatisch fortsetzen
const { PdfAnalysisPipeline } = require("./utils/pdfAnalysis");
PdfAnalysisPipeline.resumeInterrupted();

// OCR-Worker beim Prozess-Ende sauber terminieren
const { shutdownOcr } = require("./utils/pdfAnalysis/ocr");
process.on("beforeExit", () => {
  shutdownOcr();
});

if (process.env.NODE_ENV !== "development") {
  const { MetaGenerator } = require("./utils/boot/MetaGenerator");
  const IndexPage = new MetaGenerator();

  app.use(
    express.static(path.resolve(__dirname, "public"), {
      extensions: ["js"],
      setHeaders: (res, path) => {

        // Prevent cache issues with Vite chunk hashing on rebuilds
        // HTML always fresh, JS entry points short cache, hashed chunks immutable
        if (path.endsWith(".html") || path.endsWith("_index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (path.includes("vendor-") || path.includes("/assets/index-")) {
          // Vendor + entry chunks — always fresh so the browser never
          // caches stale chunks after a rebuild.
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (path.endsWith("/index.js") || path.endsWith("/index.css")) {
          // Entry chunks — always fresh
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        } else if (path.includes("/assets/")) {
          // Hashed chunks — immutable since hash changes on content change
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
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
    return;
  });

  app.use("/", function (_, response) {
    IndexPage.generate(response);
    return;
  });
} else {
  // Debug route for development connections to vectorDBs
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
        // console.error(e)
        // eslint-disable-next-line no-console
        console.error(JSON.stringify(e));
        response.status(500).json({ error: e.message });
      }
      return;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e.message, e);
      response.sendStatus(500).end();
    }
  });
}

// Catch-all 404 handler. Uses a path-less middleware instead of
// app.all("*", ...) so it is compatible with both Express 4 and Express 5
// (Express 5 / path-to-regexp@8 rejects the bare "*" wildcard string).
app.use(function (_, response) {
  response.sendStatus(404);
});

// In non-https mode we need to boot at the end since the server has not yet
// started and is `.listen`ing.
if (!process.env.ENABLE_HTTPS) bootHTTP(app, process.env.SERVER_PORT || 3001);

// Persistente Background-Queue starten (nimmt automatisch pending Jobs
// wieder auf, die ein Crash/Sleep überlebt haben). Muss NACH allen
// Endpoints laufen, damit add()-Calls aus Request-Handlern bereits
// funktionieren.
BackgroundQueue.start();

// Graceful Shutdown — sauberer Queue-Stopp, damit kein Job mitten im
// Write abbricht (SQLite-Transaktionen würden das abfangen, aber
// Konsistenz ist besser).
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, stopping queue...");
  BackgroundQueue.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, stopping queue...");
  BackgroundQueue.stop();
  process.exit(0);
});
