// SPDX-License-Identifier: MIT
/* eslint-env jest, node */

/**
 * Regression test for the production issue where a stale container image
 * was missing `server/utils/helpers/reasoningFilter.js` and LMStudioLLM
 * crashed on load with "Cannot find module '../../helpers/reasoningFilter'".
 *
 * The provider now catches the missing helper and falls back to a
 * pass-through parser, so the rest of the provider can still be loaded.
 */

describe("LMStudioLLM reasoningFilter fallback", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("loads without crashing when reasoningFilter is missing", () => {
    jest.doMock("../../utils/helpers/reasoningFilter", () => {
      throw new Error("Cannot find module '../../helpers/reasoningFilter'");
    });

    expect(() => {
      require("../../utils/AiProviders/lmStudio/index.js");
    }).not.toThrow();
  });
});
