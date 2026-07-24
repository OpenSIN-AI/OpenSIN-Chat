// SPDX-License-Identifier: MIT
// Regression tests for POST /workspaces/:slug/notes input validation.
// Covers the gap identified in Issue #369: POST lacked the same guards that
// PUT already enforced for content (type + length) and pinned (boolean).

jest.mock("../../utils/logger/console.js", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));
jest.mock("../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
  userFromSession: jest.fn(),
  multiUserMode: jest.fn(),
}));
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/multiUserProtected", () => ({
  ROLES: { admin: "admin", manager: "manager", user: "user", all: "all" },
  flexUserRoleValid: () => (_req, _res, next) => next(),
}));
jest.mock("../../utils/middleware/validWorkspace", () => ({
  validWorkspaceSlug: (_req, _res, next) => next(),
}));
jest.mock("../../models/workspaceNote");
jest.mock("../../models/documents");
jest.mock("../../models/workspace");
jest.mock("../../utils/paths", () => ({ getStoragePath: jest.fn(() => "/tmp") }));

const { WorkspaceNote } = require("../../models/workspaceNote");
const { Workspace } = require("../../models/workspace");
const { reqBody, userFromSession } = require("../../utils/http");
const { createMockApp } = require("../helpers/mockExpressApp");
const { noteEndpoints } = require("../../endpoints/notes");

const WS_LOCALS = { workspace: { id: 1, slug: "ws" } };

let call;

beforeEach(() => {
  jest.clearAllMocks();
  const { app, call: _call } = createMockApp();
  noteEndpoints(app);
  call = _call;
  // Default: reqBody returns whatever req.body is.
  reqBody.mockImplementation((req) => req.body);
});

// ---------------------------------------------------------------------------
// POST /workspaces/:slug/notes — content validation
// ---------------------------------------------------------------------------
describe("POST /workspaces/:slug/notes — content validation", () => {
  it("accepts valid content + pinned and calls WorkspaceNote.create", async () => {
    WorkspaceNote.create.mockResolvedValue({ id: 1, content: "hello", pinned: false });

    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "hello", pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.note).toMatchObject({ id: 1, content: "hello" });
    expect(WorkspaceNote.create).toHaveBeenCalledWith(1, "hello", false);
  });

  it("accepts empty content string (default) and pinned=false (default)", async () => {
    WorkspaceNote.create.mockResolvedValue({ id: 2, content: "", pinned: false });

    const res = await call("POST", "/workspaces/ws/notes", {
      body: {},
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(200);
    expect(WorkspaceNote.create).toHaveBeenCalledWith(1, "", false);
  });

  it("rejects content that is not a string (object)", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: { malicious: true }, pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/string/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("rejects content that is not a string (number)", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: 42, pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/string/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("rejects content that is not a string (array)", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: ["a", "b"], pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/string/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("rejects content exceeding 100,000 characters", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "x".repeat(100_001), pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/100,000/);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("accepts content of exactly 100,000 characters", async () => {
    const content = "x".repeat(100_000);
    WorkspaceNote.create.mockResolvedValue({ id: 3, content, pinned: false });

    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content, pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(200);
    expect(WorkspaceNote.create).toHaveBeenCalledWith(1, content, false);
  });
});

// ---------------------------------------------------------------------------
// POST /workspaces/:slug/notes — pinned validation
// ---------------------------------------------------------------------------
describe("POST /workspaces/:slug/notes — pinned validation", () => {
  it("accepts pinned=true", async () => {
    WorkspaceNote.create.mockResolvedValue({ id: 4, content: "x", pinned: true });

    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "x", pinned: true },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(200);
    expect(WorkspaceNote.create).toHaveBeenCalledWith(1, "x", true);
  });

  it("rejects pinned as a string", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "x", pinned: "true" },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/boolean/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("rejects pinned as a number", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "x", pinned: 1 },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/boolean/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });

  it("rejects pinned as null", async () => {
    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "x", pinned: null },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/boolean/i);
    expect(WorkspaceNote.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// POST /workspaces/:slug/notes — error handling
// ---------------------------------------------------------------------------
describe("POST /workspaces/:slug/notes — error handling", () => {
  it("returns 500 when WorkspaceNote.create throws", async () => {
    WorkspaceNote.create.mockRejectedValue(new Error("DB error"));

    const res = await call("POST", "/workspaces/ws/notes", {
      body: { content: "ok", pinned: false },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PUT /workspaces/:slug/notes/:id — parity check (already existed)
// ---------------------------------------------------------------------------
describe("PUT /workspaces/:slug/notes/:id — content validation parity", () => {
  beforeEach(() => {
    WorkspaceNote.get.mockResolvedValue({ id: 1, workspaceId: 1, content: "old" });
  });

  it("rejects content that is not a string", async () => {
    const res = await call("PUT", "/workspaces/ws/notes/1", {
      body: { content: 99 },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/string/i);
  });

  it("rejects content exceeding 100,000 characters", async () => {
    const res = await call("PUT", "/workspaces/ws/notes/1", {
      body: { content: "y".repeat(100_001) },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/100,000/);
  });
});

// ---------------------------------------------------------------------------
// POST /workspaces/:slug/notes/:id/share — workspace access control
// ---------------------------------------------------------------------------
describe("POST /workspaces/:slug/notes/:id/share — access control", () => {
  beforeEach(() => {
    WorkspaceNote.get.mockResolvedValue({ id: 7, workspaceId: 1 });
    Workspace.get.mockResolvedValue({ id: 2, slug: "other" });
    userFromSession.mockResolvedValue({ id: 5 });
  });

  it("rejects a target workspace the user cannot access", async () => {
    WorkspaceNote.getShareableWorkspaces.mockResolvedValue([]);

    const res = await call("POST", "/workspaces/ws/notes/7/share", {
      body: { targetWorkspaceSlug: "other" },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(404);
    expect(WorkspaceNote.shareToWorkspace).not.toHaveBeenCalled();
  });

  it("shares only when the target is in the allowed workspace set", async () => {
    WorkspaceNote.getShareableWorkspaces.mockResolvedValue([
      { id: 2, slug: "other" },
    ]);
    WorkspaceNote.shareToWorkspace.mockResolvedValue({
      note_id: 7,
      target_workspace_id: 2,
    });

    const res = await call("POST", "/workspaces/ws/notes/7/share", {
      body: { targetWorkspaceSlug: "other" },
      locals: WS_LOCALS,
    });

    expect(res.statusCode).toBe(200);
    expect(WorkspaceNote.shareToWorkspace).toHaveBeenCalledWith(7, 2, 5);
  });
});
