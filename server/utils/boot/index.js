// SPDX-License-Identifier: MIT
const { Telemetry } = require("../../models/telemetry");
const { BackgroundService } = require("../BackgroundWorkers");
const { EncryptionManager } = require("../EncryptionManager");
const { CommunicationKey } = require("../comKey");
const setupTelemetry = require("../telemetry");
const eagerLoadContextWindows = require("./eagerLoadContextWindows");
const markOnboarded = require("./markOnboarded");

// Testing SSL? You can make a self signed certificate and point the ENVs to that location
// make a directory in server called 'sslcert' - cd into it
// - openssl genrsa -aes256 -passout pass:gsahdg -out server.pass.key 4096
// - openssl rsa -passin pass:gsahdg -in server.pass.key -out server.key
// - rm server.pass.key
// - openssl req -new -key server.key -out server.csr
// Update .env keys with the correct values and boot. These are temporary and not real SSL certs - only use for local.
// Test with https://localhost:3001/api/ping
// build and copy frontend to server/public with correct API_BASE and start server in prod model and all should be ok
function bootSSL(app, port = 3001) {
  try {
    // eslint-disable-next-line no-console
    console.log(
      `\x1b[33m[SSL BOOT ENABLED]\x1b[0m Loading the certificate and key for HTTPS mode...`,
    );
    const fs = require("fs");
    const https = require("https");
    const privateKey = fs.readFileSync(process.env.HTTPS_KEY_PATH);
    const certificate = fs.readFileSync(process.env.HTTPS_CERT_PATH);
    const credentials = { key: privateKey, cert: certificate };
    const server = https.createServer(credentials, app);

    server
      .listen(port, async () => {
        await markOnboarded();
        await setupTelemetry();
        new CommunicationKey(true);
        new EncryptionManager();
        new BackgroundService().boot();
        await eagerLoadContextWindows();
        registerSignalHandlers(server);
        // eslint-disable-next-line no-console
        console.log(`Primary server in HTTPS mode listening on port ${port}`);
      })
      .on("error", handleServerError);

    require("@mintplex-labs/express-ws").default(app, server);
    return { app, server };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `\x1b[31m[SSL BOOT FAILED]\x1b[0m ${e.message} - falling back to HTTP boot.`,
      {
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,
        HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
        stacktrace: e.stack,
      },
    );
    return bootHTTP(app, port);
  }
}

function bootHTTP(app, port = 3001) {
  if (!app) throw new Error('No "app" defined - crashing!');

  const server = app
    .listen(port, async () => {
      await markOnboarded();
      await setupTelemetry();
      new CommunicationKey(true);
      new EncryptionManager();
      new BackgroundService().boot();
      await eagerLoadContextWindows();
      registerSignalHandlers(server);
      // eslint-disable-next-line no-console
      console.log(`Primary server in HTTP mode listening on port ${port}`);
    })
    .on("error", handleServerError);

  return { app, server };
}

function registerSignalHandlers(server) {
  function gracefulShutdown(signal) {
    console.log(`[boot] ${signal} received, closing HTTP server...`);
    if (server && typeof server.close === "function") {
      server.close(() => {
        Telemetry.flush();
        process.exit(0);
      });
      // Force-exit after 10s if connections hang
      setTimeout(() => {
        console.warn("[boot] Graceful shutdown timeout, forcing exit.");
        process.exit(1);
      }, 10000).unref();
    } else {
      Telemetry.flush();
      process.exit(0);
    }
  }

  process.once("SIGUSR2", function () {
    Telemetry.flush();
    process.kill(process.pid, "SIGUSR2");
  });
  process.on("SIGINT", function () {
    gracefulShutdown("SIGINT");
  });
  process.on("SIGTERM", function () {
    gracefulShutdown("SIGTERM");
  });
}

function handleServerError(error) {
  // eslint-disable-next-line no-console
  console.error(
    `\x1b[31m[SERVER ERROR]\x1b[0m ${error?.message || "Unknown error"}`,
    error,
  );
  process.exit(1);
}

module.exports = {
  bootHTTP,
  bootSSL,
};
