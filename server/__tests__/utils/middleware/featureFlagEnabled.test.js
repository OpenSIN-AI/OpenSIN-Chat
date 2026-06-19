// SPDX-License-Identifier: MIT
const {
  featureFlagEnabled,
} = require("../../../utils/middleware/featureFlagEnabled");
const { SystemSettings } = require("../../../models/systemSettings");

describe("featureFlagEnabled middleware", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns 401 when no featureFlagKey provided", async () => {
    const middleware = featureFlagEnabled();
    const next = jest.fn();
    const response = {
      sendStatus: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    await middleware({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(401);
  });

  it("returns 401 when SystemSettings.get returns null", async () => {
    jest.spyOn(SystemSettings, "get").mockResolvedValue(null);
    const middleware = featureFlagEnabled("some_flag");
    const next = jest.fn();
    const response = {
      sendStatus: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    await middleware({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(401);
  });

  it("returns 401 when SystemSettings.get returns undefined", async () => {
    jest.spyOn(SystemSettings, "get").mockResolvedValue(undefined);
    const middleware = featureFlagEnabled("some_flag");
    const next = jest.fn();
    const response = {
      sendStatus: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    await middleware({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(401);
  });

  it("returns 401 when flag value is not 'enabled'", async () => {
    jest.spyOn(SystemSettings, "get").mockResolvedValue({ value: "disabled" });
    const middleware = featureFlagEnabled("some_flag");
    const next = jest.fn();
    const response = {
      sendStatus: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    await middleware({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(401);
  });

  it("calls next when flag value is 'enabled'", async () => {
    jest.spyOn(SystemSettings, "get").mockResolvedValue({ value: "enabled" });
    const middleware = featureFlagEnabled("some_flag");
    const next = jest.fn();
    const response = {
      sendStatus: jest.fn().mockReturnThis(),
      end: jest.fn(),
    };

    await middleware({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.sendStatus).not.toHaveBeenCalled();
  });
});
