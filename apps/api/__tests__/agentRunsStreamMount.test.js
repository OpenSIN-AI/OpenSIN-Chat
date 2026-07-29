// SPDX-License-Identifier: MIT
// Regression: the agent-run SSE router must not double-prefix /api.

const { EventEmitter } = require("node:events");

jest.mock("../utils/agents/runBus", () => ({
  agentRunBus: new EventEmitter(),
}));
jest.mock("../models/agentRuns", () => ({
  AgentRuns: { getActive: jest.fn().mockResolvedValue([]) },
}));
jest.mock("../models/workspace", () => ({
  Workspace: {
    get: jest.fn().mockResolvedValue({ id: 1, slug: "test-workspace" }),
    getWithUser: jest.fn(),
  },
}));
jest.mock("../utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (_req, _res, next) => next(),
}));
jest.mock("../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
  getAuthTokenHash: jest.fn(),
}));
jest.mock("../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}));

const express = require("express");
const { agentRunsStream } = require("../endpoints/agentRunsStream");

describe("agentRunsStream API mount", () => {
  const originalIntegrationTest = process.env.INTEGRATION_TEST;

  beforeAll(() => {
    process.env.INTEGRATION_TEST = "true";
  });

  afterAll(() => {
    if (originalIntegrationTest === undefined)
      delete process.env.INTEGRATION_TEST;
    else process.env.INTEGRATION_TEST = originalIntegrationTest;
  });

  it("serves the SSE stream at one /api prefix", async () => {
    const app = express();
    const apiRouter = express.Router();
    app.use("/api", apiRouter);
    agentRunsStream(apiRouter);

    const server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const { port } = server.address();
    const controller = new AbortController();

    try {
      const response = await fetch(
        `http://127.0.0.1:${port}/api/workspace/test-workspace/agent-runs/stream`,
        { signal: controller.signal },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "text/event-stream",
      );
      const { value } = await response.body.getReader().read();
      expect(Buffer.from(value).toString("utf8")).toContain(": connected");
    } finally {
      controller.abort();
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
