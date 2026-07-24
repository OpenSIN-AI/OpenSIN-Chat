// SPDX-License-Identifier: MIT
// Purpose: Project adapter for the shared SIN-Gmail Himalaya runtime.

const os = require("node:os");
const path = require("node:path");
const consoleLogger = require("../../../../logger/console.js");
const { SystemSettings } = require("../../../../../models/systemSettings");
const { safeJsonParse } = require("../../../../http");

const runtimePath = path.resolve(
  String(
    process.env.SIN_GMAIL_RUNTIME_PATH ||
      path.join(
        os.homedir(),
        "dev",
        "wow-my-zsh",
        "shared",
        "skills",
        "sin-gmail",
        "runtime",
        "himalaya-adapter.js",
      ),
  ).replace(/^~(?=$|\/)/, os.homedir()),
);

function unavailableRuntime(error) {
  const message =
    `SIN-Gmail runtime is unavailable. Set SIN_GMAIL_RUNTIME_PATH or restore ${runtimePath}. ` +
    String(error?.message || error || "");
  const failure = async () => ({ success: false, error: message });

  class UnavailableHimalayaBridge {
    static async getConfig() {
      return {
        provider: "himalaya",
        configPath: process.env.HIMALAYA_CONFIG || "",
        binary: null,
        binaryAvailable: false,
        version: null,
        runtimeError: message,
        accounts: [],
        groups: [],
        defaultAccountId: "",
      };
    }

    static async updateConfig() {
      return failure();
    }

    static async isToolAvailable() {
      return false;
    }

    reset() {}

    async initialize() {
      return failure();
    }

    async isAvailable() {
      return false;
    }

    constructor() {
      return new Proxy(this, {
        get(target, property) {
          if (property in target) return target[property];
          return failure;
        },
      });
    }
  }

  return {
    HimalayaBridge: UnavailableHimalayaBridge,
    configuredAccounts: () => [],
    runtimeStatus: async () => ({
      binary: null,
      version: null,
      major: null,
      error: message,
    }),
    parseHimalayaAccounts: () => [],
    parseGmailQuery: () => ({}),
    encodeRef: (value) => String(value?.id || ""),
    decodeRef: (value, account, mailbox = "INBOX") => ({
      account,
      mailbox,
      id: String(value || ""),
    }),
    buildMimeMessage: () => {
      throw new Error(message);
    },
  };
}

let runtime;
try {
  runtime = require(runtimePath);
  runtime.configure({ consoleLogger, SystemSettings, safeJsonParse });
} catch (error) {
  consoleLogger.error(
    `[sin-gmail] Shared runtime could not be loaded from ${runtimePath}:`,
    error.message,
  );
  runtime = unavailableRuntime(error);
}

module.exports = runtime;
