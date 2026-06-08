// SPDX-License-Identifier: MIT
const {
  simpleSSOEnabled,
  simpleSSOLoginDisabled,
  simpleSSOLoginDisabledMiddleware,
} = require("../../../utils/middleware/simpleSSOEnabled");
const { SystemSettings } = require("../../../models/systemSettings");

describe("simpleSSOEnabled middleware", () => {
  const originalSSO = process.env.SIMPLE_SSO_ENABLED;
  const hadSSO = "SIMPLE_SSO_ENABLED" in process.env;

  afterEach(() => {
    if (hadSSO) {
      process.env.SIMPLE_SSO_ENABLED = originalSSO;
    } else {
      delete process.env.SIMPLE_SSO_ENABLED;
    }
    jest.restoreAllMocks();
  });

  it("returns 403 when SIMPLE_SSO_ENABLED is not in env", async () => {
    delete process.env.SIMPLE_SSO_ENABLED;
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    await simpleSSOEnabled({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it("returns 403 when not in multi-user mode", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    jest.spyOn(SystemSettings, "isMultiUserMode").mockResolvedValue(false);
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      locals: {},
    };

    await simpleSSOEnabled({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });

  it("calls next when SSO enabled and multi-user mode", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    jest.spyOn(SystemSettings, "isMultiUserMode").mockResolvedValue(true);
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      locals: {},
    };

    await simpleSSOEnabled({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.locals.multiUserMode).toBe(true);
  });

  it("uses existing multiUserMode from response.locals if present", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    const spy = jest.spyOn(SystemSettings, "isMultiUserMode");
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      locals: { multiUserMode: true },
    };

    await simpleSSOEnabled({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("simpleSSOLoginDisabled", () => {
  const originalSSO = process.env.SIMPLE_SSO_ENABLED;
  const originalNoLogin = process.env.SIMPLE_SSO_NO_LOGIN;
  const hadSSO = "SIMPLE_SSO_ENABLED" in process.env;
  const hadNoLogin = "SIMPLE_SSO_NO_LOGIN" in process.env;

  afterEach(() => {
    if (hadSSO) {
      process.env.SIMPLE_SSO_ENABLED = originalSSO;
    } else {
      delete process.env.SIMPLE_SSO_ENABLED;
    }
    if (hadNoLogin) {
      process.env.SIMPLE_SSO_NO_LOGIN = originalNoLogin;
    } else {
      delete process.env.SIMPLE_SSO_NO_LOGIN;
    }
  });

  it("returns true when both SIMPLE_SSO_ENABLED and SIMPLE_SSO_NO_LOGIN are set", () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    process.env.SIMPLE_SSO_NO_LOGIN = "1";

    expect(simpleSSOLoginDisabled()).toBe(true);
  });

  it("returns false when SIMPLE_SSO_ENABLED is not set", () => {
    delete process.env.SIMPLE_SSO_ENABLED;
    process.env.SIMPLE_SSO_NO_LOGIN = "1";

    expect(simpleSSOLoginDisabled()).toBe(false);
  });

  it("returns false when SIMPLE_SSO_NO_LOGIN is not set", () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    delete process.env.SIMPLE_SSO_NO_LOGIN;

    expect(simpleSSOLoginDisabled()).toBe(false);
  });

  it("returns false when neither env var is set", () => {
    delete process.env.SIMPLE_SSO_ENABLED;
    delete process.env.SIMPLE_SSO_NO_LOGIN;

    expect(simpleSSOLoginDisabled()).toBe(false);
  });
});

describe("simpleSSOLoginDisabledMiddleware", () => {
  const originalSSO = process.env.SIMPLE_SSO_ENABLED;
  const originalNoLogin = process.env.SIMPLE_SSO_NO_LOGIN;
  const hadSSO = "SIMPLE_SSO_ENABLED" in process.env;
  const hadNoLogin = "SIMPLE_SSO_NO_LOGIN" in process.env;

  afterEach(() => {
    if (hadSSO) {
      process.env.SIMPLE_SSO_ENABLED = originalSSO;
    } else {
      delete process.env.SIMPLE_SSO_ENABLED;
    }
    if (hadNoLogin) {
      process.env.SIMPLE_SSO_NO_LOGIN = originalNoLogin;
    } else {
      delete process.env.SIMPLE_SSO_NO_LOGIN;
    }
    jest.restoreAllMocks();
  });

  it("returns 403 JSON when multi-user mode and login is disabled", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    process.env.SIMPLE_SSO_NO_LOGIN = "1";
    jest.spyOn(SystemSettings, "isMultiUserMode").mockResolvedValue(true);
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };

    await simpleSSOLoginDisabledMiddleware({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: "Login via credentials has been disabled by the administrator.",
    });
  });

  it("calls next when multi-user mode but login is not disabled", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    delete process.env.SIMPLE_SSO_NO_LOGIN;
    jest.spyOn(SystemSettings, "isMultiUserMode").mockResolvedValue(true);
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };

    await simpleSSOLoginDisabledMiddleware({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next when not in multi-user mode", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    process.env.SIMPLE_SSO_NO_LOGIN = "1";
    jest.spyOn(SystemSettings, "isMultiUserMode").mockResolvedValue(false);
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: {},
    };

    await simpleSSOLoginDisabledMiddleware({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("uses existing multiUserMode from response.locals", async () => {
    process.env.SIMPLE_SSO_ENABLED = "1";
    process.env.SIMPLE_SSO_NO_LOGIN = "1";
    const spy = jest.spyOn(SystemSettings, "isMultiUserMode");
    const next = jest.fn();
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      locals: { multiUserMode: true },
    };

    await simpleSSOLoginDisabledMiddleware({}, response, next);

    expect(spy).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });
});
