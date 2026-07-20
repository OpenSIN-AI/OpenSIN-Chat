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
const crypto = require("crypto");
const fs = require("fs");
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
const { agentSSE } = require("./endpoints/agentSSE");
const {
  agentSkillWhitelistEndpoints,
} = require("./endpoints/agentSkillWhitelist");
const { agentFileServerEndpoints } = require("./endpoints/agentFileServer");
const { experimentalEndpoints } = require("./endpoints/experimental");
const { agentFlowEndpoints } = require("./endpoints/agentFlows");
const { mcpServersEndpoints } = require("./endpoints/mcpServers");
const { agentRunsStream } = require("./endpoints/agentRunsStream");
const { subagentEndpoints } = require("./endpoints/subagents");
const { scheduledJobEndpoints } = require("./endpoints/scheduledJobs");
const {
  outlookAgentEndpoints,
} = require("./endpoints/utils/outlookAgentUtils");
const {
  googleAgentSkillEndpoints,
} = require("./endpoints/utils/googleAgentSkillEndpoints");
const { memoryEndpoints } = require("./endpoints/memory");
const { noteEndpoints } = require("./endpoints/notes");
const { contextModeEndpoints } = require("./endpoints/contextMode");
const { transformationEndpoints } = require("./endpoints/transformations");
const { askEndpoints } = require("./endpoints/ask");
const { providerStatusEndpoints } = require("./endpoints/providerStatus");
const { pdfAnalysisEndpoints } = require("./endpoints/pdfAnalysis");
const { webPushEndpoints } = require("./endpoints/webPush");
const { telegramEndpoints } = require("./endpoints/telegram");
const cspViolationEndpoint = require("./endpoints/cspViolation");
const { httpLogger } = require("./middleware/httpLogger");
const { securityHeaders } = require("./utils/middleware/securityHeaders");

// RELIABILITY: Log the error and let the graceful shutdown handler in
// server/index.js drain in-flight requests before exiting. Calling
// process.exit(1) directly here drops all active HTTP requests and
// background jobs (PDF analysis, embeddings, politician sync).
process.on("unhandledRejection", (reason, promise) => {
  console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught Exception:", err);
});

// Body-parser limit for JSON/text/urlencoded payloads.
// File uploads are handled by multer with its own size limits, so
// bodyParser does not need to accept multi-GB payloads. 50MB is
// generous for any legitimate JSON body (chat messages, attachments
// as base64, etc.) while preventing memory-exhaustion DoS.
const FILE_LIMIT = process.env.BODY_LIMIT || "50mb";

let activeApp = null;
// Kept as a reference to prevent the HTTP server from being garbage-collected.
let _activeServer = null;

