// SPDX-License-Identifier: MIT
const fs = require("fs");

const OPENAI_MAX_FILE_BYTES = 25 * 1024 * 1024;
const OPENAI_TIMEOUT_MS = 600_000;

class OpenAiWhisper {
  constructor({ options }) {
    const { OpenAI: OpenAIApi } = require("openai");
    if (!options.openAiKey) throw new Error("No OpenAI API key was set.");

    this.openai = new OpenAIApi({
      apiKey: options.openAiKey,
      timeout: OPENAI_TIMEOUT_MS,
    });
    this.model = "whisper-1";
    this.temperature = 0;
    this.#log("Initialized.");
  }

  #log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[32m[OpenAiWhisper]\x1b[0m ${text}`, ...args);
  }

  async processFile(fullFilePath) {
    try {
      if (!fs.existsSync(fullFilePath))
        return { content: "", error: "Audio file does not exist." };

      const stat = fs.statSync(fullFilePath);
      if (stat.size > OPENAI_MAX_FILE_BYTES) {
        return {
          content: "",
          error: `Audio file exceeds OpenAI's 25MB limit (${(
            stat.size /
            1024 /
            1024
          ).toFixed(1)}MB).`,
        };
      }

      return await this.openai.audio.transcriptions
        .create({
          file: fs.createReadStream(fullFilePath),
          model: this.model,
          temperature: this.temperature,
        })
        .then((response) => {
          if (!response) {
            return {
              content: "",
              error: "No content was able to be transcribed.",
            };
          }

          return { content: response.text, error: null };
        })
        .catch((error) => {
          this.#log(
            `Could not get any response from openai whisper`,
            error.message
          );
          return { content: "", error: error.message };
        });
    } catch (error) {
      this.#log(`Unexpected error: ${error.message}`);
      return { content: "", error: error.message };
    }
  }
}

module.exports = {
  OpenAiWhisper,
};
