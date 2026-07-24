// SPDX-License-Identifier: MIT
/* eslint-env jest */
jest.mock("../../../models/workspace", () => ({
  Workspace: { get: jest.fn(), getWithUser: jest.fn() },
}));
jest.mock("../../../models/workspaceThread", () => ({
  WorkspaceThread: { get: jest.fn() },
}));
jest.mock("../../../utils/http", () => ({
  userFromSession: jest.fn(),
  multiUserMode: jest.fn().mockReturnValue(false),
}));

const { Workspace } = require("../../../models/workspace");
const { WorkspaceThread } = require("../../../models/workspaceThread");
const { userFromSession, multiUserMode } = require("../../../utils/http");
const {
  validWorkspaceSlug,
  validWorkspaceAndThreadSlug,
} = require("../../../utils/middleware/validWorkspace");

function mockReqRes({ slug = "ws", threadSlug } = {}) {
  const request = { params: { slug } };
  if (threadSlug) request.params.threadSlug = threadSlug;
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
    send(msg) {
      this.body = msg;
      return this;
    },
  };
  return { request, response };
}

describe("validWorkspaceSlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    multiUserMode.mockReturnValue(false);
    userFromSession.mockResolvedValue({ id: 1 });
  });

  it("sets response.locals.workspace and calls next when workspace exists", async () => {
    const ws = { id: 1, slug: "ws", name: "My WS" };
    Workspace.get.mockResolvedValue(ws);
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validWorkspaceSlug(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.workspace).toEqual(ws);
  });

  it("returns 404 when workspace does not exist", async () => {
    Workspace.get.mockResolvedValue(null);
    const { request, response } = mockReqRes({ slug: "missing" });
    const next = jest.fn();

    await validWorkspaceSlug(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
  });

  it("uses getWithUser in multi-user mode", async () => {
    multiUserMode.mockReturnValue(true);
    const user = { id: 5 };
    const ws = { id: 1, slug: "ws" };
    userFromSession.mockResolvedValue(user);
    Workspace.getWithUser.mockResolvedValue(ws);
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validWorkspaceSlug(request, response, next);

    expect(Workspace.getWithUser).toHaveBeenCalledWith(user, { slug: "ws" });
    expect(response.locals.workspace).toEqual(ws);
  });

  it("returns 500 on error", async () => {
    Workspace.get.mockRejectedValue(new Error("db down"));
    const { request, response } = mockReqRes();
    const next = jest.fn();

    await validWorkspaceSlug(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(500);
  });
});

describe("validWorkspaceAndThreadSlug", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    multiUserMode.mockReturnValue(false);
    userFromSession.mockResolvedValue({ id: 1 });
  });

  it("sets both workspace and thread in locals when both exist", async () => {
    const ws = { id: 1, slug: "ws" };
    const thread = { id: 10, slug: "t1" };
    Workspace.get.mockResolvedValue(ws);
    WorkspaceThread.get.mockResolvedValue(thread);
    const { request, response } = mockReqRes({ slug: "ws", threadSlug: "t1" });
    const next = jest.fn();

    await validWorkspaceAndThreadSlug(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.workspace).toEqual(ws);
    expect(response.locals.thread).toEqual(thread);
  });

  it("returns 404 when workspace does not exist", async () => {
    Workspace.get.mockResolvedValue(null);
    const { request, response } = mockReqRes({ slug: "missing", threadSlug: "t1" });
    const next = jest.fn();

    await validWorkspaceAndThreadSlug(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
  });

  it("returns 404 when thread does not exist", async () => {
    Workspace.get.mockResolvedValue({ id: 1, slug: "ws" });
    WorkspaceThread.get.mockResolvedValue(null);
    const { request, response } = mockReqRes({ slug: "ws", threadSlug: "missing" });
    const next = jest.fn();

    await validWorkspaceAndThreadSlug(request, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.statusCode).toBe(404);
  });
});
