// SPDX-License-Identifier: MIT
// Purpose: Test file upload/download endpoints
// Docs: tests/files.test.js

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

vi.mock("../server/utils/files", () => ({
  viewLocalFiles: () => Promise.resolve([]),
  normalizePath: (path) => path,
  isWithin: () => true,
}));

vi.mock("../server/utils/files/logo", () => ({
  getDefaultFilename: () => "logo.png",
  determineLogoFilepath: () => "/tmp/logo.png",
  fetchLogo: () => ({ found: true, buffer: "base64", size: 100, mime: "image/png" }),
  validFilename: () => true,
  renameLogoFile: () => Promise.resolve("logo.png"),
  removeCustomLogo: () => Promise.resolve(),
  LOGO_FILENAME: "logo.png",
  isDefaultFilename: () => true,
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

describe("file endpoints", () => {
  describe("POST /system/upload-logo", () => {
    it("should upload logo file", async () => {
      const response = await request("POST", "/system/upload-logo", {
        file: {
          originalname: "test-logo.png",
          buffer: Buffer.from("test image data"),
        },
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Logo uploaded successfully.");
    });

    it("should reject invalid file name", async () => {
      const response = await request("POST", "/system/upload-logo", {
        file: {
          originalname: "invalid!.png",
          buffer: Buffer.from("test image data"),
        },
      });
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "Invalid file name. Please choose a different file.");
    });

    it("should reject missing file", async () => {
      const response = await request("POST", "/system/upload-logo", {});
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("message", "No logo file provided.");
    });
  });

  describe("GET /system/logo", () => {
    it("should return logo", async () => {
      const response = await request("GET", "/system/logo");
      expect(response.status).toBe(200);
    });

    it("should return 204 when no logo exists", async () => {
      vi.mock("../server/utils/files/logo", () => ({
        getDefaultFilename: () => "logo.png",
        determineLogoFilepath: () => "/tmp/logo.png",
        fetchLogo: () => ({ found: false, buffer: null, size: 0, mime: null }),
        validFilename: () => true,
        renameLogoFile: () => Promise.resolve("logo.png"),
        removeCustomLogo: () => Promise.resolve(),
        LOGO_FILENAME: "logo.png",
        isDefaultFilename: () => true,
      }));

      const response = await request("GET", "/system/logo");
      expect(response.status).toBe(204);
    });
  });

  describe("GET /system/is-default-logo", () => {
    it("should return whether logo is default", async () => {
      const response = await request("GET", "/system/is-default-logo");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("isDefaultLogo", true);
    });
  });

  describe("DELETE /system/remove-logo", () => {
    it("should remove logo", async () => {
      const response = await request("DELETE", "/system/remove-logo");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "Logo removed successfully.");
    });
  });
});
