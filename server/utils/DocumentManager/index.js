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

  /**
   * Returns documents whose contextMode is "summary" or "full".
   * "full" documents are loaded exactly like pinned docs (full page content).
   * "summary" documents are loaded by generating/retrieving an LLM summary and
   * returning it as a lightweight page-content substitute.
   *
   * @returns {Promise<Array<{pageContent: string, token_count_estimate: number, filename: string, docId: string, contextMode: string}>>}
   */
  async contextModeDocs() {
    if (!this.workspace) return [];
    const { Document } = require("../../models/documents");
    const { generateDocumentSummary } = require("../documentSummary");

    const docs = await Document.where({
      workspaceId: Number(this.workspace.id),
      contextMode: { in: ["summary", "full"] },
    });

    if (docs.length === 0) return [];

    const results = await Promise.all(
      docs.map(async (doc) => {
        if (doc.contextMode === "full") {
          // Reuse the same loader as pinnedDocs.
          const data = await this.loadPinnedDocument(doc.docpath).catch((e) => {
            this.log(
              `Failed to load full-context document ${doc.docpath}: ${e.message}`,
            );
            return null;
          });
          if (!data) return null;
          return { ...data, docId: doc.docId, contextMode: "full" };
        }

        // contextMode === "summary"
        const summary = await generateDocumentSummary({
          document: doc,
          workspace: this.workspace,
        });
        if (!summary) return null;

        const tokenEstimate = Math.ceil(summary.length / 4);
        return {
          pageContent: `[Zusammenfassung von: ${doc.filename}]\n\n${summary}`,
          token_count_estimate: tokenEstimate,
          filename: doc.filename,
          docId: doc.docId,
          contextMode: "summary",
        };
      }),
    );

    let tokens = 0;
    const contextDocs = [];
    for (const data of results) {
      if (!data) continue;
      if (tokens >= this.maxTokens) {
        this.log(
          `Skipping context-mode document — token limit of ${this.maxTokens} already exceeded.`,
        );
        continue;
      }
      contextDocs.push(data);
      tokens += data.token_count_estimate || 0;
    }

    this.log(
      `Found ${contextDocs.length} context-mode sources — prepending with ~${tokens} tokens.`,
    );
    return contextDocs;
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
}

module.exports.DocumentManager = DocumentManager;
