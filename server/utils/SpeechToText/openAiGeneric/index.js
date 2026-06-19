// SPDX-License-Identifier: MIT
const { convertAudioBufferToWav } = require("../helpers");
const path = require("path");

class GenericOpenAiSTT {
  constructor() {
    if (!process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT)
      throw new Error(
        "No OpenAI compatible endpoint was set. Please set this to use your OpenAI compatible STT service.",
      );
    if (!process.env.STT_OPEN_AI_COMPATIBLE_KEY)
      this.#log(
        "No OpenAI compatible API key was set. You might need to set this to use your OpenAI compatible STT service.",
      );
    if (!process.env.STT_OPEN_AI_COMPATIBLE_MODEL)
      this.#log(
        "No OpenAI compatible STT model was set. We will use the default model 'whisper-1'. This may not exist or be valid for your selected endpoint.",
      );

    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      apiKey: process.env.STT_OPEN_AI_COMPATIBLE_KEY || null,
      baseURL: process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT,
      timeout: 120_000,
    });
    this.model = process.env.STT_OPEN_AI_COMPATIBLE_MODEL ?? "whisper-1";
    this.#log(
      `Service (${process.env.STT_OPEN_AI_COMPATIBLE_ENDPOINT}) with model: ${this.model}`,
    );
  }

  #log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[32m[OpenAiGenericSTT]\x1b[0m ${text}`, ...args);
  }

  /**
   * Transcribes an audio buffer to text using an OpenAI-compatible STT service.
   * @param {Buffer} audioBuffer - The audio buffer to be transcribed.
   * @param {string} filename - Original filename, used to hint the audio container/codec to the service.
   * @returns {Promise<string>} The transcribed text.
   */
  async transcribe(audioBuffer, filename = "audio.webm") {
    try {
      const { toFile } = require("openai");
      const extension = path.extname(filename).toLowerCase() || ".webm";
      let payloadBuffer = audioBuffer;
      let payloadFilename = filename;
      if (extension !== ".wav") {
        payloadBuffer = await convertAudioBufferToWav(audioBuffer, extension);
        payloadFilename = "audio.wav";
      }
      const file = await toFile(payloadBuffer, payloadFilename);
      const result = await this.openai.audio.transcriptions.create({
        file,
        model: this.model,
      });
      return result?.text ?? "";
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`GenericOpenAiSTT:transcribe failed: ${e?.message || e}`);
      throw new Error(`STT transcription failed: ${e?.message || "Unknown error"}`);
    }
  }
}

module.exports = { GenericOpenAiSTT };
