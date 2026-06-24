// SPDX-License-Identifier: MIT


jest.mock("../../utils/middleware/validApiKey", () => ({
  validApiKey: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger", () => () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock("../../models/user");
jest.mock("../../models/apiKeys");
jest.mock("../../models/invite");
jest.mock("../../models/workspace");
jest.mock("../../models/systemSettings");
jest.mock("../../models/eventLogs");
jest.mock("../../models/documents");
jest.mock("../../models/vectors");
jest.mock("../../models/browserExtensionApiKey");
jest.mock("../../models/workspaceChats");
jest.mock("../../utils/helpers/admin");
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(),
  safeJsonParse: jest.fn(),
}));
jest.mock("../../utils/helpers");
jest.mock("../../utils/agents/imported");
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
  strictMultiUserRoleValid: () => (_req, _res, next) => next(),
  flexUserRoleValid: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/simpleSSOEnabled", () => ({
  simpleSSOLoginDisabledMiddleware: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/workspaceDeletionProtection", () => ({
  workspaceDeletionProtection: (_req, _res, next) => next(),
}));

const { User } = require("../../models/user");
const { ApiKey } = require("../../models/apiKeys");
const { Invite } = require("../../models/invite");
const { Workspace } = require("../../models/workspace");
const { SystemSettings } = require("../../models/systemSettings");
const { EventLogs } = require("../../models/eventLogs");
const { Document } = require("../../models/documents");
const { DocumentVectors } = require("../../models/vectors");
const { BrowserExtensionApiKey } = require("../../models/browserExtensionApiKey");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { validRoleSelection, canModifyAdmin, validCanModify } = require("../../utils/helpers/admin");
const { reqBody, userFromSession, safeJsonParse } = require("../../utils/http");
const { getVectorDbClass, getEmbeddingEngineSelection } = require("../../utils/helpers");
const { ROLES, strictMultiUserRoleValid, flexUserRoleValid } = require("../../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../../utils/middleware/validatedRequest");
const ImportedPlugin = require("../../utils/agents/imported");
const { createMockApp } = require("../helpers/mockExpressApp");
const { adminEndpoints } = require("../../endpoints/admin");

function buildApp() {
  const harness = createMockApp();
  adminEndpoints(harness.app);
  return harness;
}

