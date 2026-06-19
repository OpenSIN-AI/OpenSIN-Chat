// SPDX-License-Identifier: MIT
// Purpose: Production entry point for the server.
// Docs: server/index.js
// The Express application is built by server/app.js; this file only adds
// production lifecycle steps (PDF job resumption, background queue, graceful
// shutdown) and boots the HTTP/HTTPS server.

const { buildApp, bootApp } = require("./app");
const BackgroundQueue = require("./utils/backgroundJobs/queue");

// Resume interrupted PDF analysis, cross-check, and corpus jobs after a restart.
const { PdfAnalysisPipeline } = require("./utils/pdfAnalysis");
PdfAnalysisPipeline.resumeInterrupted();

const { CrossCheckPipeline } = require("./utils/pdfAnalysis/crossCheck");
CrossCheckPipeline.restorePersisted(PdfAnalysisPipeline.factStore);

require("./utils/pdfAnalysis/corpus").CorpusPipeline.restorePersisted();

// Memory hygiene runs on boot and every 1 hour (stuck-job detection, orphan
// detection, stale-job cleanup, upload/checkpoint/report retention).
const { startRetentionSchedule, stopRetentionSchedule } = require("./utils/pdfAnalysis/retention");
startRetentionSchedule();

// Terminate OCR workers cleanly on process exit.
const { shutdownOcr } = require("./utils/pdfAnalysis/ocr");
process.on("beforeExit", () => {
  shutdownOcr();
});

const app = buildApp();

// Start the HTTP/HTTPS server and boot background services.
// The returned `server` object is used for graceful shutdown.
const { server: httpServer } = bootApp(app, process.env.SERVER_PORT || 3001);

// Start persistent background queue after all endpoints are registered so
// request handlers can add jobs immediately.
BackgroundQueue.start();

// Graceful shutdown: stop the queue and close the HTTP server before exiting
// so no job is interrupted mid-write (SQLite transactions would catch this,
// but consistency is safer) and in-progress HTTP requests can finish.
function shutdown(signal) {
  console.log(`[Server] ${signal} received, shutting down...`);
  BackgroundQueue.stop();
  stopRetentionSchedule();
  shutdownOcr();
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
