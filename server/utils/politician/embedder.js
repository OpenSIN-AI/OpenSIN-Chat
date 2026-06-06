// SPDX-License-Identifier: MIT
/**
 * Embedding utility for politician speeches — chunking + vector embedding
 * using the existing NativeEmbedder from OpenAfD.
 *
 * Docs: embedder.doc.md
 * Purpose: Takes politician speech text, splits into chunks, and generates
 * vector embeddings for semantic search.
 */

const { NativeEmbedder } = require("../EmbeddingEngines/native");
const { TextSplitter } = require("../TextSplitter");

class PoliticianEmbedder {
  constructor() {
    this.embedder = new NativeEmbedder();
  }

  log(text, ...args) {
    console.log(`\x1b[36m[PoliticianEmbedder]\x1b[0m ${text}`, ...args);
  }

  /**
   * Chunk a single speech text into embeddable segments.
   * @param {string} text
   * @param {Object} metadata - metadata to attach to each chunk
   * @returns {Promise<Array<{text: string, metadata: Object}>>}
   */
  async chunkText(text, metadata = {}) {
    const splitter = new TextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
      chunkHeaderMeta: TextSplitter.buildHeaderMeta(metadata),
    });
    const chunks = await splitter.splitText(text);
    return chunks.map((chunk, i) => ({
      text: chunk,
      metadata: { ...metadata, chunkIndex: i },
    }));
  }

  /**
   * Embed a single text string to a vector.
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embedText(text) {
    return this.embedder.embedTextInput(text);
  }

  /**
   * Embed multiple text chunks to vectors.
   * @param {string[]} textChunks
   * @returns {Promise<number[][]>}
   */
  async embedChunks(textChunks) {
    return this.embedder.embedChunks(textChunks);
  }
}

module.exports = { PoliticianEmbedder };
