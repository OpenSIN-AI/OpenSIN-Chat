// SPDX-License-Identifier: MIT
// Purpose: Test scheduled jobs endpoints
// Docs: tests/scheduledJobs.test.js

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApp } from "../server/app";

vi.mock("../server/utils/helpers", () => ({
  getVectorDbClass: () => ({ namespaceCount: vi.fn(() => Promise.resolve(0)), totalVectors: vi.fn(() => Promise.resolve(0)) }),
}));

vi.mock("../server/utils/helpers/customModels", () => ({
  getCustomModels: () => ({ models: [], error: null }),
}));

vi.mock("../server/models/systemSettings", () => ({
  SystemSettings: {
    currentSettings: vi.fn(() => Promise.resolve({})),
    isMultiUserMode: vi.fn(() => Promise.resolve(false)),
  },
}));

vi.mock("../server/models/user", () => ({
  User: {
    _get: vi.fn(() => Promise.resolve(null)),
    filterFields: vi.fn((user) => user),
  },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: { logEvent: vi.fn(() => Promise.resolve()) },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: { sendTelemetry: vi.fn(() => Promise.resolve()) },
}));

vi.mock("../server/utils/helpers/updateENV", () => ({
  updateENV: () => ({ newValues: {}, error: null }),
}));

vi.mock("../server/utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (req, res, next) => next(),
  strictMultiUserRoleValid: () => (req, res, next) => next(),
  ROLES: { admin: "admin", manager: "manager", all: "all" },
  isMultiUserSetup: () => true,
}));

vi.mock("../server/utils/middleware/validatedRequest", () => ({
  validatedRequest: (req, res, next) => next(),
}));

vi.mock("../server/utils/http", () => ({
  reqBody: (req) => ({}),
  makeJWT: (payload, expiry) => `token_${payload.id}`,
  userFromSession: () => Promise.resolve({ id: 1, username: "test" }),
  multiUserMode: () => false,
  queryParams: () => ({}),
}));

vi.mock("../server/utils/middleware/simpleRateLimit", () => ({
  simpleRateLimit: () => (req, res, next) => next(),
}));

let app;

beforeEach(async () => {
  vi.clearAllMocks();
  app = createApp();
});

const request = async (method, path, body = null, headers = {}) => {
  const url = `http://localhost:3001${path}`;
  const options = {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  const data = await response.text();
  return { status: response.status, headers: response.headers, body: data ? JSON.parse(data) : null };
};

describe("scheduled jobs endpoints", () => {
  describe("GET /scheduled-jobs", () => {
    it("should return scheduled jobs list", async () => {
      const response = await request("GET", "/scheduled-jobs");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("jobs");
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    it("should return scheduled jobs with pagination", async () => {
      const response = await request("GET", "/scheduled-jobs?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("jobs");
    });
  });

  describe("POST /scheduled-jobs/new", () => {
    it("should create a scheduled job with valid data", async () => {
      const response = await request("POST", "/scheduled-jobs/new", {
        name: `Daily Backup ${Date.now()}`,
        prompt: "Run a backup",
        schedule: "0 0 * * *",
      });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("job");
      expect(response.body.job).toHaveProperty("id");
    });

    it("should create a scheduled job with minimal data", async () => {
      const response = await request("POST", "/scheduled-jobs/new", {
        name: `Weekly Report ${Date.now()}`,
        prompt: "Run a report",
        schedule: "0 0 * * 0",
      });
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("job");
      expect(response.body.job).toHaveProperty("id");
    });

    it("should reject job with missing name", async () => {
      const response = await request("POST", "/scheduled-jobs/new", {
        prompt: "Run a backup",
        schedule: "0 0 * * *",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject job with invalid schedule", async () => {
      const response = await request("POST", "/scheduled-jobs/new", {
        name: `Bad Job ${Date.now()}`,
        prompt: "Run a backup",
        schedule: "not-a-cron",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /scheduled-jobs/:id", () => {
    it("should get scheduled job by id", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Get Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("GET", `/scheduled-jobs/${jobId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("job");
      expect(response.body.job).toHaveProperty("id", jobId);
    });

    it("should return 404 for non-existent job", async () => {
      const response = await request("GET", "/scheduled-jobs/999999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("PUT /scheduled-jobs/:id", () => {
    it("should update a scheduled job", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Update Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("PUT", `/scheduled-jobs/${jobId}`, {
        name: `Updated Job ${Date.now()}`,
        enabled: false,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("job");
      expect(response.body.job).toHaveProperty("id", jobId);
    });

    it("should reject update with invalid data", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Invalid Update Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("PUT", `/scheduled-jobs/${jobId}`, {
        schedule: "invalid",
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("DELETE /scheduled-jobs/:id", () => {
    it("should delete a scheduled job", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Delete Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("DELETE", `/scheduled-jobs/${jobId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("POST /scheduled-jobs/:id/trigger", () => {
    it("should trigger immediate job execution", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Trigger Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("POST", `/scheduled-jobs/${jobId}/trigger`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });

    it("should return 404 for non-existent job", async () => {
      const response = await request("POST", "/scheduled-jobs/999999/trigger");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /scheduled-jobs/:id/runs", () => {
    it("should return job execution runs", async () => {
      const createResponse = await request("POST", "/scheduled-jobs/new", {
        name: `Runs Job ${Date.now()}`,
        prompt: "Run a job",
        schedule: "0 0 * * *",
      });
      const jobId = createResponse.body.job.id;
      const response = await request("GET", `/scheduled-jobs/${jobId}/runs`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("runs");
      expect(Array.isArray(response.body.runs)).toBe(true);
    });
  });
});
