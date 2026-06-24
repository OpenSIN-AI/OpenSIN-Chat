// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

const { toChunks, reportEmbeddingProgress } = require("../../helpers");

class MistralEmbedder {
  constructor() {
    if (!process.env.MISTRAL_API_KEY)
      throw new Error("No Mistral API key was set.");

    this.className = "MistralEmbedder";
    const { OpenAI: OpenAIApi } = require("openai");
    this.openai = new OpenAIApi({
      baseURL: "https://api.mistral.ai/v1",
      apiKey: process.env.MISTRAL_API_KEY ?? null,
    });
    this.model = process.env.EMBEDDING_MODEL_PREF || "mistral-embed";
    this.maxConcurrentChunks = 50;
    this.embeddingMaxChunkLength = 8_192;
  }

  async embedTextInput(textInput) {
    const result = await this.embedChunks(
      Array.isArray(textInput) ? textInput : [textInput],
    );
    return result?.[0] || [];
  }

  async embedChunks(textChunks = []) {
    if (textChunks.length === 0) return [];

    const allEmbeddings = [];
    try {
      for (const batch of toChunks(textChunks, this.maxConcurrentChunks)) {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });
        const embeddings = response?.data?.map((emb) => emb.embedding) || [];
        if (embeddings.length === 0)
          throw new Error("Mistral returned empty embeddings for batch");
        allEmbeddings.push(...embeddings);
        reportEmbeddingProgress(allEmbeddings.length, textChunks.length);
      }
      return allEmbeddings;
    } catch (error) {
      consoleLogger.error(
        "Failed to get embeddings from Mistral.",
        error.message,
      );
      throw new Error(`Mistral Failed to embed: ${error.message}`, {
        cause: error,
      });
    }
  }
}

module.exports = {
  MistralEmbedder,
};
