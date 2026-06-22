// SPDX-License-Identifier: MIT
/* eslint-env jest */
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../models/user", () => ({
  User: { get: jest.fn(), create: jest.fn() },
}));
jest.mock("../../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    decrypt: jest.fn((v) => v),
  })),
}));
jest.mock("../../../utils/http", () => ({
  decodeJWT: jest.fn(),
}));

const { SystemSettings } = require("../../../models/systemSettings");
const { User } = require("../../../models/user");
const { decodeJWT } = require("../../../utils/http");
const {
  validatedRequest,
  invalidateAuthTokenHash,
  invalidateMultiUserModeCache,
} = require("../../../utils/middleware/validatedRequest");

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

describe("validatedRequest", () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    invalidateAuthTokenHash();
    invalidateMultiUserModeCache();
    process.env = { ...ORIGINAL_ENV };
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("passes through in development mode without auth token", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.AUTH_TOKEN;
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 503 in production only when BOTH AUTH_TOKEN and JWT_SECRET are missing (true fail-closed)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_TOKEN;
    delete process.env.JWT_SECRET;
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(503);
    expect(response.body.error).toMatch(/misconfigured/i);
    expect(typeof response.body.id).toBe("string");
    expect(response.body.id.length).toBeGreaterThan(0);
  });

  it("requires a valid session token in production when only AUTH_TOKEN is missing (single-user no-password deployment)", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_TOKEN;
    process.env.JWT_SECRET = "secret";
    const { request, response } = mockReqRes({ authHeader: "Bearer valid-token" });
    const next = jest.fn();
    decodeJWT.mockReturnValue({ id: 42 });
    User.get.mockResolvedValue({ id: 42, username: "test", role: "admin" });

    await validatedRequest(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBeNull();
    expect(response.locals.user).toEqual({ id: 42, username: "test", role: "admin" });
  });

  it("rejects requests without a session token in production single-user no-password mode", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.AUTH_TOKEN;
    process.env.JWT_SECRET = "secret";
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/No auth token found/i);
  });

  it("rejects in production when JWT_SECRET is missing (AUTH_TOKEN deployments need it for token validation)", async () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN = "my-token";
    delete process.env.JWT_SECRET;
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/not configured for authentication/i);
  });

  it("falls through to dev escape hatch when AUTH_TOKEN unset in development", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.AUTH_TOKEN;
    delete process.env.JWT_SECRET;
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when no Authorization header is provided", async () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN = "my-token";
    process.env.JWT_SECRET = "secret";
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain("No auth token");
  });

  it("returns 401 when JWT is invalid or expired", async () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN = "my-token";
    process.env.JWT_SECRET = "secret";
    decodeJWT.mockReturnValue({ id: 1, p: null });
    const { request, response } = mockReqRes({ authHeader: "Bearer bad.jwt" });
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain("expired");
  });

  it("routes to multi-user validation when multi-user mode is enabled", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    decodeJWT.mockReturnValue({ id: 42 });
    User.get.mockResolvedValue({ id: 42, username: "admin", role: "admin", suspended: 0 });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid.jwt" });
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.user.id).toBe(42);
    expect(response.locals.multiUserMode).toBe(true);
  });

  it("rejects suspended users in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    decodeJWT.mockReturnValue({ id: 42 });
    User.get.mockResolvedValue({ id: 42, suspended: 1 });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid.jwt" });
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain("suspended");
  });

  it("returns 401 for non-existent user in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    decodeJWT.mockReturnValue({ id: 99 });
    User.get.mockResolvedValue(null);
    const { request, response } = mockReqRes({ authHeader: "Bearer valid.jwt" });
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain("Invalid auth for user");
  });

  it("accepts single-user JWT with AES-GCM base64 payload (no colon)", async () => {
    jest.resetModules();
    jest.doMock("../../../models/systemSettings", () => ({
      SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
    }));
    jest.doMock("../../../models/user", () => ({
      User: { get: jest.fn(), create: jest.fn() },
    }));
    jest.doMock("../../../utils/EncryptionManager", () => ({
      EncryptionManager: jest.fn().mockImplementation(() => ({
        decrypt: jest.fn(() => "my-token"),
      })),
    }));
    jest.doMock("../../../utils/http", () => ({
      decodeJWT: jest.fn(() => ({
        id: 1,
        p: "cLUzfA0O09vynTcFNU9hJmYfRMxPHiTu4TSHdiGCmIS9AjAntInMatxJZbqf47uxaVNqiuyEQA4BRBUhiGnixyUFJhBJ58nqMO9LWZx0u99P3ZIqGwYAWMzfZg==",
      })),
    }));
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN = "my-token";
    process.env.JWT_SECRET = "secret";
    const { validatedRequest: freshValidated } = require("../../../utils/middleware/validatedRequest");
    const { request, response } = mockReqRes({ authHeader: "Bearer valid.jwt" });
    const next = jest.fn();

    await freshValidated(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBeNull();
  });

  it("rejects single-user JWT whose payload is not valid base64", async () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_TOKEN = "my-token";
    process.env.JWT_SECRET = "secret";
    decodeJWT.mockReturnValue({ id: 1, p: "not!base64!with!colons:here" });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid.jwt" });
    const next = jest.fn();

    await validatedRequest(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(response.body.error).toContain("expired");
  });
});
