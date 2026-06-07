// SPDX-License-Identifier: MIT
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

class ElevenLabsTTS {
  constructor() {
    if (!process.env.TTS_ELEVEN_LABS_KEY)
      throw new Error("No ElevenLabs API key was set.");
    this.elevenLabs = new ElevenLabsClient({
      apiKey: process.env.TTS_ELEVEN_LABS_KEY,
    });

    // Rachel as default voice
    // https://api.elevenlabs.io/v1/voices
    this.voiceId =
      process.env.TTS_ELEVEN_LABS_VOICE_MODEL ?? "21m00Tcm4TlvDq8ikWAM";
    this.modelId = "eleven_multilingual_v2";
  }

  static async voices(apiKey = null) {
    try {
      const client = new ElevenLabsClient({
        apiKey: apiKey ?? process.env.TTS_ELEVEN_LABS_KEY ?? null,
      });
      return (await client.voices.getAll())?.voices ?? [];
    } catch {}
    return [];
  }

  /**
   * Collects a web ReadableStream<Uint8Array> into a single Buffer.
   * The v2+ ElevenLabs SDK returns a WHATWG ReadableStream rather than a
   * Node.js stream, so we consume it via its async iterator / reader.
   * @param {ReadableStream<Uint8Array>|AsyncIterable<Uint8Array>} stream
   * @returns {Promise<Buffer>}
   */
  async #stream2buffer(stream) {
    const chunks = [];

    // Preferred: WHATWG ReadableStream exposes an async iterator in Node 18+.
    if (typeof stream?.[Symbol.asyncIterator] === "function") {
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    }

    // Fallback: manually pull from the stream reader.
    if (typeof stream?.getReader === "function") {
      const reader = stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    }

    throw new Error("Unsupported audio stream type returned by ElevenLabs.");
  }

  async ttsBuffer(textInput) {
    try {
      const audio = await this.elevenLabs.textToSpeech.convert(this.voiceId, {
        text: textInput,
        modelId: this.modelId,
      });
      return await this.#stream2buffer(audio);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
    return null;
  }
}

module.exports = {
  ElevenLabsTTS,
};
