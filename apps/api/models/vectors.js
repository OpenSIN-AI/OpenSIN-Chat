// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");

const prisma = require("../utils/prisma");
const { Document } = require("./documents");

/**
 * Tracks the mapping between document chunks (docId) and their vector store
 * IDs so chunks can be found and deleted when a document is removed.
 */
const DocumentVectors = {
  /**
   * Batch-insert vector ID mappings inside a single transaction.
   * @param {Array<{docId: string, vectorId: string}>} vectorRecords
   * @returns {Promise<{documentsInserted: number}>}
   */
  bulkInsert: async function (vectorRecords = []) {
    if (vectorRecords.length === 0) return { documentsInserted: 0 };

    try {
      const inserts = [];
      vectorRecords.forEach((record) => {
        inserts.push(
          prisma.document_vectors.create({
            data: {
              docId: record.docId,
              vectorId: record.vectorId,
            },
          }),
        );
      });
      await prisma.$transaction(inserts);
      return { documentsInserted: inserts.length };
    } catch (error) {
      consoleLogger.error("Bulk insert failed", error);
      return { documentsInserted: 0 };
    }
  },

  /**
   * Find vector mappings matching the clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @param {number} [limit] - Max rows
   * @returns {Promise<Array>}
   */
  where: async function (clause = {}, limit) {
    try {
      const results = await prisma.document_vectors.findMany({
        where: clause,
        take: limit || undefined,
      });
      return results;
    } catch (error) {
      consoleLogger.error("Where query failed", error);
      return [];
    }
  },

  /**
   * Delete all vector mappings for every document in the given workspace.
   * Called when a workspace is deleted to clean up orphaned vector IDs.
   * @param {number} workspaceId
   * @returns {Promise<boolean>}
   */
  deleteForWorkspace: async function (workspaceId) {
    const documents = await Document.forWorkspace(workspaceId);
    const docIds = [...new Set(documents.map((doc) => doc.docId))];

    try {
      await prisma.document_vectors.deleteMany({
        where: { docId: { in: docIds } },
      });
      return true;
    } catch (error) {
      consoleLogger.error("Delete for workspace failed", error);
      return false;
    }
  },

  /**
   * Delete vector mappings by primary key IDs.
   * @param {number[]} [ids=[]]
   * @returns {Promise<boolean>}
   */
  deleteIds: async function (ids = []) {
    try {
      await prisma.document_vectors.deleteMany({
        where: { id: { in: ids } },
      });
      return true;
    } catch (error) {
      consoleLogger.error("Delete IDs failed", error);
      return false;
    }
  },

  /**
   * Delete vector mappings matching the given clause.
   * @param {Object} [clause={}] - Prisma where clause
   * @returns {Promise<boolean>}
   */
  delete: async function (clause = {}) {
    try {
      await prisma.document_vectors.deleteMany({ where: clause });
      return true;
    } catch (error) {
      consoleLogger.error("Delete failed", error);
      return false;
    }
  },
};

module.exports = { DocumentVectors };
