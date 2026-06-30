// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { Telemetry } = require("../../models/telemetry");
const { BackgroundService } = require("../BackgroundWorkers");
const { EncryptionManager } = require("../EncryptionManager");
const { CommunicationKey } = require("../comKey");
const setupTelemetry = require("../telemetry");
const eagerLoadContextWindows = require("./eagerLoadContextWindows");
const markOnboarded = require("./markOnboarded");
const ensureLLMProvider = require("./ensureLLMProvider");

// Testing SSL? You can make a self signed certificate and point the ENVs to that location
// make a directory in server called 'sslcert' - cd into it
// - openssl genrsa -aes256 -passout pass:gsahdg -out server.pass.key 4096
// - openssl rsa -passin pass:gsahdg -in server.pass.key -out server.key
// - rm server.pass.key
// - openssl req -new -key server.key -out server.csr
// Update .env keys with the correct values and boot. These are temporary and not real SSL certs - only use for local.
// Test with https://localhost:3001/api/ping
// build and copy frontend to server/public with correct API_BASE and start server in prod model and all should be ok
function bootSSL(app, port = 3001, onReady) {
  try {
    consoleLogger.log(
      `\x1b[33m[SSL BOOT ENABLED]\x1b[0m Loading the certificate and key for HTTPS mode...`,
    );
    const fs = require("fs");
    const https = require("https");
    if (!process.env.HTTPS_KEY_PATH || !process.env.HTTPS_CERT_PATH) {
      throw new Error(
        "ENABLE_HTTPS=true but HTTPS_KEY_PATH and/or HTTPS_CERT_PATH is not set.",
      );
    }
    const privateKey = fs.readFileSync(process.env.HTTPS_KEY_PATH);
    const certificate = fs.readFileSync(process.env.HTTPS_CERT_PATH);
    const credentials = { key: privateKey, cert: certificate };
    const server = https.createServer(credentials, app);

    server
      .listen(port, () => {
        (async () => {
          try {
            await markOnboarded();
            await ensureLLMProvider();
            await setupTelemetry();
            new CommunicationKey(true);
            new EncryptionManager();
            new BackgroundService().boot();
            await eagerLoadContextWindows();
            if (onReady) await onReady();
          } catch (e) {
            consoleLogger.error(
              `\x1b[31m[BOOT INIT ERROR]\x1b[0m ${e.message}`,
              { stacktrace: e.stack },
            );
          }

          consoleLogger.log(
            `Primary server in HTTPS mode listening on port ${port}`,
          );
        })();
      })
      .on("error", handleServerError);

    require("@mintplex-labs/express-ws").default(app, server);
    registerSignalHandlers();
    return { app, server };
  } catch (e) {
    consoleLogger.error(
      `\x1b[31m[SSL BOOT FAILED]\x1b[0m ${e.message} - falling back to HTTP boot.`,
      {
        ENABLE_HTTPS: process.env.ENABLE_HTTPS,
        HTTPS_KEY_PATH: process.env.HTTPS_KEY_PATH,
        HTTPS_CERT_PATH: process.env.HTTPS_CERT_PATH,
        stacktrace: e.stack,
      },
    );
    return bootHTTP(app, port, onReady);
  }
}

function bootHTTP(app, port = 3001, onReady) {
  if (!app) throw new Error('No "app" defined - crashing!');

  const server = app
    .listen(port, () => {
      (async () => {
        try {
          await markOnboarded();
          await ensureLLMProvider();
          await setupTelemetry();
          new CommunicationKey(true);
          new EncryptionManager();
          new BackgroundService().boot();
          await eagerLoadContextWindows();
          if (onReady) await onReady();
        } catch (e) {
          consoleLogger.error(`\x1b[31m[BOOT INIT ERROR]\x1b[0m ${e.message}`, {
            stacktrace: e.stack,
          });
        }

        consoleLogger.log(
          `Primary server in HTTP mode listening on port ${port}`,
        );
      })();
    })
    .on("error", handleServerError);

  require("@mintplex-labs/express-ws").default(app, server);

  registerSignalHandlers();
  return { app, server };
}

function registerSignalHandlers() {
  process.once("SIGUSR2", async function () {
    try {
      await Telemetry.flush();
    } catch {
      /* telemetry flush failure is non-fatal during restart */
    }
    process.kill(process.pid, "SIGUSR2");
  });
}

function handleServerError(error) {
  consoleLogger.error(
    `\x1b[31m[SERVER ERROR]\x1b[0m ${error?.message || "Unknown error"}`,
    error,
  );
  process.exit(1);
}

module.exports = {
  bootHTTP,
  bootSSL,
};
