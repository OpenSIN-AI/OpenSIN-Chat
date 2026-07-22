// SPDX-License-Identifier: MIT
// Purpose: Production entry point for the server.
// Docs: server/index.js
// The Express application is built by server/app.js; this file only adds
// production lifecycle steps (PDF job resumption, background queue, graceful
// shutdown) and boots the HTTP/HTTPS server.

const { buildApp, bootApp } = require("./app");
const BackgroundQueue = require("./utils/backgroundJobs/queue");
const { Telemetry } = require("./models/telemetry");
const { execSync } = require("child_process");

if (!process.env.APP_VERSION) {
  try {
    process.env.APP_VERSION = execSync("git describe --tags --always", {
      encoding: "utf8",
    }).trim();
  } catch {
    /* no git available — APP_VERSION stays undefined */
  }
}
if (!process.env.GIT_SHA) {
  try {
    process.env.GIT_SHA = execSync("git rev-parse HEAD", {
      encoding: "utf8",
    }).trim();
  } catch {
    /* no git available — GIT_SHA stays undefined */
  }
}

// Resume interrupted PDF analysis, cross-check, and corpus jobs after a restart.
// Also recover stalled parse_jobs rows so the frontend never polls forever.
// Fire-and-forget with error catch — failures here must not prevent server boot.
(async () => {
  try {
    const { PdfAnalysisPipeline } = require("./utils/pdfAnalysis");
    const { CrossCheckPipeline } = require("./utils/pdfAnalysis/crossCheck");
    const { CorpusPipeline } = require("./utils/pdfAnalysis/corpus");
    const { recoverStalledJobs } = require("./utils/parseJobs");

    await Promise.all([
      Promise.resolve(PdfAnalysisPipeline.resumeInterrupted()),
      Promise.resolve(CorpusPipeline.restorePersisted()),
      recoverStalledJobs(),
    ]);
    await Promise.resolve(
      CrossCheckPipeline.restorePersisted(PdfAnalysisPipeline.factStore),
    );
  } catch (err) {
    console.error("[Server] Job resumption failed:", err?.message || err);
  }
})();

// Memory hygiene runs on boot and every 1 hour (stuck-job detection, orphan
// detection, stale-job cleanup, upload/checkpoint/report retention).
const {
  startRetentionSchedule,
  stopRetentionSchedule,
} = require("./utils/pdfAnalysis/retention");
try {
  startRetentionSchedule();
} catch (e) {
  console.error(
    "[Server] Retention schedule failed to start:",
    e?.message || e,
  );
}

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

// Graceful shutdown: stop background work, release external resources, then
// close the listener. Every cleanup step is isolated so one failure cannot
// prevent the remaining resources from being released.
let shuttingDown = false;

async function runShutdownStep(name, fn) {
  try {
    await Promise.resolve().then(fn);
  } catch (error) {
    console.error(
      `[Server] Shutdown step "${name}" failed:`,
      error?.message || error,
    );
  }
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Server] ${signal} received, shutting down...`);

  const forceExitTimer = setTimeout(() => {
    console.warn("[Server] Graceful shutdown timeout, forcing exit.");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  let finalExitCode = exitCode;
  let closeHttpServer = Promise.resolve();
  if (httpServer && typeof httpServer.close === "function") {
    closeHttpServer = new Promise((resolve) => {
      try {
        httpServer.close((error) => {
          if (error) {
            console.error("[Server] HTTP server close failed:", error);
            finalExitCode = 1;
          } else {
            console.log("[Server] HTTP server closed.");
          }
          resolve();
        });
      } catch (error) {
        console.error("[Server] HTTP server close failed:", error);
        finalExitCode = 1;
        resolve();
      }
    });
  }

  // Stop producers immediately while existing HTTP requests finish with their
  // database/OCR dependencies still available.
  await runShutdownStep("background queue", () => BackgroundQueue.stop());
  await runShutdownStep("retention schedule", () => stopRetentionSchedule());
  await closeHttpServer;

  // No request can still be using these resources after server.close resolves.
  await runShutdownStep("OCR workers", () => shutdownOcr());
  await runShutdownStep("telemetry flush", () => Telemetry.flush());
  if (prismaClient) {
    await runShutdownStep("database disconnect", () =>
      prismaClient.$disconnect(),
    );
  }

  clearTimeout(forceExitTimer);
  process.exit(finalExitCode);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGHUP", () => void shutdown("SIGHUP"));
process.on("unhandledRejection", (reason) => {
  console.error("[FATAL] Unhandled rejection:", reason);
  void shutdown("unhandledRejection", 1);
});
process.on("uncaughtException", (error) => {
  console.error("[FATAL] Uncaught exception:", error);
  void shutdown("uncaughtException", 1);
});