function buildApp() {
  const app = express();

  app.set(
    "trust proxy",
    (process.env.TRUST_PROXY ?? "loopback")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  app.use((req, res, next) => {
    const id = req.headers["x-request-id"] || crypto.randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
  });
  app.use((request, response, next) => {
    const mutating = !["GET", "HEAD", "OPTIONS"].includes(request.method);
    if (mutating && process.env.NODE_ENV === "production") {
      const origin = request.headers.origin;
      if (origin) {
        const allowed = (process.env.CORS_ORIGIN || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (
          allowed.length &&
          !allowed.includes("*") &&
          !allowed.some((o) => o.toLowerCase() === origin.toLowerCase())
        ) {
          const id = crypto.randomUUID();
          console.error(
            `[OriginBlock id=${id}] rejected ${request.method} ${request.path} from ${origin}`,
          );
          return response.status(403).json({ error: "Origin not allowed", id });
        }
      }
    }
    next();
  });
  app.use(securityHeaders());

  // PERF: gzip/deflate responses. SSE is excluded (must not buffer chunks).
  try {
    const compression = require("compression");
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers.accept === "text/event-stream") return false;
          if (res.getHeader("Content-Type") === "text/event-stream")
            return false;
          return compression.filter(req, res);
        },
        level: 6,
        threshold: 1024,
      }),
    );
  } catch {
    /* optional — lean images without the dep still boot */
  }

  app.use((req, res, next) => {
    res.setHeader(
      "Report-To",
      JSON.stringify({ group: "csp-endpoint", max_age: 10800 }),
    );
    next();
  });

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

  const corsOriginEnv = process.env.CORS_ORIGIN || "";
  if (corsOriginEnv === "*") {
    throw new Error(
      "[app.boot] CORS_ORIGIN=* is forbidden; supply an explicit comma-separated list of allowed origins.",
    );
  }
  const corsOrigin = corsOriginEnv
    ? corsOriginEnv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : process.env.NODE_ENV === "production"
      ? false
      : true;
  app.use(
    cors({ origin: corsOrigin.length === 1 ? corsOrigin[0] : corsOrigin }),
  );

  app.use("/request-token", bodyParser.json({ limit: "8kb" }));
  app.use("/system/reset-password", bodyParser.json({ limit: "8kb" }));
  app.use("/system/enable-multi-user", bodyParser.json({ limit: "8kb" }));
  app.use("/invite", bodyParser.json({ limit: "8kb" }));

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
  agentSSE(apiRouter, "");
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
  // In HTTPS mode bootSSL will re-initialize express-ws with the actual HTTPS
  // server; doing it here ensures app.ws is available when agentWebsocket runs.
  if (process.env.NODE_ENV !== "test") {
    require("@mintplex-labs/express-ws").default(app);
  }

  agentWebsocket(app, "/api");
  agentSkillWhitelistEndpoints(apiRouter);
  agentFileServerEndpoints(apiRouter);
  experimentalEndpoints(apiRouter);
  developerEndpoints(app, apiRouter);

  agentFlowEndpoints(apiRouter);
  mcpServersEndpoints(apiRouter);
  agentRunsStream(apiRouter);
  subagentEndpoints(apiRouter);

  scheduledJobEndpoints(apiRouter);
  outlookAgentEndpoints(apiRouter);
  googleAgentSkillEndpoints(apiRouter);
  pdfAnalysisEndpoints(app);
  memoryEndpoints(apiRouter);
  noteEndpoints(apiRouter);
  contextModeEndpoints(apiRouter);
  transformationEndpoints(apiRouter);
  askEndpoints(apiRouter);
  providerStatusEndpoints(apiRouter);
  webPushEndpoints(apiRouter);
  telegramEndpoints(apiRouter);
  logBootDiagnostics();
  embeddedEndpoints(apiRouter);

  cspViolationEndpoint(apiRouter);

  if (
    process.env.NODE_ENV !== "development" &&
    process.env.NODE_ENV !== "test"
  ) {
    const { MetaGenerator } = require("./utils/boot/MetaGenerator");
    const IndexPage = new MetaGenerator();

    // PERF (CEO): Hashed Vite assets under /assets/* (incl. index-*.js, vendor-*.js)
    // are content-addressed — they MUST be long-cached. Re-downloading multi-MB
    // bundles on every navigation is a second-scale UX tax. Only HTML and the
    // root index.js/css preload map stay uncached.
    //
    // Prefer precompressed .br/.gz companions (see frontend postbuild) so the
    // Cloudflare Tunnel never hauls multi-MB uncompressed JS over the wire.
    const publicDir = path.resolve(__dirname, "public");
    const { precompressedStatic } = require("./utils/http/precompressedStatic");
    app.use(precompressedStatic(publicDir));
    app.use(
      express.static(publicDir, {
        extensions: ["js"],
        // etag + lastModified let CF/browser revalidate cheaply when needed
        etag: true,
        lastModified: true,
        setHeaders: (res, filePath) => {
          const base = path.basename(filePath);
          const isHtml =
            filePath.endsWith(".html") || filePath.endsWith("_index.html");
          // Root entry shims (no content hash) — always revalidate
          const isRootEntry =
            base === "index.js" ||
            base === "index.css" ||
            base === "manifest.json";
          if (isHtml || isRootEntry) {
            res.setHeader(
              "Cache-Control",
              "no-cache, no-store, must-revalidate",
            );
            return;
          }
          // Fingerprinted build output (…/assets/name-HASH.js|css|…)
          if (
            filePath.includes(`${path.sep}assets${path.sep}`) ||
            filePath.includes("/assets/")
          ) {
            res.setHeader(
              "Cache-Control",
              "public, max-age=31536000, immutable",
            );
            return;
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

    let prismaClient = null;
    try {
      prismaClient = require("./utils/prisma");
    } catch {
      prismaClient = null;
    }

    app.get("/healthz", (_req, res) => res.status(200).json({ status: "ok" }));
    app.get("/readyz", async (_req, res) => {
      if (!prismaClient)
        return res.status(200).json({ status: "ready", db: "unchecked" });
      try {
        await prismaClient.$queryRaw`SELECT 1`;
        res.status(200).json({ status: "ready" });
      } catch (e) {
        const id = crypto.randomUUID();
        console.error(`[readyz error] id=${id}`, e);
        res.status(503).json({ status: "not ready", id });
      }
    });

    /**
     * Serve the static prerendered HTML for docs pages when available. This
     * bypasses the JS boot delay for the initial docs paint and lets the
     * React app hydrate the same markup.
     */
    function getDocsPrerender(pathname) {
      if (pathname === "/docs" || pathname.startsWith("/docs/")) {
        const slug = pathname.replace("/docs", "").replace(/^\//, "");
        const fileName = slug ? `${slug}.html` : "user-guide.html";
        const filePath = path.resolve(__dirname, "public", "docs", fileName);
        try {
          if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf8");
        } catch {
          /* fall back to empty root */
        }
      }
      return null;
    }

    // Return 404 JSON for unmatched /api/* paths instead of serving HTML
    apiRouter.use((req, res) => res.status(404).json({ error: "Not found" }));

    app.use("/assets", function (request, response, next) {
      const fs = require("fs");
      const path = require("path");
      const assetsDir = path.resolve(__dirname, "public", "assets");
      const filePath = path.resolve(assetsDir, request.path);
      if (
        filePath !== assetsDir &&
        !filePath.startsWith(assetsDir + path.sep)
      ) {
        return response.status(403).end();
      }
      if (!fs.existsSync(filePath)) {
        return response.status(404).end();
      }
      next();
    });

    app.use("/", function (request, response) {
      const prerendered = getDocsPrerender(request.path);
      IndexPage.generate(request, response, 200, prerendered);
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
          console.error(e?.message || "Unknown error", e);
          response.status(500).json({ error: e?.message || String(e) });
        }
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500);
      }
    });
  }

  app.use(function (_, response) {
    response.sendStatus(404);
  });

  // Express body-parser throws SyntaxError when the client posts malformed
  // JSON and PayloadTooLargeError for bodies that exceed the configured size
  // limit. Both of those are CLIENT mistakes, not server-side bugs — surface
  // them as 400/413 with a UUID-tagged message instead of a generic 500 which
  // hides the root cause from operators (the previous behaviour caused
  // countless "server error" alerts on user typos). Unknown errors still
  // fall through to the 500 branch below so we never swallow real faults.
  app.use(function (err, _req, response, _next) {
    if (!response.headersSent && err) {
      const id = crypto.randomUUID();

      if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
        console.warn(`[errorHandler] id=${id} bad JSON: ${err.message}`);
        return response.status(400).json({
          error: "Malformed JSON body. Please check your request payload.",
          id,
        });
      }

      if (err.type === "entity.too.large") {
        console.warn(
          `[errorHandler] id=${id} payload-too-large: ${err.message}`,
        );
        return response.status(413).json({
          error: "Request body exceeds the permitted size limit.",
          id,
        });
      }

      // Multer errors: file type rejected, file too large, etc.
      if (err.code === "LIMIT_FILE_SIZE") {
        console.warn(`[errorHandler] id=${id} file-too-large: ${err.message}`);
        return response.status(413).json({
          error: "File exceeds the permitted size limit.",
          id,
        });
      }
      if (err.message === "File type not allowed") {
        console.warn(
          `[errorHandler] id=${id} file-type-rejected: ${err.message}`,
        );
        return response.status(415).json({
          error: "File type not allowed.",
          id,
        });
      }

      console.error(`[errorHandler] id=${id}`, err);
      return response.status(500).json({ error: "Internal server error", id });
    }
    return _next?.(err);
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
function bootApp(app, port = 3001, onReady) {
  if (process.env.ENABLE_HTTPS === "true") {
    return bootSSL(app, port, onReady);
  }
  return bootHTTP(app, port, onReady);
}

module.exports = { buildApp, createApp, bootApp };
