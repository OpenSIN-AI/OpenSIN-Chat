// SPDX-License-Identifier: MIT

const {
  supportedTTSProvider,
} = require("../../../utils/helpers/updateENV/validators");

describe("product-focused TTS providers", () => {
  test("accepts maintained providers", () => {
    for (const provider of [
      "native",
      "openai",
      "elevenlabs",
      "piper_local",
      "generic-openai",
      "kokoro",
      "nvidia-nim",
    ]) {
      expect(supportedTTSProvider(provider)).toBeNull();
    }
  });

  test("rejects removed celebrity and cloning providers", () => {
    expect(supportedTTSProvider("cvoice")).toMatch(/not a valid TTS provider/);
    expect(supportedTTSProvider("voice-clone")).toMatch(
      /not a valid TTS provider/,
    );
  });
});
