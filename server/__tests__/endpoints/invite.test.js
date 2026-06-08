// SPDX-License-Identifier: MIT
const { createMockApp } = require("../helpers/mockExpressApp");
const { inviteEndpoints } = require("../../endpoints/invite");

jest.mock("../../models/invite", () => ({
  Invite: {
    get: jest.fn(),
    markClaimed: jest.fn(),
  },
}));
jest.mock("../../models/user", () => ({
  User: {
    create: jest.fn(),
  },
}));
jest.mock("../../models/eventLogs", () => ({
  EventLogs: {
    logEvent: jest.fn(),
  },
}));
jest.mock("../../utils/middleware/simpleSSOEnabled", () => ({
  simpleSSOLoginDisabledMiddleware: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));

const { Invite } = require("../../models/invite");
const { User } = require("../../models/user");
const { EventLogs } = require("../../models/eventLogs");

function buildApp() {
  const harness = createMockApp();
  inviteEndpoints(harness.app);
  return harness;
}

describe("Invite endpoints", () => {
  afterEach(() => jest.clearAllMocks());

  describe("GET /invite/:code", () => {
    it("returns 404 when invite not found", async () => {
      Invite.get.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("get", "/invite/:code", { params: { code: "abc123" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.invite).toBeNull();
      expect(res.body.error).toBe("Invite not found.");
    });

    it("returns error when invite status is not pending", async () => {
      Invite.get.mockResolvedValue({ code: "abc123", status: "claimed" });
      const { call } = buildApp();
      const res = await call("get", "/invite/:code", { params: { code: "abc123" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.invite).toBeNull();
      expect(res.body.error).toBe("Invite is no longer valid.");
    });

    it("returns invite data when valid and pending", async () => {
      Invite.get.mockResolvedValue({ code: "abc123", status: "pending" });
      const { call } = buildApp();
      const res = await call("get", "/invite/:code", { params: { code: "abc123" } });
      expect(res.statusCode).toBe(200);
      expect(res.body.invite).toEqual({ code: "abc123", status: "pending" });
      expect(res.body.error).toBeNull();
    });

    it("returns 500 when database throws", async () => {
      Invite.get.mockRejectedValue(new Error("db error"));
      const { call } = buildApp();
      const res = await call("get", "/invite/:code", { params: { code: "abc123" } });
      expect(res.statusCode).toBe(500);
    });
  });

  describe("POST /invite/:code", () => {
    it("returns 400 when invite not found or invalid", async () => {
      Invite.get.mockResolvedValue(null);
      const { call } = buildApp();
      const res = await call("post", "/invite/:code", {
        params: { code: "abc123" },
        body: { username: "test", password: "pass" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Invite not found or is invalid.");
    });

    it("returns 400 when invite status is not pending", async () => {
      Invite.get.mockResolvedValue({ id: 1, code: "abc123", status: "claimed" });
      const { call } = buildApp();
      const res = await call("post", "/invite/:code", {
        params: { code: "abc123" },
        body: { username: "test", password: "pass" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("Invite not found or is invalid.");
    });

    it("returns error when user creation fails", async () => {
      Invite.get.mockResolvedValue({ id: 1, code: "abc123", status: "pending" });
      User.create.mockResolvedValue({ user: null, error: "User exists" });
      const { call } = buildApp();
      const res = await call("post", "/invite/:code", {
        params: { code: "abc123" },
        body: { username: "test", password: "pass" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe("User exists");
    });

    it("accepts invite and creates user successfully", async () => {
      Invite.get.mockResolvedValue({ id: 1, code: "abc123", status: "pending" });
      User.create.mockResolvedValue({
        user: { id: 2, username: "test", role: "default" },
        error: null,
      });
      Invite.markClaimed.mockResolvedValue(true);
      EventLogs.logEvent.mockResolvedValue(true);

      const { call } = buildApp();
      const res = await call("post", "/invite/:code", {
        params: { code: "abc123" },
        body: { username: "test", password: "pass" },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.error).toBeNull();
      expect(Invite.markClaimed).toHaveBeenCalledWith(1, expect.objectContaining({ id: 2 }));
      expect(EventLogs.logEvent).toHaveBeenCalledWith("invite_accepted", expect.any(Object), 2);
    });

    it("returns 500 when exception thrown", async () => {
      Invite.get.mockRejectedValue(new Error("db error"));
      const { call } = buildApp();
      const res = await call("post", "/invite/:code", {
        params: { code: "abc123" },
        body: { username: "test", password: "pass" },
      });
      expect(res.statusCode).toBe(500);
    });
  });
});
