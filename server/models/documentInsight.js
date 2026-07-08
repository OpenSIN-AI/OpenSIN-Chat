// SPDX-License-Identifier: MIT
const consoleLogger = require("../utils/logger/console.js");
const prisma = require("../utils/prisma");

const DocumentInsight = {
  /**
   * Returns all insights for a given document (by docId string).
   *
   * @param {string} docId
   * @returns {Promise<Array>}
   */
  forDocument: async function (docId) {
    try {
      return await prisma.document_insights.findMany({
        where: { docId: String(docId) },
        orderBy: { createdAt: "desc" },
        include: {
          transformation: { select: { name: true } },
        },
      });
    } catch (e) {
      consoleLogger.error(e.message);
      return [];
    }
  },

  /**
   * Creates a new insight record.
   *
   * @param {{docId: string, workspaceId: number, transformationId: number, title: string, content: string}} data
   */
  create: async function ({ docId, workspaceId, transformationId, title, content }) {
    return await prisma.document_insights.create({
      data: {
        docId: String(docId),
        workspaceId: Number(workspaceId),
        transformationId: Number(transformationId),
        title,
        content,
      },
    });
  },

  delete: async function (id) {
    await prisma.document_insights.delete({ where: { id: Number(id) } });
    return true;
  },
};

module.exports = { DocumentInsight };
