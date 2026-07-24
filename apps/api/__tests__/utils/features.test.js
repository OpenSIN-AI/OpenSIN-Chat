// SPDX-License-Identifier: MIT

const {
  featureSnapshot,
  isFeatureEnabled,
  parseBoolean,
} = require("../../utils/features");

describe("feature flags", () => {
  test.each(["1", "true", "TRUE", "yes", "on"])(
    "recognizes %s as enabled",
    (value) => {
      expect(parseBoolean(value)).toBe(true);
    },
  );

  test.each(["0", "false", "FALSE", "no", "off", ""])(
    "recognizes %s as disabled",
    (value) => {
      expect(parseBoolean(value, true)).toBe(false);
    },
  );

  test("high-risk features are disabled by default", () => {
    expect(featureSnapshot({})).toEqual({
      imageGeneration: false,
      videoGeneration: false,
      cvoiceTts: false,
    });
  });

  test("features require explicit activation", () => {
    expect(
      isFeatureEnabled("imageGeneration", {
        ENABLE_IMAGE_GENERATION: "true",
      }),
    ).toBe(true);

    expect(
      isFeatureEnabled("videoGeneration", {
        ENABLE_VIDEO_GENERATION: "false",
      }),
    ).toBe(false);
  });

  test("unknown feature names fail closed", () => {
    expect(() => isFeatureEnabled("doesNotExist", {})).toThrow(
      "Unknown feature flag",
    );
  });
});
