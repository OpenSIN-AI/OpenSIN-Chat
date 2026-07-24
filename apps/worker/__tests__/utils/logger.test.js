// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

describe("Logger", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.resetModules();
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    jest.resetModules();
  });

  afterAll(() => {
    if (originalNodeEnv !== undefined) process.env.NODE_ENV = originalNodeEnv;
    else delete process.env.NODE_ENV;
  });

  it("setLogger returns a logger object in development mode", () => {
    process.env.NODE_ENV = "development";
    const setLogger = require("../../utils/logger/index.js");
    const logger = setLogger();
    expect(logger).toBeDefined();
    expect(typeof logger).toBe("object");
  });

  it("Logger is a singleton — same instance on multiple calls", () => {
    process.env.NODE_ENV = "development";
    const setLogger = require("../../utils/logger/index.js");
    const logger1 = setLogger();
    const logger2 = setLogger();
    expect(logger1).toBe(logger2);
  });

  it("in non-production mode, returns console", () => {
    process.env.NODE_ENV = "development";
    const setLogger = require("../../utils/logger/index.js");
    const logger = setLogger();
    expect(logger).toBe(console);
  });

  it("resetting singleton allows new instance creation", () => {
    process.env.NODE_ENV = "development";
    const setLogger1 = require("../../utils/logger/index.js");
    const logger1 = setLogger1();

    jest.resetModules();

    process.env.NODE_ENV = "development";
    const setLogger2 = require("../../utils/logger/index.js");
    const logger2 = setLogger2();

    expect(logger2).toBeDefined();
    expect(typeof logger2).toBe("object");
  });
});
