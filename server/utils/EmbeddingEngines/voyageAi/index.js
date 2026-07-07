// SPDX-License-Identifier: MIT
const consoleLogger = require("../../logger/console.js");

// Direct Voyage AI REST API — no @langchain/community dependency.
// API docs: https://docs.voyageai.com/docs/embeddings
const VOYAGE_EMBED_URL = "https://api.voyageai.com/v1/embeddings";
const VOYAGE_BATCH_SIZE = 128; // Voyage AI's per-request limit

class VoyageAiEmbedder {
  constructor() {
    if (!process.env.VOYAGEAI_API_KEY)
      throw new Error("No Voyage AI API key was set.");

    this.apiKey = process.env.VOYAGEAI_API_KEY;
    this.model = process.env.EMBEDDING_MODEL_PREF || "voyage-3-lite";
    this.maxConcurrentChunks = VOYAGE_BATCH_SIZE;
    this.embeddingMaxChunkLength = this.#getMaxEmbeddingLength();
  }

  // https://docs.voyageai.com/docs/embeddings
  #getMaxEmbeddingLength() {
    switch (this.model) {
      case "voyage-finance-2":
      case "voyage-multilingual-2":
      case "voyage-3":
      case "voyage-3-lite":
      case "voyage-3-large":
      case "voyage-code-3":
        return 32_000;
      case "voyage-large-2-instruct":
      case "voyage-law-2":
      case "voyage-code-2":
      case "voyage-large-2":
        return 16_000;
      case "voyage-2":
        return 4_000;
      default:
        return 4_000;
    }
  }

  async #embed(inputs) {
    const response = await fetch(VOYAGE_EMBED_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model: this.model, input: inputs }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 429)
        throw new Error("Voyage AI failed to embed: Rate limit reached");
      throw new Error(
        `Voyage AI embedding request failed (${response.status}): ${body}`,
      );
    }

    const json = await response.json();
    // Sort by index to guarantee order, then extract the embedding vectors.
    return json.data
      .sort((a, b) => a.index - b.index)
      .map((item) => item.embedding);
  }

  async embedTextInput(textInput) {
    const inputs = Array.isArray(textInput) ? textInput : [textInput];
    const result = await this.#embed(inputs);
    if (!result) return [];
    return Array.isArray(textInput) ? result : result.flat();
  }

  async embedChunks(textChunks = []) {
    if (textChunks.length === 0) return [];
    try {
      // Voyage AI's per-request limit is 128 — batch if needed.
      const results = [];
      for (let i = 0; i < textChunks.length; i += VOYAGE_BATCH_SIZE) {
        const batch = textChunks.slice(i, i + VOYAGE_BATCH_SIZE);
        const embeddings = await this.#embed(batch);
        results.push(...embeddings);
      }
      return results;
    } catch (error) {
      consoleLogger.error("Voyage AI Failed to embed:", error);
      throw error;
    }
  }
}

module.exports = {
  VoyageAiEmbedder,
};
