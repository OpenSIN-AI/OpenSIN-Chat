// SPDX-License-Identifier: MIT
jest.mock("../../../models/apiKeys", () => ({
  ApiKey: { get: jest.fn() },
}));
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
}));

const { ApiKey } = require("../../../models/apiKeys");
const { validApiKey } = require("../../../utils/middleware/validApiKey");

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
  let warnSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
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
});
