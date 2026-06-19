// SPDX-License-Identifier: MIT
jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(), info: jest.fn(), warn: jest.fn(),
}));
const mockUserFromSession = jest.fn();
const mockMultiUserMode = jest.fn();
const mockMakeJWT = jest.fn();
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  userFromSession: (...a) => mockUserFromSession(...a),
  multiUserMode: (...a) => mockMultiUserMode(...a),
  makeJWT: (...a) => mockMakeJWT(...a),
  queryParams: (req) => req.query,
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
  invalidateAuthTokenHash: jest.fn(),
}));
const mockFlexUserRoleValid = jest.fn(() => (_req, _res, next) => next());
const mockIsMultiUserSetup = jest.fn(() => (_req, _res, next) => next());
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: (...a) => mockFlexUserRoleValid(...a),
  ROLES: { admin: "admin", manager: "manager", default: "default", all: "<all>" },
  isMultiUserSetup: (...a) => mockIsMultiUserSetup(...a),
}));
const mockSimpleSSOEnabled = jest.fn(() => (_req, _res, next) => next());
jest.mock("../../utils/middleware/simpleSSOEnabled", () => ({
  simpleSSOEnabled: (...a) => mockSimpleSSOEnabled(...a),
  simpleSSOLoginDisabled: jest.fn(() => false),
}));
jest.mock("../../utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: (_req, _res, next) => next(),
}));
jest.mock("../../utils/helpers", () => ({
  getVectorDbClass: jest.fn(),
}));
jest.mock("dotenv", () => ({ config: jest.fn() }));
jest.mock("../../utils/collectorApi", () => ({
  CollectorApi: jest.fn().mockImplementation(() => ({
    online: jest.fn(),
    acceptedFileTypes: jest.fn(),
  })),
}));
jest.mock("../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn((v) => "enc(" + v + ")"),
  })),
}));
jest.mock("bcryptjs", () => ({
  compareSync: jest.fn(),
  hashSync: jest.fn((v) => "hashed_" + v),
}));
jest.mock("uuid", () => ({ v4: jest.fn(() => "uuid-mock") }));
jest.mock("fs", () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../../utils/files/multer", () => ({
  handleAssetUpload: (_req, _res, next) => next(),
  handlePfpUpload: (_req, _res, next) => next(),
  handleAudioUpload: (_req, _res, next) => next(),
}));
jest.mock("../../utils/helpers/updateENV", () => ({
  updateENV: jest.fn(),
  dumpENV: jest.fn(),
}));
jest.mock("../../utils/helpers/customModels", () => ({
  getCustomModels: jest.fn(),
}));
jest.mock("../../utils/helpers/chat/convertTo", () => ({
  exportChatsAsType: jest.fn(),
}));
jest.mock("../../utils/files", () => ({
  viewLocalFiles: jest.fn(),
  normalizePath: jest.fn((p) => p),
  isWithin: jest.fn(() => true),
}));
jest.mock("../../utils/files/purgeDocument", () => ({
  purgeDocument: jest.fn(),
  purgeFolder: jest.fn(),
}));
jest.mock("../../utils/files/logo", () => ({
  getDefaultFilename: jest.fn((darkMode = true) =>
    darkMode ? "openafd-logo-dark.png" : "openafd-logo.png",
  ),
  determineLogoFilepath: jest.fn(),
  fetchLogo: jest.fn(),
  validFilename: jest.fn(() => true),
  renameLogoFile: jest.fn(),
  removeCustomLogo: jest.fn(),
  LOGO_FILENAME: "openafd-logo.png",
  LOGO_FILENAME_DARK: "openafd-logo-dark.png",
  isDefaultFilename: jest.fn((filename) =>
    ["openafd-logo.png", "openafd-logo-dark.png", "anythingllm-logo.png", "anythingllm-logo-dark.png"].includes(filename),
  ),
}));
jest.mock("../../utils/files/pfp", () => ({
  fetchPfp: jest.fn(),
  determinePfpFilepath: jest.fn(),
}));
jest.mock("../../utils/PasswordRecovery", () => ({
  recoverAccount: jest.fn(),
  resetPassword: jest.fn(),
  generateRecoveryCodes: jest.fn(),
}));
jest.mock("../../utils/chats", () => ({
  VALID_COMMANDS: { "/reset": jest.fn() },
}));
jest.mock("../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors", () => ({
  validateConnection: jest.fn(),
}));
jest.mock("../../utils/SpeechToText", () => ({
  getSTTProvider: jest.fn(),
}));
jest.mock("../../models/systemSettings", () => ({
  SystemSettings: {
    get: jest.fn(), currentSettings: jest.fn(), isMultiUserMode: jest.fn(),
    isOnboardingComplete: jest.fn(), markOnboardingComplete: jest.fn(),
    currentLogoFilename: jest.fn(), _updateSettings: jest.fn(),
    updateSettings: jest.fn(), saneDefaultSystemPrompt: "You are a helpful assistant.",
    publicFields: ["footer_data","support_email","custom_app_name"],
  },
}));
jest.mock("../../models/user", () => ({
  User: {
    _get: jest.fn(), create: jest.fn(), get: jest.fn(), update: jest.fn(),
    delete: jest.fn(), filterFields: jest.fn((u) => u),
    checkPasswordComplexity: jest.fn(() => ({ checkedOK: true, error: null })),
    validations: { username: jest.fn((v) => v) },
  },
}));
jest.mock("../../models/telemetry", () => ({ Telemetry: { sendTelemetry: jest.fn() } }));
jest.mock("../../models/apiKeys", () => ({ ApiKey: { where: jest.fn(), create: jest.fn(), delete: jest.fn() } }));
jest.mock("../../models/workspaceChats", () => ({
  WorkspaceChats: { whereWithData: jest.fn(), count: jest.fn(), delete: jest.fn(), migrateToMultiUser: jest.fn() },
}));
jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn(), whereWithData: jest.fn(), count: jest.fn(), delete: jest.fn() },
}));
jest.mock("../../models/slashCommandsPresets", () => ({
  SlashCommandPresets: { getUserPresets: jest.fn(), formatCommand: jest.fn((c) => c),
    create: jest.fn(), update: jest.fn(), delete: jest.fn(), get: jest.fn(), migrateToMultiUser: jest.fn() },
}));
jest.mock("../../models/systemPromptVariables", () => ({
  SystemPromptVariables: { getAll: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
}));
jest.mock("../../models/browserExtensionApiKey", () => ({ BrowserExtensionApiKey: { migrateApiKeysToMultiUser: jest.fn() } }));
jest.mock("../../models/mobileDevice", () => ({ MobileDevice: { migrateDevicesToMultiUser: jest.fn() } }));
jest.mock("../../models/memory", () => ({ Memory: { migrateToMultiUser: jest.fn() } }));
jest.mock("../../models/agentSkillWhitelist", () => ({ AgentSkillWhitelist: { clearSingleUserWhitelist: jest.fn() } }));
jest.mock("../../models/temporaryAuthToken", () => ({ TemporaryAuthToken: { validate: jest.fn() } }));

const updateENVModule = require("../../utils/helpers/updateENV");
const getCustomModelsModule = require("../../utils/helpers/customModels");
const exportChatsModule = require("../../utils/helpers/chat/convertTo");
const filesModule = require("../../utils/files");
const purgeDocModule = require("../../utils/files/purgeDocument");
const logoModule = require("../../utils/files/logo");
const passwordRecoveryModule = require("../../utils/PasswordRecovery");
const sqlConnectorsModule = require("../../utils/agents/aibitat/plugins/sql-agent/SQLConnectors");
const { createMockApp } = require("../helpers/mockExpressApp");
const { systemEndpoints } = require("../../endpoints/system");
const { SystemSettings } = require("../../models/systemSettings");
const { User } = require("../../models/user");
const { ApiKey } = require("../../models/apiKeys");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { EventLogs } = require("../../models/eventLogs");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");
const { BrowserExtensionApiKey } = require("../../models/browserExtensionApiKey");
const { MobileDevice } = require("../../models/mobileDevice");
const { Memory } = require("../../models/memory");
const { AgentSkillWhitelist } = require("../../models/agentSkillWhitelist");
const { getVectorDbClass } = require("../../utils/helpers");
const { CollectorApi } = require("../../utils/collectorApi");
const bcrypt = require("bcryptjs");
const CURR_USER = { id: 1, username: "admin", role: "admin" };
function buildApp() { const h = createMockApp(); systemEndpoints(h.app); return h; }

describe("systemEndpoints", () => {
  let app;
  let vectorDbMock;
  beforeEach(() => {
    vectorDbMock = { totalVectors: jest.fn(), namespaceCount: jest.fn() };
    getVectorDbClass.mockReturnValue(vectorDbMock);
    app = buildApp();
    mockUserFromSession.mockResolvedValue(CURR_USER);
    mockMultiUserMode.mockReturnValue(false);
    mockMakeJWT.mockReturnValue("jwt-token");
    process.env.AUTH_TOKEN = "";
    process.env.JWT_EXPIRY = "1h";
    process.env.JWT_SECRET = "test-secret";
  });
  afterEach(() => jest.clearAllMocks());

  it("returns undefined when called without app", () => {
    expect(systemEndpoints(null)).toBeUndefined();
  });

  describe("GET /ping", () => {
    it("returns online", async () => {
      const res = await app.call("get", "/ping");
      expect(res.statusCode).toBe(200);
      expect(res.body.online).toBe(true);
    });
  });

  describe("GET /onboarding", () => {
    it("returns onboarding status", async () => {
      SystemSettings.isOnboardingComplete.mockResolvedValue(true);
      const res = await app.call("get", "/onboarding");
      expect(res.statusCode).toBe(200);
      expect(res.body.onboardingComplete).toBe(true);
    });
    it("returns 500 on error", async () => {
      SystemSettings.isOnboardingComplete.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/onboarding");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /onboarding", () => {
    it("marks onboarding complete", async () => {
      SystemSettings.markOnboardingComplete.mockResolvedValue(true);
      const res = await app.call("post", "/onboarding");
      expect(res.statusCode).toBe(200);
    });
    it("returns 500 on error", async () => {
      SystemSettings.markOnboardingComplete.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("post", "/onboarding");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /setup-complete", () => {
    it("returns current settings", async () => {
      SystemSettings.currentSettings.mockResolvedValue({ LLMProvider: "openai" });
      const res = await app.call("get", "/setup-complete");
      expect(res.statusCode).toBe(200);
      expect(res.body.results).toBeDefined();
    });
    it("returns 500 on error", async () => {
      SystemSettings.currentSettings.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/setup-complete");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/check-token", () => {
    it("returns 200 in single-user", async () => {
      mockMultiUserMode.mockReturnValue(false);
      const res = await app.call("get", "/system/check-token");
      expect(res.statusCode).toBe(200);
    });
    it("returns 200 for valid multi-user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue({ id: 1, username: "admin" });
      const res = await app.call("get", "/system/check-token");
      expect(res.statusCode).toBe(200);
    });
    it("returns 403 when no user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue(null);
      const res = await app.call("get", "/system/check-token");
      expect(res.statusCode).toBe(403);
    });
    it("returns 403 for suspended user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue({ id: 1, suspended: true });
      const res = await app.call("get", "/system/check-token");
      expect(res.statusCode).toBe(403);
    });
    it("returns 500 on error", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/check-token");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/refresh-user", () => {
    it("returns success in single-user", async () => {
      mockMultiUserMode.mockReturnValue(false);
      const res = await app.call("get", "/system/refresh-user");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeNull();
    });
    it("returns user in multi-user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue({ id: 1, username: "admin" });
      const res = await app.call("get", "/system/refresh-user");
      expect(res.body.success).toBe(true);
    });
    it("returns failure when no user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue(null);
      const res = await app.call("get", "/system/refresh-user");
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Session expired or invalid.");
    });
    it("returns failure for suspended user", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockResolvedValue({ id: 1, suspended: true });
      const res = await app.call("get", "/system/refresh-user");
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("User is suspended.");
    });
    it("returns 500 on error", async () => {
      mockMultiUserMode.mockReturnValue(true);
      mockUserFromSession.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/refresh-user");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /request-token", () => {
    describe("single-user", () => {
      beforeEach(() => { SystemSettings.isMultiUserMode.mockResolvedValue(false); });
      it("auto-grants token without AUTH_TOKEN", async () => {
        process.env.AUTH_TOKEN = "";
        const res = await app.call("post", "/request-token", { body: { password: "x" } });
        expect(res.body.valid).toBe(true);
        expect(res.body.token).toBe("jwt-token");
      });
      it("grants token with correct AUTH_TOKEN", async () => {
        process.env.AUTH_TOKEN = "mypassword";
        bcrypt.compareSync.mockReturnValue(true);
        const res = await app.call("post", "/request-token", { body: { password: "mypassword" } });
        expect(res.body.valid).toBe(true);
      });
      it("rejects wrong AUTH_TOKEN", async () => {
        process.env.AUTH_TOKEN = "mypassword";
        bcrypt.compareSync.mockReturnValue(false);
        const res = await app.call("post", "/request-token", { body: { password: "wrong" } });
        expect(res.statusCode).toBe(401);
        expect(res.body.valid).toBe(false);
      });
    });
    describe("multi-user", () => {
      beforeEach(() => { SystemSettings.isMultiUserMode.mockResolvedValue(true); });
      it("rejects when SSO disabled", async () => {
        const { simpleSSOLoginDisabled } = require("../../utils/middleware/simpleSSOEnabled");
        simpleSSOLoginDisabled.mockReturnValue(true);
        const res = await app.call("post", "/request-token", { body: { username: "admin", password: "pass" } });
        expect(res.statusCode).toBe(403);
        simpleSSOLoginDisabled.mockReturnValue(false);
      });
      it("rejects invalid username", async () => {
        User._get.mockResolvedValue(null);
        const res = await app.call("post", "/request-token", { body: { username: "nobody", password: "pass" } });
        expect(res.body.valid).toBe(false);
        expect(res.body.message).toMatch(/\[001\]/);
      });
      it("rejects invalid password", async () => {
        User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed" });
        bcrypt.compareSync.mockReturnValue(false);
        const res = await app.call("post", "/request-token", { body: { username: "admin", password: "wrong" } });
        expect(res.body.valid).toBe(false);
        expect(res.body.message).toMatch(/\[002\]/);
      });
      it("rejects suspended user", async () => {
        User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed", suspended: true });
        bcrypt.compareSync.mockReturnValue(true);
        const res = await app.call("post", "/request-token", { body: { username: "admin", password: "pass" } });
        expect(res.body.valid).toBe(false);
        expect(res.body.message).toMatch(/\[004\]/);
      });
      it("returns recovery codes for new user", async () => {
        User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed", seen_recovery_codes: false });
        bcrypt.compareSync.mockReturnValue(true);
        passwordRecoveryModule.generateRecoveryCodes.mockResolvedValue(["code1", "code2"]);
        const res = await app.call("post", "/request-token", { body: { username: "admin", password: "pass" } });
        expect(res.body.valid).toBe(true);
        expect(res.body.recoveryCodes).toEqual(["code1", "code2"]);
      });
      it("returns token for existing user", async () => {
        User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed", seen_recovery_codes: true });
        bcrypt.compareSync.mockReturnValue(true);
        const res = await app.call("post", "/request-token", { body: { username: "admin", password: "pass" } });
        expect(res.body.valid).toBe(true);
        expect(res.body.token).toBe("jwt-token");
      });
      it("returns 500 on error", async () => {
        User._get.mockImplementation(() => Promise.reject(new Error("fail")));
        const res = await app.call("post", "/request-token", { body: { username: "a", password: "b" } });
        expect(res.statusCode).toBe(500);
      });
    });
  });

  describe("GET /system/system-vectors", () => {
    it("returns total count without slug", async () => {
      vectorDbMock.totalVectors.mockResolvedValue(42);
      const res = await app.call("get", "/system/system-vectors");
      expect(res.body.vectorCount).toBe(42);
    });
    it("returns namespace count with slug", async () => {
      vectorDbMock.namespaceCount.mockResolvedValue(10);
      const res = await app.call("get", "/system/system-vectors", { query: { slug: "ns" } });
      expect(res.body.vectorCount).toBe(10);
    });
    it("returns 500 on error", async () => {
      vectorDbMock.totalVectors.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/system-vectors");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /system/remove-document", () => {
    it("removes a document", async () => {
      purgeDocModule.purgeDocument.mockResolvedValue(true);
      const res = await app.call("delete", "/system/remove-document", { body: { name: "doc.pdf" } });
      expect(res.statusCode).toBe(200);
    });
    it("returns 500 on error", async () => {
      purgeDocModule.purgeDocument.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("delete", "/system/remove-document", { body: { name: "doc.pdf" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /system/remove-documents", () => {
    it("removes multiple documents", async () => {
      purgeDocModule.purgeDocument.mockResolvedValue(true);
      const res = await app.call("delete", "/system/remove-documents", { body: { names: ["a.pdf", "b.pdf"] } });
      expect(res.statusCode).toBe(200);
      expect(purgeDocModule.purgeDocument).toHaveBeenCalledTimes(2);
    });
    it("returns 500 on error", async () => {
      purgeDocModule.purgeDocument.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("delete", "/system/remove-documents", { body: { names: ["a.pdf"] } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /system/remove-folder", () => {
    it("removes a folder", async () => {
      purgeDocModule.purgeFolder.mockResolvedValue(true);
      const res = await app.call("delete", "/system/remove-folder", { body: { name: "docs" } });
      expect(res.statusCode).toBe(200);
    });
    it("returns 500 on error", async () => {
      purgeDocModule.purgeFolder.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("delete", "/system/remove-folder", { body: { name: "docs" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/local-files", () => {
    it("returns local files", async () => {
      filesModule.viewLocalFiles.mockResolvedValue([{ name: "doc.pdf" }]);
      const res = await app.call("get", "/system/local-files");
      expect(res.body.localFiles).toHaveLength(1);
    });
    it("returns 500 on error", async () => {
      filesModule.viewLocalFiles.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/local-files");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/document-processing-status", () => {
    it("returns 200 when online", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn().mockResolvedValue(true), acceptedFileTypes: jest.fn() }));
      const res = await app.call("get", "/system/document-processing-status");
      expect(res.statusCode).toBe(200);
    });
    it("returns 503 when offline", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn().mockResolvedValue(false), acceptedFileTypes: jest.fn() }));
      const res = await app.call("get", "/system/document-processing-status");
      expect(res.statusCode).toBe(503);
    });
    it("returns 500 on error", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn().mockImplementation(() => Promise.reject(new Error("fail"))), acceptedFileTypes: jest.fn() }));
      const res = await app.call("get", "/system/document-processing-status");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/accepted-document-types", () => {
    it("returns types", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn(), acceptedFileTypes: jest.fn().mockResolvedValue(["pdf"]) }));
      const res = await app.call("get", "/system/accepted-document-types");
      expect(res.body.types).toEqual(["pdf"]);
    });
    it("returns 404 when no types", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn(), acceptedFileTypes: jest.fn().mockResolvedValue(null) }));
      const res = await app.call("get", "/system/accepted-document-types");
      expect(res.statusCode).toBe(404);
    });
    it("returns 500 on error", async () => {
      CollectorApi.mockImplementation(() => ({ online: jest.fn(), acceptedFileTypes: jest.fn().mockImplementation(() => Promise.reject(new Error("fail"))) }));
      const res = await app.call("get", "/system/accepted-document-types");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /system/update-env", () => {
    it("updates env", async () => {
      updateENVModule.updateENV.mockResolvedValue({ newValues: { key: "val" }, error: null });
      const res = await app.call("post", "/system/update-env", { body: { key: "val" } });
      expect(res.body.newValues).toEqual({ key: "val" });
    });
    it("returns 500 on error", async () => {
      updateENVModule.updateENV.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("post", "/system/update-env", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /system/update-password", () => {
    it("disables password", async () => {
      mockMultiUserMode.mockReturnValue(false);
      const res = await app.call("post", "/system/update-password", { body: { usePassword: false } });
      expect(res.body.success).toBe(true);
    });
    it("enables password via updateENV", async () => {
      mockMultiUserMode.mockReturnValue(false);
      updateENVModule.updateENV.mockResolvedValue({ error: null });
      const res = await app.call("post", "/system/update-password", { body: { usePassword: true, newPassword: "secret" } });
      expect(res.body.success).toBe(true);
    });
    it("rejects in multi-user mode", async () => {
      mockMultiUserMode.mockReturnValue(true);
      const res = await app.call("post", "/system/update-password", { body: { usePassword: true, newPassword: "s" } });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /system/multi-user-mode", () => {
    it("returns status", async () => {
      SystemSettings.isMultiUserMode.mockResolvedValue(true);
      const res = await app.call("get", "/system/multi-user-mode");
      expect(res.body.multiUserMode).toBe(true);
    });
    it("returns 500 on error", async () => {
      SystemSettings.isMultiUserMode.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/multi-user-mode");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/custom-app-name", () => {
    it("returns app name", async () => {
      SystemSettings.get.mockResolvedValue({ value: "MyApp" });
      const res = await app.call("get", "/system/custom-app-name");
      expect(res.body.customAppName).toBe("MyApp");
    });
    it("returns null when not set", async () => {
      SystemSettings.get.mockResolvedValue(null);
      const res = await app.call("get", "/system/custom-app-name");
      expect(res.body.customAppName).toBeNull();
    });
    it("returns 500 on error", async () => {
      SystemSettings.get.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/custom-app-name");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/footer-data", () => {
    it("returns footer data", async () => {
      SystemSettings.get.mockResolvedValue({ value: '[{"name":"link"}]' });
      const res = await app.call("get", "/system/footer-data");
      expect(res.body.footerData).toBe('[{"name":"link"}]');
    });
    it("returns default when not set", async () => {
      SystemSettings.get.mockResolvedValue(null);
      const res = await app.call("get", "/system/footer-data");
      expect(res.body.footerData).toBe("[]");
    });
  });

  describe("GET /system/support-email", () => {
    it("returns email", async () => {
      SystemSettings.get.mockResolvedValue({ value: "s@t.com" });
      const res = await app.call("get", "/system/support-email");
      expect(res.body.supportEmail).toBe("s@t.com");
    });
    it("returns null when not set", async () => {
      SystemSettings.get.mockResolvedValue(null);
      const res = await app.call("get", "/system/support-email");
      expect(res.body.supportEmail).toBeNull();
    });
  });

  describe("POST /system/enable-multi-user", () => {
    it("rejects when already enabled", async () => {
      const res = await app.call("post", "/system/enable-multi-user", { body: { username: "a", password: "b" }, locals: { multiUserMode: true } });
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/already enabled/);
    });
    it("enables multi-user mode", async () => {
      User.create.mockResolvedValue({ user: { id: 1 }, error: null });
      SystemSettings._updateSettings.mockResolvedValue(true);
      updateENVModule.updateENV.mockResolvedValue({ error: null });
      const res = await app.call("post", "/system/enable-multi-user", { body: { username: "admin", password: "password123" }, locals: { multiUserMode: false } });
      expect(res.body.success).toBe(true);
      expect(BrowserExtensionApiKey.migrateApiKeysToMultiUser).toHaveBeenCalled();
      expect(Memory.migrateToMultiUser).toHaveBeenCalled();
    });
    it("returns error when user creation fails", async () => {
      User.create.mockResolvedValue({ user: null, error: "dup" });
      const res = await app.call("post", "/system/enable-multi-user", { body: { username: "dup", password: "p" }, locals: { multiUserMode: false } });
      expect(res.statusCode).toBe(400);
    });
    it("rolls back on exception", async () => {
      User.create.mockResolvedValue({ user: { id: 1 }, error: null });
      let callCount = 0;
      SystemSettings._updateSettings.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error("fail"));
        return Promise.resolve({ success: true, error: null });
      });
      User.delete.mockResolvedValue(true);
      const res = await app.call("post", "/system/enable-multi-user", { body: { username: "admin", password: "password123" }, locals: { multiUserMode: false } });
      expect(res.statusCode).toBe(500);
      expect(User.delete).toHaveBeenCalled();
    });
  });

  describe("GET /system/api-keys", () => {
    it("returns api keys", async () => {
      ApiKey.where.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/system/api-keys");
      expect(res.body.apiKeys).toHaveLength(1);
    });
    it("rejects in multi-user", async () => {
      const res = await app.call("get", "/system/api-keys", { locals: { multiUserMode: true } });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("POST /system/generate-api-key", () => {
    it("generates api key", async () => {
      ApiKey.create.mockResolvedValue({ apiKey: { id: 1, name: "k" }, error: null });
      const res = await app.call("post", "/system/generate-api-key", { body: { name: "k" } });
      expect(res.body.apiKey.name).toBe("k");
    });
    it("rejects in multi-user", async () => {
      const res = await app.call("post", "/system/generate-api-key", { body: { name: "k" }, locals: { multiUserMode: true } });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("DELETE /system/api-key/:id", () => {
    it("deletes an api key", async () => {
      const res = await app.call("delete", "/system/api-key/5");
      expect(res.statusCode).toBe(200);
      expect(ApiKey.delete).toHaveBeenCalledWith({ id: 5 });
    });
    it("rejects in multi-user", async () => {
      const res = await app.call("delete", "/system/api-key/5", { locals: { multiUserMode: true } });
      expect(res.statusCode).toBe(401);
    });
    it("returns 400 for invalid id", async () => {
      const res = await app.call("delete", "/system/api-key/abc");
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /system/custom-models", () => {
    it("returns custom models", async () => {
      getCustomModelsModule.getCustomModels.mockResolvedValue({ models: ["gpt-4"], error: null });
      const res = await app.call("post", "/system/custom-models", { body: { provider: "openai" } });
      expect(res.body.models).toEqual(["gpt-4"]);
    });
    it("returns 500 on error", async () => {
      getCustomModelsModule.getCustomModels.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("post", "/system/custom-models", { body: { provider: "openai" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /system/event-logs", () => {
    it("returns paginated logs", async () => {
      EventLogs.whereWithData.mockResolvedValue([{ id: 1 }]);
      EventLogs.count.mockResolvedValue(25);
      const res = await app.call("post", "/system/event-logs", { body: { offset: 0, limit: 10 } });
      expect(res.body.totalLogs).toBe(25);
    });
  });

  describe("DELETE /system/event-logs", () => {
    it("deletes all logs", async () => {
      EventLogs.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/system/event-logs");
      expect(res.body.success).toBe(true);
    });
  });

  describe("POST /system/workspace-chats", () => {
    it("returns paginated chats", async () => {
      WorkspaceChats.whereWithData.mockResolvedValue([{ id: 1 }]);
      WorkspaceChats.count.mockResolvedValue(50);
      const res = await app.call("post", "/system/workspace-chats", { body: { offset: 0, limit: 20 } });
      expect(res.body.totalChats).toBe(50);
    });
  });

  describe("DELETE /system/workspace-chats/:id", () => {
    it("deletes specific chat", async () => {
      WorkspaceChats.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/system/workspace-chats/5");
      expect(res.body.success).toBe(true);
      expect(WorkspaceChats.delete).toHaveBeenCalledWith({ id: 5 });
    });
    it("deletes all with -1", async () => {
      WorkspaceChats.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/system/workspace-chats/-1");
      expect(WorkspaceChats.delete).toHaveBeenCalledWith({}, true);
    });
  });

  describe("GET /system/export-chats", () => {
    it("exports chats", async () => {
      exportChatsModule.exportChatsAsType.mockResolvedValue({ contentType: "application/jsonl", data: "chats" });
      const res = await app.call("get", "/system/export-chats", { query: { type: "jsonl" } });
      expect(res.body).toBe("chats");
    });
    it("returns 500 on error", async () => {
      exportChatsModule.exportChatsAsType.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/export-chats", { query: { type: "jsonl" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/default-system-prompt", () => {
    it("returns custom prompt", async () => {
      SystemSettings.get.mockResolvedValue({ value: "Custom" });
      const res = await app.call("get", "/system/default-system-prompt");
      expect(res.body.defaultSystemPrompt).toBe("Custom");
    });
    it("returns sane default when not set", async () => {
      SystemSettings.get.mockResolvedValue(null);
      const res = await app.call("get", "/system/default-system-prompt");
      expect(res.body.defaultSystemPrompt).toBe(SystemSettings.saneDefaultSystemPrompt);
    });
  });

  describe("POST /system/default-system-prompt", () => {
    it("updates prompt", async () => {
      SystemSettings.updateSettings.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/system/default-system-prompt", { body: { defaultSystemPrompt: "New" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 500 on failure", async () => {
      SystemSettings.updateSettings.mockResolvedValue({ success: false, error: new Error("fail") });
      const res = await app.call("post", "/system/default-system-prompt", { body: { defaultSystemPrompt: "X" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /system/slash-command-presets", () => {
    it("returns presets", async () => {
      SlashCommandPresets.getUserPresets.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/system/slash-command-presets");
      expect(res.body.presets).toHaveLength(1);
    });
  });

  describe("POST /system/slash-command-presets", () => {
    it("creates preset", async () => {
      SlashCommandPresets.create.mockResolvedValue({ id: 1, command: "/hi" });
      const res = await app.call("post", "/system/slash-command-presets", { body: { command: "/hi", prompt: "Hi", description: "d" } });
      expect(res.statusCode).toBe(201);
    });
    it("rejects system command", async () => {
      const res = await app.call("post", "/system/slash-command-presets", { body: { command: "/reset", prompt: "r", description: "d" } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /system/slash-command-presets/:id", () => {
    it("updates preset", async () => {
      SlashCommandPresets.get.mockResolvedValue({ id: 1 });
      SlashCommandPresets.update.mockResolvedValue({ id: 1 });
      const res = await app.call("post", "/system/slash-command-presets/1", { body: { command: "/hi", prompt: "H", description: "d" } });
      expect(res.statusCode).toBe(200);
    });
    it("returns 404 when not found", async () => {
      SlashCommandPresets.get.mockResolvedValue(null);
      const res = await app.call("post", "/system/slash-command-presets/99", { body: { command: "/hi", prompt: "H", description: "d" } });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /system/slash-command-presets/:id", () => {
    it("deletes preset", async () => {
      SlashCommandPresets.get.mockResolvedValue({ id: 1 });
      const res = await app.call("delete", "/system/slash-command-presets/1");
      expect(res.statusCode).toBe(204);
    });
    it("returns 403 when not found", async () => {
      SlashCommandPresets.get.mockResolvedValue(null);
      const res = await app.call("delete", "/system/slash-command-presets/99");
      expect(res.statusCode).toBe(403);
    });
  });

  describe("GET /system/prompt-variables", () => {
    it("returns variables", async () => {
      SystemPromptVariables.getAll.mockResolvedValue([{ key: "k" }]);
      const res = await app.call("get", "/system/prompt-variables");
      expect(res.body.variables).toHaveLength(1);
    });
  });

  describe("POST /system/prompt-variables", () => {
    it("creates variable", async () => {
      SystemPromptVariables.create.mockResolvedValue({ key: "k" });
      const res = await app.call("post", "/system/prompt-variables", { body: { key: "k", value: "v" } });
      expect(res.body.success).toBe(true);
    });
    it("rejects missing key", async () => {
      const res = await app.call("post", "/system/prompt-variables", { body: { value: "v" } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("PUT /system/prompt-variables/:id", () => {
    it("updates variable", async () => {
      SystemPromptVariables.update.mockResolvedValue({ id: 1 });
      const res = await app.call("put", "/system/prompt-variables/1", { body: { key: "k", value: "v2" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 404 when not found", async () => {
      SystemPromptVariables.update.mockResolvedValue(null);
      const res = await app.call("put", "/system/prompt-variables/999", { body: { key: "k", value: "v" } });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /system/prompt-variables/:id", () => {
    it("deletes variable", async () => {
      SystemPromptVariables.delete.mockResolvedValue(true);
      const res = await app.call("delete", "/system/prompt-variables/1");
      expect(res.body.success).toBe(true);
    });
    it("returns 404 when not found", async () => {
      SystemPromptVariables.delete.mockResolvedValue(false);
      const res = await app.call("delete", "/system/prompt-variables/999");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("POST /system/recover-account", () => {
    it("recovers account", async () => {
      passwordRecoveryModule.recoverAccount.mockResolvedValue({ success: true, resetToken: "tok", error: null });
      const res = await app.call("post", "/system/recover-account", { body: { username: "a", recoveryCodes: ["c"] } });
      expect(res.body.success).toBe(true);
    });
    it("returns 400 on failure", async () => {
      passwordRecoveryModule.recoverAccount.mockResolvedValue({ success: false, resetToken: null, error: "bad" });
      const res = await app.call("post", "/system/recover-account", { body: { username: "a", recoveryCodes: [] } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /system/reset-password", () => {
    it("resets password", async () => {
      passwordRecoveryModule.resetPassword.mockResolvedValue({ success: true, message: "ok", error: null });
      const res = await app.call("post", "/system/reset-password", { body: { token: "t", newPassword: "n", confirmPassword: "n" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 400 on failure", async () => {
      passwordRecoveryModule.resetPassword.mockResolvedValue({ success: false, error: "mismatch" });
      const res = await app.call("post", "/system/reset-password", { body: { token: "t", newPassword: "a", confirmPassword: "b" } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /system/user", () => {
    it("updates user profile", async () => {
      User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed" });
      const bcrypt = require("bcryptjs");
      bcrypt.compareSync.mockReturnValue(true);
      User.update.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/system/user", { body: { username: "new", password: "p", currentPassword: "old" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 400 when changing password without currentPassword", async () => {
      const res = await app.call("post", "/system/user", { body: { username: "new", password: "p" } });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toContain("Current password is required");
    });
    it("returns 403 when currentPassword is incorrect", async () => {
      User._get.mockResolvedValue({ id: 1, username: "admin", password: "hashed" });
      const bcrypt = require("bcryptjs");
      bcrypt.compareSync.mockReturnValue(false);
      const res = await app.call("post", "/system/user", { body: { username: "new", password: "p", currentPassword: "wrong" } });
      expect(res.statusCode).toBe(403);
    });
    it("updates profile without password change (no currentPassword needed)", async () => {
      User.update.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/system/user", { body: { username: "new", bio: "hello" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 400 for invalid id", async () => {
      mockUserFromSession.mockResolvedValue({ id: undefined });
      const res = await app.call("post", "/system/user", { body: { username: "x" } });
      expect(res.statusCode).toBe(400);
    });
    it("returns 400 when no updates", async () => {
      mockUserFromSession.mockResolvedValue({ id: 1, username: "admin" });
      const res = await app.call("post", "/system/user", { body: { username: "admin" } });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("POST /system/validate-sql-connection", () => {
    it("validates connection", async () => {
      sqlConnectorsModule.validateConnection.mockResolvedValue({ success: true });
      const res = await app.call("post", "/system/validate-sql-connection", { body: { engine: "mysql", connectionString: "c" } });
      expect(res.body.success).toBe(true);
    });
    it("returns 400 when missing fields", async () => {
      const res = await app.call("post", "/system/validate-sql-connection", { body: { engine: "mysql" } });
      expect(res.statusCode).toBe(400);
    });
    it("returns failure on bad connection", async () => {
      sqlConnectorsModule.validateConnection.mockResolvedValue({ success: false });
      const res = await app.call("post", "/system/validate-sql-connection", { body: { engine: "mysql", connectionString: "bad" } });
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /system/is-default-logo", () => {
    it("returns true for default", async () => {
      SystemSettings.currentLogoFilename.mockResolvedValue(null);
      const res = await app.call("get", "/system/is-default-logo");
      expect(res.body.isDefaultLogo).toBe(true);
    });
    it("returns false for custom", async () => {
      SystemSettings.currentLogoFilename.mockResolvedValue("custom.png");
      const res = await app.call("get", "/system/is-default-logo");
      expect(res.body.isDefaultLogo).toBe(false);
    });
  });

  describe("GET /system/remove-logo", () => {
    it("removes logo", async () => {
      SystemSettings.currentLogoFilename.mockResolvedValue("custom.png");
      SystemSettings._updateSettings.mockResolvedValue({ success: true, error: null });
      const res = await app.call("get", "/system/remove-logo");
      expect(res.statusCode).toBe(200);
    });
    it("returns 500 when update fails", async () => {
      SystemSettings.currentLogoFilename.mockResolvedValue("custom.png");
      SystemSettings._updateSettings.mockResolvedValue({ success: false, error: "fail" });
      const res = await app.call("get", "/system/remove-logo");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /system/upload-logo", () => {
    it("rejects no file", async () => {
      const res = await app.call("post", "/system/upload-logo");
      expect(res.statusCode).toBe(400);
    });
    it("rejects invalid filename", async () => {
      logoModule.validFilename.mockReturnValue(false);
      const res = await app.call("post", "/system/upload-logo", { file: { originalname: "bad" } });
      expect(res.statusCode).toBe(400);
    });
    it("uploads logo", async () => {
      logoModule.validFilename.mockReturnValue(true);
      logoModule.renameLogoFile.mockResolvedValue("new.png");
      SystemSettings.currentLogoFilename.mockResolvedValue("old.png");
      logoModule.removeCustomLogo.mockResolvedValue(true);
      SystemSettings._updateSettings.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/system/upload-logo", { file: { originalname: "logo.png" } });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /system/logo", () => {
    it("returns 204 when not found", async () => {
      logoModule.determineLogoFilepath.mockResolvedValue("/p/logo.png");
      logoModule.fetchLogo.mockReturnValue({ found: false, buffer: null, size: 0, mime: null });
      const res = await app.call("get", "/system/logo");
      expect(res.statusCode).toBe(204);
    });
    it("returns logo data", async () => {
      logoModule.determineLogoFilepath.mockResolvedValue("/p/logo.png");
      logoModule.fetchLogo.mockReturnValue({ found: true, buffer: Buffer.from("img").toString("base64"), size: 100, mime: "image/png" });
      SystemSettings.currentLogoFilename.mockResolvedValue("logo.png");
      const res = await app.call("get", "/system/logo");
      expect(res.statusCode).toBe(200);
      expect(res.headers["Content-Type"]).toBe("image/png");
    });
    it("returns 500 on error", async () => {
      logoModule.determineLogoFilepath.mockImplementation(() => Promise.reject(new Error("fail")));
      const res = await app.call("get", "/system/logo");
      expect(res.statusCode).toBe(500);
    });
  });
});
