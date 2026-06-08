// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

jest.mock("../../../utils/http", () => ({
  reqBody: jest.fn((req) => req.body),
}));

jest.mock("dotenv", () => ({
  config: jest.fn(),
}), { virtual: true });

const RuntimeSettings = require("../../../utils/runtimeSettings");

describe("RuntimeSettings", () => {
  let settings;

  beforeEach(() => {
    jest.clearAllMocks();
    RuntimeSettings._instance = null;
    settings = new RuntimeSettings();
  });

  afterEach(() => {
    RuntimeSettings._instance = null;
  });

  it("is a singleton", () => {
    const s1 = new RuntimeSettings();
    const s2 = new RuntimeSettings();
    expect(s1).toBe(s2);
  });

  describe("get", () => {
    it("returns the default value when setting is not set", () => {
      expect(settings.get("seenAnyIpWarning")).toBe(false);
      expect(settings.get("allowAnyIp")).toBe(false);
      expect(settings.get("browserLaunchArgs")).toEqual([]);
    });

    it("throws for an invalid setting key", () => {
      expect(() => settings.get("nonexistent")).toThrow(
        "Invalid runtime setting: nonexistent"
      );
    });
  });

  describe("set", () => {
    it("validates and stores the value for seenAnyIpWarning", () => {
      settings.set("seenAnyIpWarning", "true");
      expect(settings.get("seenAnyIpWarning")).toBe(true);
    });

    it("validates and stores the value for allowAnyIp", () => {
      settings.set("allowAnyIp", "true");
      expect(settings.get("allowAnyIp")).toBe(true);
      settings.set("allowAnyIp", "false");
      expect(settings.get("allowAnyIp")).toBe(false);
    });

    it("validates browserLaunchArgs from a string", () => {
      settings.set("browserLaunchArgs", "--no-sandbox, --disable-gpu");
      expect(settings.get("browserLaunchArgs")).toEqual([
        "--no-sandbox",
        "--disable-gpu",
      ]);
    });

    it("validates browserLaunchArgs from an array", () => {
      settings.set("browserLaunchArgs", ["--no-sandbox", "  --disable-gpu  "]);
      expect(settings.get("browserLaunchArgs")).toEqual([
        "--no-sandbox",
        "--disable-gpu",
      ]);
    });

    it("throws for an invalid setting key on set", () => {
      expect(() => settings.set("nonexistent", "value")).toThrow(
        "Invalid runtime setting: nonexistent"
      );
    });

    it("non-true string values result in false for boolean settings", () => {
      settings.set("allowAnyIp", "yes");
      expect(settings.get("allowAnyIp")).toBe(false);
    });
  });

  describe("parseOptionsFromRequest", () => {
    const { reqBody } = require("../../../utils/http");

    it("parses runtime settings from request body", () => {
      reqBody.mockReturnValue({
        options: { runtimeSettings: { allowAnyIp: "true" } },
      });
      settings.parseOptionsFromRequest({ body: {} });
      expect(settings.get("allowAnyIp")).toBe(true);
    });

    it("ignores unknown setting keys", () => {
      reqBody.mockReturnValue({
        options: { runtimeSettings: { unknownKey: "value" } },
      });
      settings.parseOptionsFromRequest({ body: {} });
      expect(() => settings.get("unknownKey")).toThrow();
    });

    it("handles empty request body gracefully", () => {
      reqBody.mockReturnValue({});
      expect(() =>
        settings.parseOptionsFromRequest({ body: {} })
      ).not.toThrow();
    });

    it("handles null request gracefully", () => {
      reqBody.mockReturnValue(undefined);
      expect(() => settings.parseOptionsFromRequest()).not.toThrow();
    });

    it("persists settings across multiple parse calls", () => {
      reqBody.mockReturnValue({
        options: { runtimeSettings: { allowAnyIp: "true" } },
      });
      settings.parseOptionsFromRequest({ body: {} });

      reqBody.mockReturnValue({
        options: { runtimeSettings: { seenAnyIpWarning: "true" } },
      });
      settings.parseOptionsFromRequest({ body: {} });

      expect(settings.get("allowAnyIp")).toBe(true);
      expect(settings.get("seenAnyIpWarning")).toBe(true);
    });
  });
});
