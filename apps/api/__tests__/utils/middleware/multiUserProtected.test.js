// SPDX-License-Identifier: MIT
/* eslint-env jest */
jest.mock("../../../models/systemSettings", () => ({
  SystemSettings: { isMultiUserMode: jest.fn().mockResolvedValue(false) },
}));
jest.mock("../../../utils/http", () => ({
  userFromSession: jest.fn(),
}));

const { SystemSettings } = require("../../../models/systemSettings");
const { userFromSession } = require("../../../utils/http");
const {
  ROLES,
  isSingleUserMode,
  strictMultiUserRoleValid,
  flexUserRoleValid,
  isMultiUserSetup,
} = require("../../../utils/middleware/multiUserProtected");

function mockRes() {
  const res = {
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
    sendStatus(code) {
      this.statusCode = code;
      return this;
    },
  };
  return res;
}

describe("flexUserRoleValid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
  });

  it("calls next immediately when ROLES.all is allowed", async () => {
    const mw = flexUserRoleValid([ROLES.all]);
    const next = jest.fn();
    await mw({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("bypasses role check when not in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
    const mw = flexUserRoleValid([ROLES.admin]);
    const next = jest.fn();
    await mw({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("allows users with matching role in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    userFromSession.mockResolvedValue({ id: 1, role: "admin" });
    const mw = flexUserRoleValid([ROLES.admin]);
    const next = jest.fn();
    await mw({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects users with non-matching role in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    userFromSession.mockResolvedValue({ id: 1, role: "default" });
    const mw = flexUserRoleValid([ROLES.admin]);
    const res = mockRes();
    const next = jest.fn();
    await mw({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

describe("isSingleUserMode", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls next when single-user mode is active", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
    const next = jest.fn();
    await isSingleUserMode({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 when multi-user mode is active", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    const res = mockRes();
    const next = jest.fn();
    await isSingleUserMode({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

describe("isMultiUserSetup", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls next when multi-user mode is active", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    const next = jest.fn();
    await isMultiUserSetup({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 403 when not in multi-user mode", async () => {
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
    const res = mockRes();
    const next = jest.fn();
    await isMultiUserSetup({}, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});

describe("strictMultiUserRoleValid", () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;
  const ORIGINAL_INTEGRATION_TEST = process.env.INTEGRATION_TEST;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = "production";
    delete process.env.INTEGRATION_TEST;
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
    if (ORIGINAL_INTEGRATION_TEST === undefined) {
      delete process.env.INTEGRATION_TEST;
    } else {
      process.env.INTEGRATION_TEST = ORIGINAL_INTEGRATION_TEST;
    }
  });

  it("calls next when ROLES.all is allowed", async () => {
    const mw = strictMultiUserRoleValid([ROLES.all]);
    const next = jest.fn();
    await mw({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("does not bypass role checks for NODE_ENV=test alone", async () => {
    process.env.NODE_ENV = "test";
    SystemSettings.isMultiUserMode.mockResolvedValue(true);
    userFromSession.mockResolvedValue({ id: 1, role: "default" });
    const mw = strictMultiUserRoleValid([ROLES.admin]);
    const res = mockRes();
    const next = jest.fn();

    await mw({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  it("allows only the explicit integration harness to bypass role checks", async () => {
    process.env.NODE_ENV = "test";
    process.env.INTEGRATION_TEST = "true";
    const mw = strictMultiUserRoleValid([ROLES.admin]);
    const next = jest.fn();

    await mw({}, mockRes(), next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next in single-user mode (single-user operator is implicitly admin of their own server)", async () => {
    // Regression guard: the previous behavior was to 401 single-user requests
    // outright, which silently broke the admin UI for single-user operators.
    // See AGENTS.md / PR; single-user mode bypasses role gating because there
    // is no other user to protect from.
    SystemSettings.isMultiUserMode.mockResolvedValue(false);
    const mw = strictMultiUserRoleValid([ROLES.admin]);
    const next = jest.fn();
    await mw({}, mockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
