// SPDX-License-Identifier: MIT
jest.mock("../../../models/apiKeys", () => ({
  ApiKey: { get: jest.fn() },
}));
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../models/user", () => ({
  User: { get: jest.fn() },
}));

const { ApiKey } = require("../../../models/apiKeys");
const { SystemSettings } = require("../../../models/systemSettings");
const { User } = require("../../../models/user");
const {
  validApiKey,
  validAdminApiKey,
} = require("../../../utils/middleware/validApiKey");

function mockReqRes({ authHeader } = {}) {
  const request = {
    ip: "9.9.9.9",
    method: "POST",
    originalUrl: "/api/v1/research/start",
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

describe("validApiKey", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_INTEGRATION_TEST = process.env.INTEGRATION_TEST;
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATION_TEST;
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_INTEGRATION_TEST === undefined) {
      delete process.env.INTEGRATION_TEST;
    } else {
      process.env.INTEGRATION_TEST = ORIGINAL_INTEGRATION_TEST;
    }
  });

  it("rejects requests without an Authorization header and logs the attempt", async () => {
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validApiKey(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("missing_bearer");
    expect(warnSpy.mock.calls[0][0]).toContain("9.9.9.9");
  });

  it("rejects invalid keys, logs IP, and never logs the key itself", async () => {
    ApiKey.get.mockResolvedValue(null);
    const { request, response } = mockReqRes({
      authHeader: "Bearer super-secret-attempt",
    });
    const next = jest.fn();

    await validApiKey(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
    const logged = warnSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(logged).toContain("invalid_key");
    expect(logged).not.toContain("super-secret-attempt");
  });

  it("calls next() for valid keys without logging", async () => {
    ApiKey.get.mockResolvedValue({ id: 1, secret: "valid" });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid" });
    const next = jest.fn();

    await validApiKey(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.statusCode).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("rejects keys owned by suspended users in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    ApiKey.get.mockResolvedValue({ id: 1, createdBy: 42 });
    User.get.mockResolvedValue({ id: 42, suspended: true, role: "admin" });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid" });
    const next = jest.fn();

    await validApiKey(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(401);
    expect(warnSpy.mock.calls[0][0]).toContain("suspended_user");
  });

  it("exposes the active key owner to downstream handlers", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    const owner = { id: 42, suspended: false, role: "default" };
    ApiKey.get.mockResolvedValue({ id: 1, createdBy: 42 });
    User.get.mockResolvedValue(owner);
    const { request, response } = mockReqRes({ authHeader: "Bearer valid" });
    const next = jest.fn();

    await validApiKey(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.user).toBe(owner);
  });

  it("rejects non-admin owners on admin API routes", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    ApiKey.get.mockResolvedValue({ id: 1, createdBy: 42 });
    User.get.mockResolvedValue({ id: 42, suspended: false, role: "default" });
    const { request, response } = mockReqRes({ authHeader: "Bearer valid" });
    const next = jest.fn();

    await validAdminApiKey(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(403);
  });
});
