// SPDX-License-Identifier: MIT
/* eslint-env jest */
jest.mock("../../../models/apiKeys", () => ({
  ApiKey: { get: jest.fn() },
}));
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../models/user", () => ({
  User: { get: jest.fn() },
}));
jest.mock("../../../utils/http", () => ({
  decodeJWT: jest.fn(),
}));

const { ApiKey } = require("../../../models/apiKeys");
const { SystemSettings } = require("../../../models/systemSettings");
const { User } = require("../../../models/user");
const { decodeJWT } = require("../../../utils/http");
const {
  requireApiKeyOrSession,
} = require("../../../utils/middleware/requireApiKeyOrSession");

function mockReqRes({ authHeader } = {}) {
  const request = {
    header: (name) => (name === "Authorization" ? authHeader : undefined),
  };
  const response = {
    locals: {},
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return { request, response };
}

describe("requireApiKeyOrSession", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATION_TEST;
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await requireApiKeyOrSession(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/No valid API key or session token/i);
  });

  it("allows valid API key", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer api-key-secret",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue({ id: 1, name: "test-key" });

    await requireApiKeyOrSession(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.apiKey).toEqual({ id: 1, name: "test-key" });
  });

  it("allows valid session token when API key lookup fails", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer session-token",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue(null);
    decodeJWT.mockReturnValue({ id: 42 });
    User.get.mockResolvedValue({ id: 42, username: "test", role: "admin" });

    await requireApiKeyOrSession(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.user).toEqual({
      id: 42,
      username: "test",
      role: "admin",
    });
  });

  it("allows a single-user session token with an encrypted credential claim", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer single-user-token",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue(null);
    decodeJWT.mockReturnValue({ p: "encrypted-credential" });

    await requireApiKeyOrSession(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.user).toBeUndefined();
  });

  it("rejects signed JWTs without a recognized identity or credential", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer unrelated-token",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue(null);
    decodeJWT.mockReturnValue({ p: null });

    await requireApiKeyOrSession(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when bearer is neither a valid API key nor a valid session token", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer invalid",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue(null);
    decodeJWT.mockReturnValue(null);

    await requireApiKeyOrSession(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it("rejects API keys owned by suspended users in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    const { request, response } = mockReqRes({
      authHeader: "Bearer api-key-secret",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue({ id: 1, createdBy: 42 });
    User.get.mockResolvedValue({ id: 42, suspended: true });

    await requireApiKeyOrSession(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it("returns 401 for suspended user session token", async () => {
    const { request, response } = mockReqRes({
      authHeader: "Bearer session-token",
    });
    const next = jest.fn();
    ApiKey.get.mockResolvedValue(null);
    decodeJWT.mockReturnValue({ id: 42 });
    User.get.mockResolvedValue({ id: 42, username: "test", suspended: true });

    await requireApiKeyOrSession(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
  });

  it("passes through in integration test mode", async () => {
    process.env.NODE_ENV = "test";
    process.env.INTEGRATION_TEST = "true";
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await requireApiKeyOrSession(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
