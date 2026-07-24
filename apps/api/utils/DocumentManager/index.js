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
   * Unified always-on context loader.
   *
   * Includes documents that should be prepended to every chat turn:
   * - contextMode === "summary" → LLM summary
   * - contextMode === "full"    → full page content
   * - legacy pinned=true with contextMode off/null → treated as full
   *
   * Deduplicates by docId so a doc that is both pinned and full is loaded once.
   *
   * @returns {Promise<Array<{pageContent: string, token_count_estimate: number, filename: string, docId: string, contextMode: string}>>}
   */
  async alwaysOnContextDocs() {
    if (!this.workspace) return [];
    const { Document } = require("../../models/documents");
    const { generateDocumentSummary } = require("../documentSummary");

    const docs = await Document.where({
      workspaceId: Number(this.workspace.id),
      OR: [{ pinned: true }, { contextMode: { in: ["summary", "full"] } }],
    });

    if (docs.length === 0) return [];

    // Dedupe by docId (same document must not be injected twice).
    const byDocId = new Map();
    for (const doc of docs) {
      if (!byDocId.has(doc.docId)) byDocId.set(doc.docId, doc);
    }

    const results = await Promise.all(
      Array.from(byDocId.values()).map(async (doc) => {
        const mode =
          doc.contextMode === "summary"
            ? "summary"
            : doc.contextMode === "full" || doc.pinned
              ? "full"
              : "off";

        if (mode === "off") return null;

        if (mode === "summary") {
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
            title: doc.filename,
          };
        }

        // full (explicit or legacy pin)
        const data = await this.loadPinnedDocument(doc.docpath).catch((e) => {
          this.log(
            `Failed to load full-context document ${doc.docpath}: ${e.message}`,
          );
          return null;
        });
        if (!data) return null;
        return {
          ...data,
          docId: doc.docId,
          contextMode: "full",
        };
      }),
    );

    let tokens = 0;
    const contextDocs = [];
    for (const data of results) {
      if (!data) continue;
      if (tokens >= this.maxTokens) {
        this.log(
          `Skipping always-on document — token limit of ${this.maxTokens} already exceeded.`,
        );
        continue;
      }
      contextDocs.push(data);
      tokens += data.token_count_estimate || 0;
    }

    this.log(
      `Found ${contextDocs.length} always-on sources — prepending with ~${tokens} tokens.`,
    );
    return contextDocs;
  }

  /**
   * @deprecated Prefer alwaysOnContextDocs(). Kept for callers that still
   * request "context mode" docs; now returns the unified always-on set.
   */
  async contextModeDocs() {
    return this.alwaysOnContextDocs();
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

  /**
   * Always-on full/summary context for a workspace.
   * Historically only returned pinned docs; now returns the unified set
   * (legacy pin + contextMode summary/full) without duplicates.
   */
  async pinnedDocs() {
    return this.alwaysOnContextDocs();
  }
}

module.exports.DocumentManager = DocumentManager;
