// SPDX-License-Identifier: MIT
const setLogger = require("../../../utils/logger");

describe("collector logger", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test("returns console in non-production mode", () => {
    const logger = setLogger();
    expect(logger).toBe(console);
  });

  test("returns winston logger in production mode", () => {
    process.env.NODE_ENV = "production";
    const logger = setLogger();
    expect(logger).not.toBe(console);
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
    expect(typeof logger.warn).toBe("function");
  });

  test("is a singleton", () => {
    process.env.NODE_ENV = "production";
    const a = setLogger();
    const b = setLogger();
    expect(a).toBe(b);
  });
});
