// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");

const { getStoragePath } = require("../paths");
const fs = require("fs");
const path = require("path");

const documentsPath = getStoragePath("documents");

class DocumentManager {
  constructor({ workspace = null, maxTokens = null }) {
    this.workspace = workspace;
    this.maxTokens = maxTokens || Number.POSITIVE_INFINITY;
    this.documentStoragePath = documentsPath;
  }

  log(text, ...args) {
    consoleLogger.log(`\x1b[36m[DocumentManager]\x1b[0m ${text}`, ...args);
  }

  async pinnedDocuments() {
    if (!this.workspace) return [];
    const { Document } = require("../../models/documents");
    return await Document.where({
      workspaceId: Number(this.workspace.id),
      pinned: true,
    });
  }

  async loadPinnedDocument(docPath) {
    const filePath = path.resolve(this.documentStoragePath, docPath);
    const data = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));

    if (
      !Object.prototype.hasOwnProperty.call(data, "pageContent") ||
      !Object.prototype.hasOwnProperty.call(data, "token_count_estimate")
    ) {
      this.log(
        `Skipping document - Could not find page content or token_count_estimate in pinned source.`,
      );
      return null;
    }

    return data;
  }

  async pinnedDocs() {
    if (!this.workspace) return [];
    const docPaths = (await this.pinnedDocuments()).map((doc) => doc.docpath);
    if (docPaths.length === 0) return [];

    const results = await Promise.all(
      docPaths.map((docPath) =>
        this.loadPinnedDocument(docPath).catch((e) => {
          this.log(`Failed to load pinned document ${docPath}: ${e.message}`);
          return null;
        }),
      ),
    );

    let tokens = 0;
    const pinnedDocs = [];
    for (const data of results) {
      if (!data) continue;

      if (tokens >= this.maxTokens) {
        this.log(
          `Skipping document - Token limit of ${this.maxTokens} has already been exceeded by pinned documents.`,
        );
        continue;
      }

      pinnedDocs.push(data);
      tokens += data.token_count_estimate || 0;
    }

    this.log(
      `Found ${pinnedDocs.length} pinned sources - prepending to content with ~${tokens} tokens of content.`,
    );
    return pinnedDocs;
  }

  /**
   * Returns documents marked for context-mode inclusion (contextMode="summary"|"full").
   * These are documents that should always be part of every conversation, either
   * as a summary or full text. Currently returns an empty array since the
   * contextMode schema field is not yet implemented — see issue tracker.
   * @returns {Promise<Array>} Array of context-mode documents
   */
  async contextModeDocs() {
    if (!this.workspace) return [];
    // TODO: Implement when contextMode schema field is added.
    // For now, return empty array so callers don't break.
    return [];
  }
}

module.exports.DocumentManager = DocumentManager;