describe("adminEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
    userFromSession.mockResolvedValue({ id: 1, username: "admin", role: "admin" });
    reqBody.mockImplementation((req) => req.body);
    validRoleSelection.mockReturnValue({ valid: true });
    validCanModify.mockReturnValue({ valid: true });
    canModifyAdmin.mockResolvedValue({ valid: true });
    EventLogs.logEvent.mockResolvedValue();
  });
  afterEach(() => jest.clearAllMocks());

  describe("GET /admin/users", () => {
    it("returns all users", async () => {
      User.where.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const res = await app.call("get", "/admin/users");
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(2);
    });

    it("returns 500 on error", async () => {
      User.where.mockRejectedValue(new Error("db fail"));
      const res = await app.call("get", "/admin/users");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/users/new", () => {
    it("creates a user when role is valid", async () => {
      User.create.mockResolvedValue({ user: { id: 2, username: "new" }, error: null });
      const res = await app.call("post", "/admin/users/new", { body: { username: "new", role: "user" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.user.id).toBe(2);
    });

    it("returns error when role invalid", async () => {
      validRoleSelection.mockReturnValue({ valid: false, error: "bad role" });
      const res = await app.call("post", "/admin/users/new", { body: { username: "new" } });
      expect(res.body.error).toBe("bad role");
    });

    it("logs event on creation", async () => {
      User.create.mockResolvedValue({ user: { id: 2, username: "new" }, error: null });
      await app.call("post", "/admin/users/new", { body: { username: "new" } });
      expect(EventLogs.logEvent).toHaveBeenCalledWith("user_created", expect.any(Object), 1);
    });

    it("returns 500 on exception", async () => {
      User.create.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/users/new", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/user/:id", () => {
    it("updates a user", async () => {
      User.get.mockResolvedValue({ id: 2, username: "user1" });
      User.update.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/admin/user/2", { body: { role: "manager" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects when cannot modify", async () => {
      User.get.mockResolvedValue({ id: 2 });
      validCanModify.mockReturnValue({ valid: false, error: "nope" });
      const res = await app.call("post", "/admin/user/2", { body: {} });
      expect(res.body.success).toBe(false);
    });

    it("rejects when role validation fails", async () => {
      User.get.mockResolvedValue({ id: 2 });
      validRoleSelection.mockReturnValue({ valid: false, error: "bad role" });
      const res = await app.call("post", "/admin/user/2", { body: {} });
      expect(res.body.error).toBe("bad role");
    });

    it("rejects when cannot modify admin", async () => {
      User.get.mockResolvedValue({ id: 2 });
      canModifyAdmin.mockResolvedValue({ valid: false, error: "last admin" });
      const res = await app.call("post", "/admin/user/2", { body: {} });
      expect(res.body.error).toBe("last admin");
    });
  });

  describe("DELETE /admin/user/:id", () => {
    it("deletes a user", async () => {
      User.get.mockResolvedValue({ id: 2, username: "user1" });
      User.delete.mockResolvedValue();
      BrowserExtensionApiKey.deleteAllForUser.mockResolvedValue();
      const res = await app.call("delete", "/admin/user/2");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 on error", async () => {
      User.get.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/admin/user/2");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /admin/invites", () => {
    it("returns invites", async () => {
      Invite.whereWithUsers.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/admin/invites");
      expect(res.statusCode).toBe(200);
      expect(res.body.invites).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      Invite.whereWithUsers.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/admin/invites");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/invite/new", () => {
    it("creates an invite", async () => {
      Invite.create.mockResolvedValue({ invite: { id: 1, code: "abc" }, error: null });
      const res = await app.call("post", "/admin/invite/new", { body: { workspaceIds: [] } });
      expect(res.statusCode).toBe(200);
      expect(res.body.invite.code).toBe("abc");
    });

    it("returns 500 on error", async () => {
      Invite.create.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/invite/new", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /admin/invite/:id", () => {
    it("deactivates an invite", async () => {
      Invite.deactivate.mockResolvedValue({ success: true, error: null });
      const res = await app.call("delete", "/admin/invite/5");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 on error", async () => {
      Invite.deactivate.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/admin/invite/5");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /admin/workspaces", () => {
    it("returns workspaces with users", async () => {
      Workspace.whereWithUsers.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/admin/workspaces");
      expect(res.statusCode).toBe(200);
      expect(res.body.workspaces).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      Workspace.whereWithUsers.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/admin/workspaces");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /admin/workspaces/:workspaceId/users", () => {
    it("returns workspace users", async () => {
      Workspace.workspaceUsers.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/admin/workspaces/ws1/users");
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      Workspace.workspaceUsers.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/admin/workspaces/ws1/users");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/workspaces/new", () => {
    it("creates a workspace", async () => {
      Workspace.new.mockResolvedValue({ workspace: { id: 1, name: "ws" }, message: null });
      const res = await app.call("post", "/admin/workspaces/new", { body: { name: "ws" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.workspace.name).toBe("ws");
    });

    it("returns 500 on error", async () => {
      Workspace.new.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/workspaces/new", { body: { name: "ws" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/workspaces/:workspaceId/update-users", () => {
    it("updates workspace users", async () => {
      Workspace.updateUsers.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/admin/workspaces/ws1/update-users", { body: { userIds: [1, 2] } });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 on error", async () => {
      Workspace.updateUsers.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/workspaces/ws1/update-users", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /admin/workspaces/:id", () => {
    it("deletes a workspace", async () => {
      Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
      Workspace.delete.mockResolvedValue();
      WorkspaceChats.delete.mockResolvedValue();
      DocumentVectors.deleteForWorkspace.mockResolvedValue();
      Document.delete.mockResolvedValue();
      getVectorDbClass.mockReturnValue({ "delete-namespace": jest.fn().mockResolvedValue() });
      const res = await app.call("delete", "/admin/workspaces/1");
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 404 when workspace not found", async () => {
      Workspace.get.mockResolvedValue(null);
      const res = await app.call("delete", "/admin/workspaces/99");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /admin/system-preferences-for", () => {
    it("returns requested settings", async () => {
      SystemSettings.publicFields = ["custom_app_name", "footer_data", "support_email"];
      SystemSettings.get.mockResolvedValue({ value: "MyApp" });
      const res = await app.call("get", "/admin/system-preferences-for", { query: { labels: "custom_app_name" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.settings.custom_app_name).toBe("MyApp");
    });

    it("skips non-public fields", async () => {
      SystemSettings.publicFields = ["custom_app_name"];
      const res = await app.call("get", "/admin/system-preferences-for", { query: { labels: "secret_field,custom_app_name" } });
      expect(res.body.settings.secret_field).toBeUndefined();
      expect(res.body.settings.custom_app_name).toBeDefined();
    });

    it("returns 500 on error", async () => {
      SystemSettings.get.mockRejectedValue(new Error("fail"));
      SystemSettings.publicFields = ["custom_app_name"];
      const res = await app.call("get", "/admin/system-preferences-for", { query: { labels: "custom_app_name" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/system-preferences", () => {
    it("updates settings", async () => {
      SystemSettings.updateSettings.mockResolvedValue({ success: true, error: null });
      const res = await app.call("post", "/admin/system-preferences", { body: { custom_app_name: "New" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 500 on error", async () => {
      SystemSettings.updateSettings.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/system-preferences", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("GET /admin/api-keys", () => {
    it("returns api keys", async () => {
      ApiKey.whereWithUser.mockResolvedValue([{ id: 1 }]);
      const res = await app.call("get", "/admin/api-keys");
      expect(res.statusCode).toBe(200);
      expect(res.body.apiKeys).toHaveLength(1);
    });

    it("returns 500 on error", async () => {
      ApiKey.whereWithUser.mockRejectedValue(new Error("fail"));
      const res = await app.call("get", "/admin/api-keys");
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /admin/generate-api-key", () => {
    it("generates an api key", async () => {
      ApiKey.create.mockResolvedValue({ apiKey: { id: 1, name: "key1" }, error: null });
      const res = await app.call("post", "/admin/generate-api-key", { body: { name: "key1" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.apiKey.name).toBe("key1");
    });

    it("returns 500 on error", async () => {
      ApiKey.create.mockRejectedValue(new Error("fail"));
      const res = await app.call("post", "/admin/generate-api-key", { body: {} });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("DELETE /admin/delete-api-key/:id", () => {
    it("deletes an api key", async () => {
      ApiKey.delete.mockResolvedValue();
      const res = await app.call("delete", "/admin/delete-api-key/5");
      expect(res.statusCode).toBe(200);
    });

    it("returns 400 when id is missing or NaN", async () => {
      const res = await app.call("delete", "/admin/delete-api-key/abc");
      expect(res.statusCode).toBe(400);
    });

    it("returns 500 on error", async () => {
      ApiKey.delete.mockRejectedValue(new Error("fail"));
      const res = await app.call("delete", "/admin/delete-api-key/5");
      expect(res.statusCode).toBe(500);
    });
  });
});
