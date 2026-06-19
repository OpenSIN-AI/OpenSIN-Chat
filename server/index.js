// SPDX-License-Identifier: MIT
// Purpose: Production entry point for the server.
// Docs: server/index.js
// The Express application is built by server/app.js; this file only adds
// production lifecycle steps (PDF job resumption, background queue, graceful
// shutdown) and boots the HTTP/HTTPS server.

const { buildApp, bootApp } = require("./app");
const BackgroundQueue = require("./utils/backgroundJobs/queue");
const { Telemetry } = require("./models/telemetry");

// Resume interrupted PDF analysis, cross-check, and corpus jobs after a restart.
// Fire-and-forget with error catch — failures here must not prevent server boot.
(async () => {
  try {
    const { PdfAnalysisPipeline } = require("./utils/pdfAnalysis");
    const { CrossCheckPipeline } = require("./utils/pdfAnalysis/crossCheck");
    const { CorpusPipeline } = require("./utils/pdfAnalysis/corpus");

    await Promise.all([
      Promise.resolve(PdfAnalysisPipeline.resumeInterrupted()),
      Promise.resolve(CorpusPipeline.restorePersisted()),
    ]);
    await Promise.resolve(
      CrossCheckPipeline.restorePersisted(PdfAnalysisPipeline.factStore),
    );
  } catch (err) {
    console.error("[Server] PDF job resumption failed:", err?.message || err);
  }
})();

// Memory hygiene runs on boot and every 1 hour (stuck-job detection, orphan
// detection, stale-job cleanup, upload/checkpoint/report retention).
const {
  startRetentionSchedule,
  stopRetentionSchedule,
} = require("./utils/pdfAnalysis/retention");
startRetentionSchedule();

const { shutdownOcr } = require("./utils/pdfAnalysis/ocr");

let prismaClient = null;
try {
  prismaClient = require("./utils/prisma");
} catch {
  prismaClient = null;
}

const app = buildApp();

// Start the HTTP/HTTPS server and boot background services.
// The returned `server` object is used for graceful shutdown.
// BackgroundQueue.start() is deferred to onReady so it only begins polling
// AFTER the server's listen callback completes (encryption, telemetry, etc.).
const { server: httpServer } = bootApp(
  app,
  process.env.SERVER_PORT || 3001,
  () => {
    BackgroundQueue.start();
  },
);

// Graceful shutdown: stop the queue and close the HTTP server before exiting
// so no job is interrupted mid-write (SQLite transactions would catch this,
// but consistency is safer) and in-progress HTTP requests can finish.
async function shutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down...`);
  BackgroundQueue.stop();
  stopRetentionSchedule();
  await shutdownOcr();
  try {
    await Telemetry.flush();
  } catch {
    /* telemetry flush failure is non-fatal during shutdown */
  }
  if (prismaClient) {
    try {
      await prismaClient.$disconnect();
    } catch {
      /* DB disconnect failure is non-fatal during shutdown */
    }
  }
  if (httpServer && typeof httpServer.close === "function") {
    httpServer.close(() => {
      console.log("[Server] HTTP server closed, exiting.");
      process.exit(0);
    });
    // Force-exit after 10s if connections hang
    setTimeout(() => {
      console.warn("[Server] Graceful shutdown timeout, forcing exit.");
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGHUP", () => shutdown("SIGHUP"));
