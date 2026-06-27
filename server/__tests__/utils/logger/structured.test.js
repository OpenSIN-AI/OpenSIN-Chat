// SPDX-License-Identifier: MIT
const {
  logger,
  createModuleLogger,
  LEVELS,
} = require("../../../utils/logger/structured");

describe("structured logger", () => {
  let logSpy;
  let errorSpy;
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    process.env = { ...ORIGINAL_ENV };
  });

  it("exposes the standard log levels", () => {
    expect(LEVELS).toEqual({ debug: 0, info: 1, warn: 2, error: 3 });
  });

  it("includes the module name and message in output", () => {
    process.env.LOG_LEVEL = "info";
    logger.info("genericOpenAi", "hello world");
    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain("[genericOpenAi]");
    expect(output).toContain("hello world");
    expect(output).toContain("INFO");
  });

  it("routes error level to console.error", () => {
    process.env.LOG_LEVEL = "info";
    logger.error("mod", "boom");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("filters out entries below the configured LOG_LEVEL", () => {
    process.env.LOG_LEVEL = "warn";
    logger.debug("mod", "debug msg");
    logger.info("mod", "info msg");
    expect(logSpy).not.toHaveBeenCalled();

    logger.warn("mod", "warn msg");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("defaults to info level when LOG_LEVEL is unset or invalid", () => {
    delete process.env.LOG_LEVEL;
    logger.debug("mod", "should be filtered");
    expect(logSpy).not.toHaveBeenCalled();
    logger.info("mod", "should pass");
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("emits valid machine-readable JSON when LOG_FORMAT=json", () => {
    process.env.LOG_LEVEL = "debug";
    process.env.LOG_FORMAT = "json";
    logger.info("billing", "charge created", { amount: 42, currency: "usd" });
    const output = logSpy.mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      level: "info",
      module: "billing",
      message: "charge created",
      amount: 42,
      currency: "usd",
    });
    expect(typeof parsed.ts).toBe("string");
  });

  it("binds the module name with createModuleLogger", () => {
    process.env.LOG_LEVEL = "info";
    const moduleLogger = createModuleLogger("ContextWindowFinder");
    moduleLogger.info("cache primed");
    const output = logSpy.mock.calls[0][0];
    expect(output).toContain("[ContextWindowFinder]");
    expect(output).toContain("cache primed");
  });
});
