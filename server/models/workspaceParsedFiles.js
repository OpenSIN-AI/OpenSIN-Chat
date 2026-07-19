// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const crypto = require("crypto");
const prisma = require("../utils/prisma");
const { clampLimit, MAX_LIST_LIMIT } = require("../utils/database/queryLimits");
const { EventLogs } = require("./eventLogs");
const { Document } = require("./documents");
const { documentsPath, directUploadsPath } = require("../utils/files");
const { safeJsonParse } = require("../utils/http");
const fs = require("fs");
const path = require("path");

const WorkspaceParsedFiles = {
  create: async function ({
    filename,
    workspaceId,
    userId = null,
    threadId = null,
    metadata = null,
    tokenCountEstimate = 0,
  }) {
    try {
      const file = await prisma.workspace_parsed_files.create({
        data: {
          filename,
          workspaceId: parseInt(workspaceId) || null,
          userId: userId ? parseInt(userId) : null,
          threadId: threadId ? parseInt(threadId) : null,
          metadata,
          tokenCountEstimate,
        },
      });

      await EventLogs.logEvent(
        "workspace_file_uploaded",
        {
          filename,
          workspaceId,
        },
        userId,
      );

      return { file, error: null };
    } catch (error) {
      consoleLogger.error(
        "FAILED TO CREATE PARSED FILE RECORD.",
        error.message,
      );
      return { file: null, error: error.message };
    }
  },

  /**
   * Gets a parsed file by its ID or a clause.
   * @param {object} clause - The clause to filter the parsed files.
   * @returns {Promise<import("@prisma/client").workspace_parsed_files | null>} The parsed file.
   */
  get: async function (clause = {}) {
    try {
      const file = await prisma.workspace_parsed_files.findFirst({
        where: clause,
      });
      return file;
    } catch (error) {
      consoleLogger.error(error.message);
      return null;
    }
  },

  where: async function (
    clause = {},
    limit = null,
    orderBy = null,
    select = null,
  ) {
    try {
      const files = await prisma.workspace_parsed_files.findMany({
        where: clause,
        take: clampLimit(limit, { fallback: MAX_LIST_LIMIT }),
        ...(orderBy !== null ? { orderBy } : {}),
        ...(select !== null ? { select } : {}),
      });
      return files;
    } catch (error) {
      consoleLogger.error(error.message);
      return [];
    }
  },

  delete: async function (clause = {}) {
    try {
      const result = await prisma.workspace_parsed_files.deleteMany({
        where: clause,
      });
      return result.count > 0;
    } catch (error) {
      consoleLogger.error(error.message);
      return false;
    }
  },

  totalTokenCount: async function (clause = {}) {
    try {
      const { _sum } = await prisma.workspace_parsed_files.aggregate({
        where: clause,
        _sum: { tokenCountEstimate: true },
      });
      return _sum.tokenCountEstimate || 0;
    } catch (error) {
      consoleLogger.error("FAILED TO AGGREGATE TOKEN COUNT.", error.message);
      return 0;
    }
  },

  /**
   * Moves a parsed file to the documents and embeds it.
   * @param {import("@prisma/client").users | null} user - The user performing the operation.
   * @param {number} fileId - The ID of the parsed file.
   * @param {import("@prisma/client").workspaces} workspace - The workspace the file belongs to.
   * @returns {Promise<{ success: boolean, error: string | null, document: import("@prisma/client").workspace_documents | null }>} The result of the operation.
   */
  moveToDocumentsAndEmbed: async function (user = null, fileId, workspace) {
    try {
      const parsedFile = await this.get({
        id: parseInt(fileId),
        ...(user ? { userId: user.id } : {}),
        workspaceId: workspace.id,
      });
      if (!parsedFile) throw new Error("File not found");

      // Get file location from metadata
      const metadata = safeJsonParse(parsedFile.metadata, {});
      const location = metadata.location;
      if (!location) throw new Error("No file location in metadata");

      // Get file from metadata location
      const sourceFile = path.join(directUploadsPath, path.basename(location));
      if (!fs.existsSync(sourceFile)) throw new Error("Source file not found");

      // Move to custom-documents
      const customDocsPath = path.join(documentsPath, "custom-documents");
      if (!fs.existsSync(customDocsPath))
        fs.mkdirSync(customDocsPath, { recursive: true });

      // Copy the file to custom-documents
      const targetPath = path.join(customDocsPath, path.basename(location));
      fs.copyFileSync(sourceFile, targetPath);
      fs.unlinkSync(sourceFile);

      const {
        failedToEmbed = [],
        errors = [],
        embedded = [],
      } = await Document.addDocuments(
        workspace,
        [`custom-documents/${path.basename(location)}`],
        parsedFile.userId,
      );

      if (failedToEmbed.length > 0)
        throw new Error(errors?.[0] ?? "Failed to embed document");

      const document = await Document.get({
        workspaceId: workspace.id,
        docpath: embedded?.[0],
      });
      return { success: true, error: null, document };
    } catch (error) {
      consoleLogger.error("Failed to move and embed file:", error);
      return { success: false, error: error.message, document: null };
    } finally {
      // Always delete the file after processing
      await this.delete({ id: parseInt(fileId) });
    }
  },

  getContextMetadataAndLimits: async function (
    workspace,
    thread = null,
    user = null,
  ) {
    try {
      if (!workspace) throw new Error("Workspace is required");
      const files = await this.where({
        workspaceId: workspace.id,
        threadId: thread?.id || null,
        ...(user ? { userId: user.id } : {}),
      });

      const results = [];
      let totalTokens = 0;

      for (const file of files) {
        const metadata = safeJsonParse(file.metadata, {});
        totalTokens += file.tokenCountEstimate || 0;
        results.push({
          id: file.id,
          title: metadata.title || metadata.location,
          location: metadata.location,
          token_count_estimate: file.tokenCountEstimate,
        });
      }

      return {
        files: results,
        contextWindow: workspace.contextWindow ?? Infinity,
        currentContextTokenCount: totalTokens,
      };
    } catch (error) {
      consoleLogger.error("Failed to get context metadata:", error);
      return {
        files: [],
        contextWindow: Infinity,
        currentContextTokenCount: 0,
      };
    }
  },

  getContextFiles: async function (workspace, thread = null, user = null) {
    try {
      const files = await this.where({
        workspaceId: workspace.id,
        threadId: thread?.id || null,
        ...(user ? { userId: user.id } : {}),
      });

      const results = [];
      for (const file of files) {
        const metadata = safeJsonParse(file.metadata, {});
        const location = metadata.location;
        if (!location) continue;

        const sourceFile = path.join(
          directUploadsPath,
          path.basename(location),
        );
        try {
          const content = await fs.promises.readFile(sourceFile, "utf-8");
          const data = safeJsonParse(content, null);
          if (!data?.pageContent) continue;

          results.push({
            pageContent: data.pageContent,
            token_count_estimate: file.tokenCountEstimate,
            ...metadata,
          });
        } catch {
          continue;
        }
      }

      return results;
    } catch (error) {
      consoleLogger.error("Failed to get context files:", error);
      return [];
    }
  },

  /**
   * Attach an already-parsed document JSON as thread chat context
   * (WorkspaceParsedFiles), without embedding into permanent workspace knowledge.
   *
   * @param {object} params
   * @param {import("@prisma/client").workspaces} params.workspace
   * @param {import("@prisma/client").users|null} params.user
   * @param {import("@prisma/client").workspace_threads|null} params.thread
   * @param {object} params.document — collector/document JSON with pageContent
   * @param {string} [params.sourceDocpath] — original documents/ relative path if any
   * @returns {Promise<{file: object|null, error: string|null}>}
   */
  attachDocumentAsChatContext: async function ({
    workspace,
    user = null,
    thread = null,
    document,
    sourceDocpath = null,
  }) {
    try {
      if (!workspace?.id) throw new Error("Workspace is required");
      if (!document?.pageContent) throw new Error("Document has no content");

      await fs.promises.mkdir(directUploadsPath, { recursive: true });

      const safeTitle = String(
        document.title || document.name || sourceDocpath || "document",
      )
        .replace(/[^\w.\- ()[\]]+/g, "_")
        .slice(0, 120);
      const id =
        document.id ||
        crypto.randomUUID?.() ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const basename = `${safeTitle}-${id}.json`;
      const destPath = path.join(directUploadsPath, basename);

      const payload = {
        ...document,
        title: document.title || safeTitle,
        location: basename,
        // Mark as chat-context only (not a permanent embed)
        chatContextOnly: true,
        sourceDocpath: sourceDocpath || document.location || null,
      };
      await fs.promises.writeFile(
        destPath,
        JSON.stringify(payload),
        "utf-8",
      );

      const metadata = { ...payload };
      delete metadata.pageContent;

      const { file, error } = await this.create({
        filename: basename,
        workspaceId: workspace.id,
        userId: user?.id || null,
        threadId: thread?.id || null,
        metadata: JSON.stringify(metadata),
        tokenCountEstimate:
          document.token_count_estimate ||
          Math.ceil(String(document.pageContent).length / 4) ||
          0,
      });
      if (error) throw new Error(error);
      return { file, error: null };
    } catch (error) {
      consoleLogger.error(
        "FAILED TO ATTACH DOCUMENT AS CHAT CONTEXT.",
        error.message,
      );
      return { file: null, error: error.message };
    }
  },
};

module.exports = { WorkspaceParsedFiles };
