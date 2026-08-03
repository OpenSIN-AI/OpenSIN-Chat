// SPDX-License-Identifier: MIT
const fs = require("fs");

jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: () => (_req, _res, next) => next(),
  ROLES: { all: "<all>", admin: "admin", manager: "manager" },
}));
jest.mock("../../utils/middleware/validWorkspace", () => ({
  validWorkspaceSlug: (_req, _res, next) => next(),
}));
jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: (req) => req.body,
  userFromSession: jest.fn().mockResolvedValue(null),
  safeJsonParse: (value, fallback) => {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  },
}));
jest.mock("../../models/workspace", () => ({ Workspace: {} }));
jest.mock("../../models/workspaceChats", () => ({ WorkspaceChats: {} }));
jest.mock("../../models/workspaceThread", () => ({ WorkspaceThread: {} }));
jest.mock("../../models/eventLogs", () => ({ EventLogs: {} }));
jest.mock("../../utils/helpers/search", () => ({
  searchWorkspaceAndThreads: jest.fn(),
}));

const uploadsDir = "/tmp/opensin-chat-workspace-download-test/uploads";
jest.mock("../../utils/paths", () => ({
  getStoragePath: jest.fn(() => uploadsDir),
}));

const { createMockApp, createMockRes } = require("../helpers/mockExpressApp");
const {
  workspaceMiscEndpoints,
} = require("../../endpoints/workspace/workspaceMisc");

function buildHarness() {
  const harness = createMockApp();
  workspaceMiscEndpoints(harness.app);
  return harness;
}

async function invokeDownload(query) {
  const harness = buildHarness();
  const route = harness.routes.find(
    (item) =>
      item.method === "get" &&
      item.pattern === "/workspace/:slug/download-document",
  );
  if (!route) throw new Error("download route not registered");

  const request = {
    params: { slug: "ws" },
    query,
  };
  const response = createMockRes({ workspace: { id: 1, slug: "ws" } });
  await route.handler(request, response);
  return response;
}

describe("GET /workspace/:slug/download-document", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("streams the exact original upload with attachment headers", async () => {
    const payload = Buffer.from("FILE_OK_DOWNLOAD");
    jest.spyOn(fs.promises, "stat").mockResolvedValue({ isFile: () => true });
    jest.spyOn(fs, "createReadStream").mockReturnValue({
      pipe(response) {
        response.body = payload;
        response.ended = true;
        return response;
      },
    });

    const response = await invokeDownload({ filename: "uuid_document.txt" });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(payload);
    expect(response.headers["Content-Type"]).toBe("application/octet-stream");
    expect(response.headers["Content-Disposition"]).toBe(
      'attachment; filename="uuid_document.txt"',
    );
    expect(fs.createReadStream).toHaveBeenCalledWith(
      `${uploadsDir}/uuid_document.txt`,
    );
  });

  it("returns 404 when the original upload is absent", async () => {
    jest.spyOn(fs.promises, "stat").mockRejectedValue(new Error("ENOENT"));

    const response = await invokeDownload({ filename: "missing.txt" });

    expect(response.statusCode).toBe(404);
    expect(response.body).toEqual({ error: "File not found" });
  });

  it("rejects path traversal instead of normalizing it into uploads", async () => {
    const statSpy = jest.spyOn(fs.promises, "stat");

    const response = await invokeDownload({ filename: "../secret.txt" });

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: "Access denied" });
    expect(statSpy).not.toHaveBeenCalled();
  });
});
