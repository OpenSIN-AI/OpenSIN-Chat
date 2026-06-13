// SPDX-License-Identifier: MIT
// Purpose: Test embed endpoints (embed, embed-chats, embed-config)
// Docs: tests/embed.test.js

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

vi.mock("../server/models/embedChats", () => ({
  EmbedChats: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    get: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("../server/models/embedConfig", () => ({
  EmbedConfig: {
    whereWithData: vi.fn(() => Promise.resolve([])),
    count: vi.fn(() => Promise.resolve(0)),
    create: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    get: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    update: vi.fn(() => Promise.resolve({ id: 1, embedId: 1 })),
    delete: vi.fn(() => Promise.resolve(true)),
    where: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock("../server/models/eventLogs", () => ({
  EventLogs: {
    logEvent: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/models/telemetry", () => ({
  Telemetry: {
    sendTelemetry: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock("../server/utils/helpers/updateENV", () => ({
  updateENV: () => ({ newValues: {}, error: null }),
}));

vi.mock("../server/utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (req, res, next) => next(),
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

vi.mock("../server/utils/middleware/chatHistoryViewable", () => ({
  chatHistoryViewable: () => (req, res, next) => next(),
}));

vi.mock("../server/utils/collectorApi", () => ({
  CollectorApi: () => ({ online: () => Promise.resolve(true), acceptedFileTypes: () => Promise.resolve([]) }),
}));

vi.mock("../server/utils/chats", () => ({
  VALID_COMMANDS: { help: true, clear: true },
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
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.text();
  return {
    status: response.status,
    headers: response.headers,
    body: data ? JSON.parse(data) : null,
  };
};

describe("embed endpoints", () => {
  describe("GET /embed", () => {
    it("should return embed", async () => {
      const response = await request("GET", "/embed");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("embed");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalEmbeds");
    });

    it("should return embed with pagination", async () => {
      const response = await request("GET", "/embed?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("embed");
    });
  });

  describe("POST /embed", () => {
    it("should create embed", async () => {
      const response = await request("POST", "/embed", {
        name: "test-embed",
        description: "Test embed description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("name", "test-embed");
    });
  });

  describe("GET /embed/:id", () => {
    it("should get embed by id", async () => {
      const response = await request("GET", "/embed/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("embedId", 1);
    });
  });

  describe("PUT /embed/:id", () => {
    it("should update embed", async () => {
      const response = await request("PUT", "/embed/1", {
        name: "updated-embed",
        description: "Updated embed description",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id", 1);
      expect(response.body).toHaveProperty("embedId", 1);
    });
  });

  describe("DELETE /embed/:id", () => {
    it("should delete embed", async () => {
      const response = await request("DELETE", "/embed/1");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /embed-chats", () => {
    it("should return embed chats", async () => {
      const response = await request("GET", "/embed-chats");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalChats");
    });

    it("should return embed chats with pagination", async () => {
      const response = await request("GET", "/embed-chats?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("chats");
    });
  });

  describe("POST /embed-chats", () => {
    it("should create embed chat", async () => {
      const response = await request("POST", "/embed-chats", {
        embedId: 1,
        chatId: "test-chat",
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("embedId", 1);
    });
  });

  describe("GET /embed-config", () => {
    it("should return embed config", async () => {
      const response = await request("GET", "/embed-config");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("config");
      expect(response.body).toHaveProperty("hasPages");
      expect(response.body).toHaveProperty("totalConfigs");
    });

    it("should return embed config with pagination", async () => {
      const response = await request("GET", "/embed-config?offset=0&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("config");
    });
  });
});
