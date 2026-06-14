// SPDX-License-Identifier: MIT
// Purpose: Test system endpoints (ping, onboarding, multi-user mode, etc.)
// Docs: tests/system.test.js

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../server/app";

vi.mock("../server/utils/helpers", () => ({
  getVectorDbClass: () => ({ namespaceCount: vi.fn(() => Promise.resolve(0)), totalVectors: vi.fn(() => Promise.resolve(0)) }),
}));

vi.mock("../server/utils/helpers/customModels", () => ({
  getCustomModels: () => ({ models: [], error: null }),
}));

vi.mock("../server/models/systemSettings", () => ({
  SystemSettings: {
    isOnboardingComplete: vi.fn(() => Promise.resolve(false)),
    markOnboardingComplete: vi.fn(() => Promise.resolve()),
    currentSettings: vi.fn(() => Promise.resolve({})),
    _updateSettings: vi.fn(() => Promise.resolve()),
    isMultiUserMode: vi.fn(() => Promise.resolve(false)),
    currentLogoFilename: vi.fn(() => Promise.resolve(null)),
    get: vi.fn(() => Promise.resolve(null)),
  },
  saneDefaultSystemPrompt: "You are a helpful assistant.",
}));

vi.mock("../server/models/user", () => ({
  User: {
    _get: vi.fn(() => Promise.resolve(null)),
    create: vi.fn(() => Promise.resolve({ id: 1, username: "test", password: "test" })),
    delete: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve({ success: true, error: null })),
    filterFields: vi.fn((user) => user),
  },
}));

