// SPDX-License-Identifier: MIT
/**
 * Vector store operations for politician speeches — uses existing PGVector
 * provider for semantic search over speech contents.
 *
 * Docs: vectorStore.doc.md
 * Purpose: Store and search politician speech embeddings using the OpenSIN
 * PGVector provider. Reuses the same pgvector instance as document embeddings.
 */

const { PGVector } = require("../vectorDbProviders/pgvector");
const { PoliticianEmbedder } = require("./embedder");
const { v4: uuidv4 } = require("uuid");

const POLITICIAN_NAMESPACE = "openafd_politician_speeches";

class PoliticianVectorStore {
  constructor() {
    this.vectorDb = new PGVector();
    this.embedder = new PoliticianEmbedder();
    this.namespace = POLITICIAN_NAMESPACE;
  }

  log(text, ...args) {
    // eslint-disable-next-line no-console
    console.log(`\x1b[34m[PoliticianVectorStore]\x1b[0m ${text}`, ...args);
  }

  /**
   * Index a single speech into the vector store.
   * @param {Object} params
   * @param {string} params.speechId - unique ID of the speech record
   * @param {string} params.politicianId - politician UUID
   * @param {string} params.politicianName - full name
   * @param {string} params.party
   * @param {string} params.text - speech text content
   * @param {string} params.date - speech date
   * @param {string} params.title - TOP / agenda item title
   * @returns {Promise<{success: boolean, chunksIndexed: number, error: string|null}>}
   */
  async indexSpeech({ speechId, politicianId, politicianName, party, text, date, title }) {
    if (!text || text.trim().length === 0) {
      return { success: false, chunksIndexed: 0, error: "Empty text" };
    }

    let connection = null;
    try {
      const metadata = { speechId, politicianId, politicianName, party, date, title };
      const chunks = await this.embedder.chunkText(text, metadata);
      if (chunks.length === 0) {
        return { success: false, chunksIndexed: 0, error: "No chunks produced" };
      }

      const chunkTexts = chunks.map((c) => c.text);
      const vectors = await this.embedder.embedChunks(chunkTexts);
      if (!vectors || vectors.length === 0) {
        return { success: false, chunksIndexed: 0, error: "Embedding failed" };
      }

      // Guard: vectors must align with chunks — clamp to the shorter length
      const numVectors = Math.min(vectors.length, chunks.length);
      if (numVectors === 0) {
        return { success: false, chunksIndexed: 0, error: "Vectors/chunks length mismatch" };
      }

      connection = await this.vectorDb.connect();
      const submissions = [];
      for (let i = 0; i < numVectors; i++) {
        const vec = vectors[i];
        if (!vec) continue;
        submissions.push({
          id: uuidv4(),
          vector: vec,
          metadata: { text: chunks[i].text, ...chunks[i].metadata },
        });
      }

      await this.vectorDb.updateOrCreateCollection({
        connection,
        submissions,
        namespace: this.namespace,
        dimensions: vectors[0].length,
      });

      this.log(`Indexed ${submissions.length} chunks for speech ${speechId}`);
      return { success: true, chunksIndexed: submissions.length, error: null };
    } catch (err) {
      this.log(`Error indexing speech ${speechId}: ${err.message}`);
      return { success: false, chunksIndexed: 0, error: err.message };
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Search speeches semantically.
   * @param {Object} params
   * @param {string} params.query - natural language query
   * @param {number} [params.topN=10] - max results
   * @param {number} [params.similarityThreshold=0.25]
   * @param {string} [params.politicianId] - optionally filter to a specific politician
   * @param {string} [params.party] - optionally filter by party
   * @returns {Promise<{results: Array<{text: string, metadata: Object, score: number}>, error: string|null}>}
   */
  async searchSpeeches({ query, topN = 10, similarityThreshold = 0.25, politicianId = null, party = null }) {
    let connection = null;
    try {
      connection = await this.vectorDb.connect();
      const queryVector = await this.embedder.embedText(query);

      const result = await this.vectorDb.similarityResponse({
        client: connection,
        namespace: this.namespace,
        queryVector,
        similarityThreshold,
        topN,
      });

      // Apply optional filters post-search (PGVector namespace-level search only)
      let results = (result.sourceDocuments || []).map((doc, i) => ({
        text: (result.contextTexts || [])[i],
        metadata: doc,
        score: (result.scores || [])[i] ?? 0,
      }));

      if (politicianId) {
        results = results.filter((r) => r.metadata.politicianId === politicianId);
      }
      if (party) {
        results = results.filter((r) => r.metadata.party === party);
      }

      return { results, error: null };
    } catch (err) {
      this.log(`Error searching speeches: ${err.message}`);
      return { results: [], error: err.message };
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Delete all vectors for a specific speech.
   * @param {string} speechId
   * @returns {Promise<boolean>}
   */
  async deleteSpeech(speechId) {
    let connection = null;
    try {
      connection = await this.vectorDb.connect();
      // PGVector doesn't have a direct metadata filter delete, but we can delete by IDs
      // For now, we'd need to query first to find vector IDs by metadata match.
      const res = await connection.query(
        `DELETE FROM "${PGVector.tableName()}" WHERE namespace = $1 AND metadata->>'speechId' = $2`,
        [this.namespace, speechId],
      );
      this.log(`Deleted ${res.rowCount} vectors for speech ${speechId}`);
      return true;
    } catch (err) {
      this.log(`Error deleting speech vectors: ${err.message}`);
      return false;
    } finally {
      if (connection) await connection.end();
    }
  }

  /**
   * Check if the politician namespace exists and has vectors.
   * @returns {Promise<{exists: boolean, count: number}>}
   */
  async stats() {
    try {
      const exists = await this.vectorDb.hasNamespace(this.namespace);
      const count = await this.vectorDb.namespaceCount(this.namespace);
      return { exists, count };
    } catch (err) {
      return { exists: false, count: 0 };
    }
  }
}

module.exports = { PoliticianVectorStore, POLITICIAN_NAMESPACE };
