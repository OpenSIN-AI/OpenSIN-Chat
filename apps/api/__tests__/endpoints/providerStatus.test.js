// SPDX-License-Identifier: MIT
// Tests for providerStatus endpoints (Issue #382).
//
// Covers: GET /system/provider-key-status and
// GET /system/provider-connectivity (with and without ?provider= query).
//
// Uses the mockExpressApp harness to register routes and invoke handlers
// without booting a real HTTP server.

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { admin: "admin", manager: "manager" },
}));
jest.mock("../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/providerKeyStatus", () => ({
  getProviderKeyStatuses: jest.fn(),
}));
jest.mock("../../utils/providerConnectivity", () => ({
  probeProvider: jest.fn(),
  probeAllProviders: jest.fn(),
}));
jest.mock("../../utils/paths", () => ({
  pathsHealth: jest.fn(),
}));

const { providerStatusEndpoints } = require("../../endpoints/providerStatus");
const { getProviderKeyStatuses } = require("../../utils/providerKeyStatus");
const { probeProvider, probeAllProviders } = require("../../utils/providerConnectivity");
const { pathsHealth } = require("../../utils/paths");
const { createMockApp } = require("../helpers/mockExpressApp");

function buildApp() {
  const harness = createMockApp();
  providerStatusEndpoints(harness.app);
  return harness;
}

describe("providerStatusEndpoints", () => {
  let app;
  beforeEach(() => {
    app = buildApp();
  });
  afterEach(() => jest.clearAllMocks());

  // ───────────────────────────────────────────────────────────
  // GET /system/provider-key-status
  // ───────────────────────────────────────────────────────────
  describe("GET /system/provider-key-status", () => {
    it("returns provider key statuses and path health", async () => {
      const fakeProviders = [
        { id: "openai", hasKey: true, hasFallback: false },
        { id: "anthropic", hasKey: false, hasFallback: true },
      ];
      const fakePaths = { storage: "/tmp", documents: "/docs" };
      getProviderKeyStatuses.mockReturnValue(fakeProviders);
      pathsHealth.mockReturnValue(fakePaths);

      const res = await app.call("get", "/system/provider-key-status");

      expect(res.statusCode).toBe(200);
      expect(res.body.providers).toEqual(fakeProviders);
      expect(res.body.paths).toEqual(fakePaths);
      expect(res.body.checkedAt).toBeDefined();
      expect(getProviderKeyStatuses).toHaveBeenCalledTimes(1);
      expect(pathsHealth).toHaveBeenCalledTimes(1);
    });

    it("returns 500 with error on exception", async () => {
      getProviderKeyStatuses.mockImplementation(() => {
        throw new Error("Status check failed");
      });

      const res = await app.call("get", "/system/provider-key-status");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
      expect(res.body.providers).toEqual([]);
    });
  });

  // ───────────────────────────────────────────────────────────
  // GET /system/provider-connectivity
  // ───────────────────────────────────────────────────────────
  describe("GET /system/provider-connectivity", () => {
    it("probes all providers when no ?provider= query is given", async () => {
      const fakeResults = [
        { provider: "openai", reachable: true, latencyMs: 120 },
        { provider: "anthropic", reachable: true, latencyMs: 200 },
      ];
      probeAllProviders.mockResolvedValue(fakeResults);

      const res = await app.call("get", "/system/provider-connectivity");

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toEqual(fakeResults);
      expect(res.body.checkedAt).toBeDefined();
      expect(probeAllProviders).toHaveBeenCalledTimes(1);
      expect(probeProvider).not.toHaveBeenCalled();
    });

    it("probes a single provider when ?provider= query is given", async () => {
      const fakeResult = { provider: "openai", reachable: true, latencyMs: 50 };
      probeProvider.mockResolvedValue(fakeResult);

      const res = await app.call("get", "/system/provider-connectivity", {
        query: { provider: "openai" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results).toEqual([fakeResult]);
      expect(res.body.checkedAt).toBeDefined();
      expect(probeProvider).toHaveBeenCalledWith("openai");
      expect(probeAllProviders).not.toHaveBeenCalled();
    });

    it("returns 500 with error on exception", async () => {
      probeAllProviders.mockRejectedValue(new Error("Network error"));

      const res = await app.call("get", "/system/provider-connectivity");

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
      expect(res.body.results).toEqual([]);
    });

    it("returns 500 when single provider probe throws", async () => {
      probeProvider.mockRejectedValue(new Error("Probe failed"));

      const res = await app.call("get", "/system/provider-connectivity", {
        query: { provider: "badprovider" },
      });

      expect(res.statusCode).toBe(500);
      expect(res.body.error).toBe("Internal server error");
    });
  });
});
