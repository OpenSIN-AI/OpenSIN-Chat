// SPDX-License-Identifier: MIT
/**
 * Unit tests for isOriginAllowed() in the agent SSE + WebSocket endpoints.
 *
 * Regression coverage for the production bug where browser EventSource /
 * fetch traffic was rejected with 403 "disallowed origin: <missing>":
 * browsers omit the Origin header on same-origin safe GET requests, so the
 * old NODE_ENV=production short-circuit rejected legitimate same-origin
 * clients before CORS_ORIGIN was ever consulted. The fix consults
 * Sec-Fetch-Site (a forbidden header scripts cannot spoof) with a
 * Referer-host fallback when Origin is absent.
 */

const ORIGINAL_ENV = { ...process.env };

// The endpoint modules pull in the full agents/plugins tree (which imports
// `mime`, an ESM-only package Jest can't transform). We only need
// isOriginAllowed(), so stub the heavy dependencies exactly like the
// existing agentSSE endpoint test does.
jest.mock("../../utils/agents", () => ({ AgentHandler: jest.fn() }));
jest.mock("../../utils/agents/aibitat/plugins/websocket", () => ({
  WEBSOCKET_BAIL_COMMANDS: ["exit", "stop"],
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));
jest.mock("../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn() },
}));
jest.mock("../../models/workspaceAgentInvocation", () => ({
  WorkspaceAgentInvocation: { close: jest.fn() },
}));
jest.mock("../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn(() => Promise.resolve(false)) },
}));
jest.mock("../../models/user", () => ({ User: { get: jest.fn() } }));
jest.mock("../../utils/EncryptionManager", () => ({
  EncryptionManager: jest.fn().mockImplementation(() => ({
    decrypt: jest.fn((v) => v),
  })),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  getAuthTokenHash: jest.fn(() => "hash"),
}));
jest.mock("../../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));

function loadFresh() {
  jest.resetModules();
  // Neutralize the integration-test bypass so the real branch logic runs.
  delete process.env.INTEGRATION_TEST;
  const { isOriginAllowed: sse } = require("../../endpoints/agentSSE");
  const { isOriginAllowed: ws } = require("../../endpoints/agentWebsocket");
  return { sse, ws };
}

function req(headers) {
  return { headers };
}

describe("isOriginAllowed — missing Origin in production", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATION_TEST;
    delete process.env.CORS_ORIGIN;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  for (const which of ["sse", "ws"]) {
    describe(which, () => {
      const get = () => loadFresh()[which];

      test("allows same-origin browser GET via Sec-Fetch-Site", () => {
        expect(
          get()(req({ host: "sinchat.delqhi.com", "sec-fetch-site": "same-origin" })),
        ).toBe(true);
      });

      test("allows same-site and none Sec-Fetch-Site", () => {
        expect(get()(req({ "sec-fetch-site": "same-site" }))).toBe(true);
        expect(get()(req({ "sec-fetch-site": "none" }))).toBe(true);
      });

      test("rejects cross-site Sec-Fetch-Site", () => {
        expect(get()(req({ "sec-fetch-site": "cross-site" }))).toBe(false);
      });

      test("falls back to Referer host match when no Sec-Fetch-Site", () => {
        expect(
          get()(
            req({
              host: "sinchat.delqhi.com",
              referer: "https://sinchat.delqhi.com/workspace/foo",
            }),
          ),
        ).toBe(true);
      });

      test("rejects mismatched Referer host", () => {
        expect(
          get()(
            req({
              host: "sinchat.delqhi.com",
              referer: "https://evil.example.com/",
            }),
          ),
        ).toBe(false);
      });

      test("rejects non-browser client (no Origin, no Sec-Fetch-Site, no Referer) in production", () => {
        expect(get()(req({ host: "sinchat.delqhi.com" }))).toBe(false);
      });
    });
  }
});

describe("isOriginAllowed — explicit Origin still honored", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATION_TEST;
  });

  afterAll(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test("same-host Origin allowed without CORS_ORIGIN", () => {
    const { sse } = loadFresh();
    expect(
      sse(
        req({
          host: "sinchat.delqhi.com",
          origin: "https://sinchat.delqhi.com",
        }),
      ),
    ).toBe(true);
  });

  test("CORS_ORIGIN allow-list honored for explicit Origin", () => {
    process.env.CORS_ORIGIN = "https://sinchat.delqhi.com";
    const { sse } = loadFresh();
    expect(
      sse(req({ host: "x", origin: "https://sinchat.delqhi.com" })),
    ).toBe(true);
    expect(sse(req({ host: "x", origin: "https://evil.example.com" }))).toBe(
      false,
    );
  });
});
