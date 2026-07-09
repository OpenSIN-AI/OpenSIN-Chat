// SPDX-License-Identifier: MIT
process.env.NODE_ENV === "development"
  ? require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` })
  : require("dotenv").config();

require("./utils/logger")();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { ACCEPTED_MIMES } = require("./utils/constants");
const { reqBody, getCollectorPort } = require("./utils/http");
const { processSingleFile } = require("./processSingleFile");
const { processLink, getLinkText } = require("./processLink");
const { wipeCollectorStorage } = require("./utils/files");
const extensions = require("./extensions");
const { processRawText } = require("./processRawText");
const { convertAudioToWav } = require("./convertAudioToWav");
const { verifyPayloadIntegrity } = require("./middleware/verifyIntegrity");
const { httpLogger } = require("./middleware/httpLogger");
const app = express();
const FILE_LIMIT = "5GB";
const COLLECTOR_PORT = getCollectorPort();

// Only log HTTP requests in development mode and if the ENABLE_HTTP_LOGGER environment variable is set to true
if (
  process.env.NODE_ENV === "development" &&
  !!process.env.ENABLE_HTTP_LOGGER
) {
  app.use(
    httpLogger({
      enableTimestamps: !!process.env.ENABLE_HTTP_LOGGER_TIMESTAMPS,
    })
  );
}
// SECURITY: Mirror the server's CORS policy (server/app.js). The collector
// accepts requests from any origin by default, which means any website a
// user visits can trigger expensive document processing or web scraping
// (DoS / SSRF). Require an explicit allow-list in production.
const corsOriginEnv = process.env.CORS_ORIGIN || "";
if (corsOriginEnv === "*") {
  throw new Error(
    "[collector.boot] CORS_ORIGIN=* is forbidden; supply an explicit comma-separated list of allowed origins.",
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
app.use(
  bodyParser.text({ limit: FILE_LIMIT }),
  bodyParser.json({ limit: FILE_LIMIT }),
  bodyParser.urlencoded({
    limit: FILE_LIMIT,
    extended: true,
  })
);

app.post(
  "/process",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { filename, options = {}, metadata = {} } = reqBody(request);
    if (options && options.absolutePath) delete options.absolutePath;
    try {
      const targetFilename = path
        .normalize(filename)
        .replace(/^(\.\.(\/|\\|$))+/, "");
      const {
        success,
        reason,
        documents = [],
      } = await processSingleFile(targetFilename, options, metadata);
      response
        .status(200)
        .json({ filename: targetFilename, success, reason, documents });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        filename: filename,
        success: false,
        reason: "A processing error occurred.",
        documents: [],
      });
    }
    return;
  }
);

app.post(
  "/parse",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { filename, options = {} } = reqBody(request);
    if (options && options.absolutePath) delete options.absolutePath;
    try {
      const targetFilename = path
        .normalize(filename)
        .replace(/^(\.\.(\/|\\|$))+/, "");
      const {
        success,
        reason,
        documents = [],
      } = await processSingleFile(targetFilename, {
        ...options,
        parseOnly: true,
      });
      response
        .status(200)
        .json({ filename: targetFilename, success, reason, documents });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        filename: filename,
        success: false,
        reason: "A processing error occurred.",
        documents: [],
      });
    }
    return;
  }
);

app.post(
  "/process-link",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { link, scraperHeaders = {}, metadata = {} } = reqBody(request);
    try {
      const {
        success,
        reason,
        documents = [],
      } = await processLink(link, scraperHeaders, metadata);
      response.status(200).json({ url: link, success, reason, documents });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        url: link,
        success: false,
        reason: "A processing error occurred.",
        documents: [],
      });
    }
    return;
  }
);

app.post(
  "/util/get-link",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { link, captureAs = "text" } = reqBody(request);
    try {
      const { success, content = null } = await getLinkText(link, captureAs);
      response.status(200).json({ url: link, success, content });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        url: link,
        success: false,
        content: null,
      });
    }
    return;
  }
);

app.post(
  "/util/convert-audio-to-wav",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { filename } = reqBody(request);
    try {
      const {
        success,
        reason,
        wavFilename = null,
      } = await convertAudioToWav(filename);
      response.status(200).json({ filename, success, reason, wavFilename });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        filename,
        success: false,
        reason: "An audio conversion error occurred.",
        wavFilename: null,
      });
    }
    return;
  }
);

app.post(
  "/process-raw-text",
  [verifyPayloadIntegrity],
  async function (request, response) {
    const { textContent, metadata = {} } = reqBody(request);
    try {
      const {
        success,
        reason,
        documents = [],
      } = await processRawText(textContent, metadata);
      response
        .status(200)
        .json({ filename: metadata.title, success, reason, documents });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      response.status(200).json({
        filename: metadata?.title || "Unknown-doc.txt",
        success: false,
        reason: "A processing error occurred.",
        documents: [],
      });
    }
    return;
  }
);

extensions(app);

app.get("/accepts", function (_, response) {
  response.status(200).json(ACCEPTED_MIMES);
});

app.get("/health", function (_, response) {
  response.status(200).json({ status: "ok", port: COLLECTOR_PORT });
});

app.all("{*path}", function (_, response) {
  response.sendStatus(200);
});

const server = app
  .listen(COLLECTOR_PORT, async () => {
    await wipeCollectorStorage();
    // eslint-disable-next-line no-console
    console.log(`Document processor app listening on port ${COLLECTOR_PORT}`);
  })
  .on("error", function (err) {
    // eslint-disable-next-line no-console
    console.error("Failed to start collector server:", err.message);
    process.exit(1);
  });

function gracefulShutdown(signal) {
  // eslint-disable-next-line no-console
  console.log(`[collector] Received ${signal}, shutting down gracefully…`);
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log("[collector] HTTP server closed. Exiting.");
    process.exit(0);
  });
  setTimeout(() => {
    // eslint-disable-next-line no-console
    console.warn("[collector] Forced shutdown after 10s timeout.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
