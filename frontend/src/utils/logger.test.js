// SPDX-License-Identifier: MIT
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("logger", () => {
  let logger;
  let logSpy;
  let infoSpy;
  let warnSpy;
  let errorSpy;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("when DEV is true", () => {
    beforeEach(async () => {
      vi.stubEnv("DEV", true);
      vi.resetModules();
      const mod = await import("./logger");
      logger = mod.default;
    });

    it("debug calls console.log", () => {
      logger.debug("msg");
      expect(logSpy).toHaveBeenCalledWith("msg");
    });

    it("info calls console.info", () => {
      logger.info("msg");
      expect(infoSpy).toHaveBeenCalledWith("msg");
    });

    it("warn calls console.warn", () => {
      logger.warn("msg");
      expect(warnSpy).toHaveBeenCalledWith("msg");
    });

    it("error calls console.error", () => {
      logger.error("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
    });
  });

  describe("when DEV is false", () => {
    beforeEach(async () => {
      vi.stubEnv("DEV", false);
      vi.resetModules();
      const mod = await import("./logger");
      logger = mod.default;
    });

    it("debug is silent", () => {
      logger.debug("msg");
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("info is silent", () => {
      logger.info("msg");
      expect(infoSpy).not.toHaveBeenCalled();
    });

    it("warn still calls console.warn", () => {
      logger.warn("msg");
      expect(warnSpy).toHaveBeenCalledWith("msg");
    });

    it("error still calls console.error", () => {
      logger.error("msg");
      expect(errorSpy).toHaveBeenCalledWith("msg");
    });
  });
});
