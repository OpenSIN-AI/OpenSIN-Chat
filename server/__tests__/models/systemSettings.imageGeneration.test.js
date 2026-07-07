// SPDX-License-Identifier: MIT
// Regression tests for image_generation validators.
// Covers SSRF prevention (base_path), key wipe fix (api_key),
// and model preservation (model).

describe("SystemSettings image_generation validators", () => {
  const { SystemSettings } = require("../../models/systemSettings");
  const v = SystemSettings.validations;

  describe("base_path", () => {
    it.each(["ftp://host", "file:///etc/passwd", "javascript:alert(1)", "not a url"])(
      "returns undefined (keeps existing) for %s",
      (input) => {
        expect(v.image_generation_base_path(input)).toBeUndefined();
      }
    );

    it("returns undefined on empty string", () => {
      expect(v.image_generation_base_path("")).toBeUndefined();
    });

    it("returns undefined on null", () => {
      expect(v.image_generation_base_path(null)).toBeUndefined();
    });

    it("accepts https:// and normalizes trailing slashes", () => {
      expect(v.image_generation_base_path("https://api.example.com/v1///")).toBe(
        "https://api.example.com/v1"
      );
    });

    it("accepts http:// and normalizes trailing slashes", () => {
      expect(v.image_generation_base_path("http://localhost:1234/")).toBe(
        "http://localhost:1234"
      );
    });

    it("accepts https:// without trailing slash", () => {
      expect(v.image_generation_base_path("https://api.openai.com")).toBe(
        "https://api.openai.com"
      );
    });
  });

  describe("api_key", () => {
    it("returns undefined on empty (never wipes the stored key)", async () => {
      expect(await v.image_generation_api_key("")).toBeUndefined();
    });

    it("returns null only for the -CLEAR- sentinel", async () => {
      expect(await v.image_generation_api_key("-CLEAR-")).toBeNull();
    });

    it("preserves the stored key for a masked echo", async () => {
      jest
        .spyOn(SystemSettings, "get")
        .mockResolvedValueOnce({ value: "sk-stored" });
      expect(await v.image_generation_api_key("******")).toBe("sk-stored");
    });

    it("trims a real key", async () => {
      expect(await v.image_generation_api_key("  sk-new  ")).toBe("sk-new");
    });

    it("returns undefined for null input", async () => {
      expect(await v.image_generation_api_key(null)).toBeUndefined();
    });
  });

  describe("model", () => {
    it("returns undefined on empty (regression: was null = wipe)", () => {
      expect(v.image_generation_model("")).toBeUndefined();
    });

    it("returns undefined on null", () => {
      expect(v.image_generation_model(null)).toBeUndefined();
    });

    it("trims a real model name", () => {
      expect(v.image_generation_model("  dall-e-3  ")).toBe("dall-e-3");
    });
  });
});