vi.mock("../server/models/apiKeys", () => ({
  ApiKey: {
    where: vi.fn(() => Promise.resolve([])),
    create: vi.fn(() => Promise.resolve({ id: 1, name: "test" })),
    delete: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: {
    logEvent: vi.fn(() => Promise.resolve()),
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    delete: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: {
    sendTelemetry: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/utils/helpers/updateENV", () => ({
  updateENV: () => ({ newValues: {}, error: null }),
}));

vi.mock("../server/utils/PasswordRecovery", () => ({
  recoverAccount: () => ({ success: true, resetToken: "token", error: null }),
  resetPassword: () => ({ success: true, message: "Password reset", error: null }),
  generateRecoveryCodes: () => Promise.resolve(["code1", "code2"]),
}));

vi.mock("../server/utils/EncryptionManager", () => ({
  EncryptionManager: () => ({ encrypt: (data) => `encrypted_${data}` }),
}));

vi.mock("../server/utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (req, res, next) => next(),
  strictMultiUserRoleValid: () => (req, res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", all: "all" },
  isMultiUserSetup: () => true,
}));



vi.mock("../server/utils/files/logo", () => ({
  getDefaultFilename: () => "logo.png",
  determineLogoFilepath: () => "/tmp/logo.png",
  fetchLogo: () => ({ found: true, buffer: "base64", size: 100, mime: "image/png" }),
  validFilename: () => true,
  renameLogoFile: () => Promise.resolve("logo.png"),
  removeCustomLogo: () => Promise.resolve(),
  LOGO_FILENAME: "logo.png",
  isDefaultFilename: () => true,
}));

vi.mock("../server/utils/files", () => ({
  viewLocalFiles: () => Promise.resolve([]),
  normalizePath: (path) => path,
  isWithin: () => true,
}));

vi.mock("../server/utils/files/purgeDocument", () => ({
  purgeDocument: () => Promise.resolve(),
  purgeFolder: () => Promise.resolve(),
}));

vi.mock("../server/utils/files/multer", () => ({
  handleAssetUpload: () => (req, res, next) => next(),
  handlePfpUpload: () => (req, res, next) => next(),
  handleAudioUpload: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/middleware/simpleSSOEnabled", () => ({
  simpleSSOEnabled: () => true,
  simpleSSOLoginDisabled: () => false,
}));

vi.mock("../server/utils/middleware/requireAuthWhenOnboardingComplete", () => ({
  requireAuthWhenOnboardingComplete: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
}));

vi.mock("../server/models/workspaceChats", () => ({
  WorkspaceChats: {
    whereWithData: () => Promise.resolve([]),
    count: () => Promise.resolve(0),
    delete: () => Promise.resolve(),
  },
}));

vi.mock("../server/models/slashCommandsPresets", () => ({
  SlashCommandPresets: {
    getUserPresets: () => Promise.resolve([]),
    create: () => Promise.resolve({ id: 1, command: "test" }),
    get: () => Promise.resolve({ id: 1, command: "test" }),
    update: () => Promise.resolve({ id: 1, command: "test" }),
    delete: () => Promise.resolve(),
    formatCommand: (command) => command,
  },
}));

vi.mock("../server/models/systemPromptVariables", () => ({
  SystemPromptVariables: {
    getAll: () => Promise.resolve([]),
    create: () => Promise.resolve({ id: 1, key: "test" }),
    update: () => Promise.resolve({ id: 1, key: "test" }),
    delete: () => Promise.resolve(),
  },
}));

vi.mock("../server/utils/SpeechToText", () => ({
  getSTTProvider: () => ({ transcribe: () => Promise.resolve("transcribed text") }),
}));

vi.mock("../utils/agents/aibitat/plugins/sql-agent/SQLConnectors", () => ({
  validateConnection: () => ({ success: true }),
}));

let app;

beforeEach(async () => {
  vi.clearAllMocks();
  app = createApp();
});

const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.text();
  const contentType = response.headers.get("content-type") || "";
  let parsedBody = null;
  if (data && contentType.includes("application/json")) {
    try {
      parsedBody = JSON.parse(data);
    } catch {
      parsedBody = null;
    }
  }
  return {
    status: response.status,
    headers: response.headers,
    body: parsedBody,
    text: data,
  };
};

describe("system endpoints", () => {
  describe("GET /ping", () => {
    it("should return ping status", async () => {
      const response = await request("GET", "/ping");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("online", true);
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("commit");
      expect(response.body).toHaveProperty("uptimeSeconds");
    });
  });

  describe("GET /onboarding", () => {
    it("should return onboarding status", async () => {
      const response = await request("GET", "/onboarding");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("onboardingComplete");
      expect(typeof response.body.onboardingComplete).toBe("boolean");
    });
  });

  describe("POST /onboarding", () => {
    it("should mark onboarding complete", async () => {
      const response = await request("POST", "/onboarding", {});
      expect(response.status).toBe(200);
    });
  });

  describe("GET /setup-complete", () => {
    it("should return setup complete status", async () => {
      const response = await request("GET", "/setup-complete");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("results");
    });
  });

  describe("GET /system/check-token", () => {
    it("should return token check status", async () => {
      const response = await request("GET", "/system/check-token");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /system/refresh-user", () => {
    it("should refresh user session", async () => {
      const response = await request("GET", "/system/refresh-user");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("user");
    });
  });

  describe("POST /request-token", () => {
    it("should request authentication token", async () => {
      const response = await request("POST", "/request-token", {
        username: "test",
        password: "test",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("valid", true);
      expect(response.body).toHaveProperty("token");
    });
  });

  describe("GET /system/multi-user-mode", () => {
    it("should return multi-user mode status", async () => {
      const response = await request("GET", "/system/multi-user-mode");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("multiUserMode", false);
    });
  });

  describe("GET /system/logo", () => {
    it("should return logo", async () => {
      const response = await request("GET", "/system/logo");
      expect(response.status).toBe(200);
      expect(response.text.length).toBeGreaterThan(0);
    });
  });

  describe("GET /system/api-keys", () => {
    it("should return API keys", async () => {
      const response = await request("GET", "/system/api-keys");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("apiKeys");
    });
  });

  describe("POST /system/generate-api-key", () => {
    it("should generate API key", async () => {
      const response = await request("POST", "/system/generate-api-key", {
        name: "test-key",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("apiKey");
    });
  });

  describe("DELETE /system/api-key/:id", () => {
    it("should delete API key", async () => {
      const response = await request("DELETE", "/system/api-key/1");
      expect(response.status).toBe(200);
    });
  });

  describe("GET /system/system-vectors", () => {
    it("should return vector count", async () => {
      const response = await request("GET", "/system/system-vectors");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("vectorCount", 0);
    });
  });

  describe("POST /system/recover-account", () => {
    // TODO: requires multi-user mode; endpoint rejects requests in single-user mode
    it.skip("should recover account", async () => {
      const response = await request("POST", "/system/recover-account", {
        username: "test",
        recoveryCodes: ["code1"],
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /system/reset-password", () => {
    // TODO: requires multi-user mode; endpoint rejects requests in single-user mode
    it.skip("should reset password", async () => {
      const response = await request("POST", "/system/reset-password", {
        token: "token",
        newPassword: "newPassword",
        confirmPassword: "newPassword",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /system/prompt-variables", () => {
    it("should return prompt variables", async () => {
      const response = await request("GET", "/system/prompt-variables");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("variables");
    });
  });

  describe("POST /system/prompt-variables", () => {
    it("should create prompt variable", async () => {
      const key = `test_key_${Date.now()}`;
      const response = await request("POST", "/system/prompt-variables", {
        key,
        value: "test_value",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("variable");
      expect(response.body.variable).toHaveProperty("key", key);
    });
  });
});
