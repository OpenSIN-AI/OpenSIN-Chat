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

    it("reportError calls console.error with message and error", () => {
      const err = new Error("boom");
      logger.reportError("Failed to save", err);
      expect(errorSpy).toHaveBeenCalledWith("Failed to save", err);
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

    it("error is silent (no console.error in production)", () => {
      logger.error("msg");
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("reportError does not call console.error in production", () => {
      logger.reportError("Failed to save", new Error("boom"));
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("_extractMessage", () => {
    beforeEach(async () => {
      vi.stubEnv("DEV", true);
      vi.resetModules();
      const mod = await import("./logger");
      logger = mod.default;
    });

    it("extracts message from Error", () => {
      expect(logger._extractMessage(new Error("boom"))).toBe("boom");
    });

    it("returns strings as-is", () => {
      expect(logger._extractMessage("hello")).toBe("hello");
    });

    it("extracts message from objects with .message", () => {
      expect(logger._extractMessage({ message: "fail" })).toBe("fail");
    });
  });
});
