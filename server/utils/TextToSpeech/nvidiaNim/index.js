// SPDX-License-Identifier: MIT
class NvidiaNimTTS {
  // NVIDIA NIM TTS uses the OpenAI-compatible /audio/speech endpoint.
  // Docs: https://docs.nvidia.com/nim/nemo/tts/latest/getting-started.html
  static DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
  static DEFAULT_MODEL = "ai-magnify/arctic-tts";
  static DEFAULT_VOICE = "English-US.Female-1";

  constructor() {
    if (!process.env.TTS_NVIDIA_NIM_API_KEY)
      throw new Error(
        "No NVIDIA NIM API key was set. Please set TTS_NVIDIA_NIM_API_KEY.",
      );

    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: process.env.TTS_NVIDIA_NIM_API_KEY,
      baseURL:
        process.env.TTS_NVIDIA_NIM_ENDPOINT || NvidiaNimTTS.DEFAULT_BASE_URL,
      timeout: 30_000,
    });

    this.model = process.env.TTS_NVIDIA_NIM_MODEL || NvidiaNimTTS.DEFAULT_MODEL;
    this.voice =
      process.env.TTS_NVIDIA_NIM_VOICE_MODEL || NvidiaNimTTS.DEFAULT_VOICE;

    this.#log(`Model: ${this.model}, Voice: ${this.voice}`);
  }

  #log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[32m[NvidiaNimTTS]\x1b[0m ${text}`, ...args);
  }

  /**
   * Generates a buffer from the given text input using the NVIDIA NIM TTS service.
   * @param {string} textInput - The text to be converted to audio.
   * @returns {Promise<Buffer|null>} A buffer containing the audio data, or null on failure.
   */
  async ttsBuffer(textInput) {
    try {
      const result = await this.openai.audio.speech.create({
        model: this.model,
        voice: this.voice,
        input: textInput,
      });
      return Buffer.from(await result.arrayBuffer());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`NvidiaNimTTS:ttsBuffer failed: ${e?.message || e}`);
    }
    return null;
  }
}

module.exports = { NvidiaNimTTS };
