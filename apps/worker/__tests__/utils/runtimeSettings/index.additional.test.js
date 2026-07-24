// SPDX-License-Identifier: MIT
jest.mock("dotenv", () => ({ config: jest.fn() }), { virtual: true });
jest.mock("../../../utils/http", () => ({
  reqBody: jest.fn(),
}));

const RuntimeSettings = require("../../../utils/runtimeSettings");

describe("RuntimeSettings", () => {
  let settings;

  beforeEach(() => {
    RuntimeSettings._instance = null;
    settings = new RuntimeSettings();
  });

  describe("constructor", () => {
    test("creates instance with empty settings", () => {
      expect(settings.settings).toEqual({});
    });

    test("returns singleton on second instantiation", () => {
      const s1 = new RuntimeSettings();
      const s2 = new RuntimeSettings();
      expect(s1).toBe(s2);
    });
  });

  describe("get", () => {
    test("returns default value for unset setting", () => {
      expect(settings.get("seenAnyIpWarning")).toBe(false);
      expect(settings.get("allowAnyIp")).toBe(false);
      expect(settings.get("browserLaunchArgs")).toEqual([]);
    });

    test("returns set value", () => {
      settings.set("allowAnyIp", "true");
      expect(settings.get("allowAnyIp")).toBe(true);
    });

    test("throws for invalid setting key", () => {
      expect(() => settings.get("invalidKey")).toThrow("Invalid runtime setting: invalidKey");
    });
  });

  describe("set", () => {
    test("sets boolean-like string to true", () => {
      settings.set("allowAnyIp", "true");
      expect(settings.get("allowAnyIp")).toBe(true);
    });

    test("sets boolean-like string to false", () => {
      settings.set("allowAnyIp", "false");
      expect(settings.get("allowAnyIp")).toBe(false);
    });

    test("sets browserLaunchArgs from array", () => {
      settings.set("browserLaunchArgs", ["--no-sandbox", "--disable-gpu"]);
      expect(settings.get("browserLaunchArgs")).toEqual(["--no-sandbox", "--disable-gpu"]);
    });

    test("sets browserLaunchArgs from comma-separated string", () => {
      settings.set("browserLaunchArgs", "--no-sandbox, --disable-gpu");
      expect(settings.get("browserLaunchArgs")).toEqual(["--no-sandbox", "--disable-gpu"]);
    });

    test("throws for invalid setting key", () => {
      expect(() => settings.set("invalidKey", "value")).toThrow("Invalid runtime setting: invalidKey");
    });

    test("uses null as default value", () => {
      settings.set("allowAnyIp", null);
      // null is converted by validate, "null" !== "true" so false
      expect(settings.get("allowAnyIp")).toBe(false);
    });
  });

  describe("parseOptionsFromRequest", () => {
    test("parses options from request body", () => {
      const { reqBody } = require("../../../utils/http");
      reqBody.mockReturnValue({
        options: {
          runtimeSettings: {
            allowAnyIp: "true",
          },
        },
      });
      settings.parseOptionsFromRequest({});
      expect(settings.get("allowAnyIp")).toBe(true);
    });

    test("ignores invalid settings", () => {
      const { reqBody } = require("../../../utils/http");
      reqBody.mockReturnValue({
        options: {
          runtimeSettings: {
            invalidKey: "value",
            allowAnyIp: "true",
          },
        },
      });
      settings.parseOptionsFromRequest({});
      expect(settings.get("allowAnyIp")).toBe(true);
      expect(settings.settings).not.toHaveProperty("invalidKey");
    });

    test("handles missing options", () => {
      const { reqBody } = require("../../../utils/http");
      reqBody.mockReturnValue({});
      settings.parseOptionsFromRequest({});
      // no throw, settings still empty
      expect(settings.settings).toEqual({});
    });

    test("handles null request body", () => {
      const { reqBody } = require("../../../utils/http");
      reqBody.mockReturnValue(null);
      // should not throw
      settings.parseOptionsFromRequest({});
    });
  });
});
