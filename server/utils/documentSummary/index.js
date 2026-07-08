// SPDX-License-Identifier: MIT
/**
 * Document summary generation and caching.
 *
 * Summaries are generated on demand via an LLM and stored in the
 * `cache_data` table (name = "doc_summary", belongsTo = docId).
 * They are regenerated only when the source document changes.
 *
 * Concept ported from open-notebook documents/summary.py (MIT licence).
 */

const consoleLogger = require("../logger/console.js");
const fs = require("fs");
const path = require("path");
const { getStoragePath } = require("../paths");
const { getLLMProvider } = require("../helpers");
const prisma = require("../../utils/prisma");

const SUMMARY_CACHE_NAME = "doc_summary";

const SUMMARY_SYSTEM_PROMPT = `Du bist ein präziser Dokumenten-Analyst. Erstelle eine strukturierte Zusammenfassung des folgenden Dokuments.

Deine Zusammenfassung soll enthalten:
1. Kernthema: Ein Satz, der das Hauptthema des Dokuments beschreibt.
2. Wichtigste Punkte: Die 3-5 wichtigsten Erkenntnisse oder Fakten (Aufzählung).
3. Schlüsselbegriffe: Maximal 5 relevante Fachbegriffe oder Namen.
4. Relevanz: Für welche Fragen oder Themen ist dieses Dokument besonders nützlich?

Antworte ausschließlich mit der Zusammenfassung, ohne Einleitung oder Meta-Kommentare. Antworte auf Deutsch.`;

/**
 * Generates and caches a summary for a workspace document.
 *
 * @param {object} params
 * @param {import("@prisma/client").workspace_documents} params.document - Prisma workspace_documents record
 * @param {object} params.workspace  - workspace record (for chatProvider/chatModel)
 * @param {boolean} [params.forceRefresh=false] - skip cache and regenerate
 * @returns {Promise<string|null>} summary text or null on failure
 */
async function generateDocumentSummary({
  document,
  workspace,
  forceRefresh = false,
}) {
  const cacheKey = `${SUMMARY_CACHE_NAME}:${document.docId}`;

  // Return cached entry when available and not stale.
  if (!forceRefresh) {
    try {
      const cached = await prisma.cache_data.findFirst({
        where: {
          name: SUMMARY_CACHE_NAME,
          belongsTo: "doc_summary",
          byId: document.id,
          expiresAt: { gte: new Date() },
        },
      });
      if (cached?.data) {
        const parsed = JSON.parse(cached.data);
        if (parsed?.summary) return parsed.summary;
      }
    } catch (e) {
      consoleLogger.error(`[DocumentSummary] Cache read error (${cacheKey}):`, e.message);
    }
  }

  // Load raw page content from storage.
  const documentsPath = getStoragePath("documents");
  const filePath = path.resolve(documentsPath, document.docpath);
  if (!fs.existsSync(filePath)) {
    consoleLogger.error(`[DocumentSummary] File not found: ${document.docpath}`);
    return null;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
  } catch (e) {
    consoleLogger.error(`[DocumentSummary] Failed to parse file ${document.docpath}:`, e.message);
    return null;
  }

  if (!data?.pageContent) return null;

  const LLMConnector = getLLMProvider({
    provider: workspace?.chatProvider,
    model: workspace?.chatModel,
  });

  // Truncate to keep within prompt window (leave 2 000 tokens for response).
  const maxChars = Math.min(
    (LLMConnector.promptWindowLimit() - 2_000) * 4,
    200_000,
  );
  const content = String(data.pageContent).slice(0, maxChars);

  let summary = null;
  try {
    const result = await LLMConnector.getChatCompletion(
      [
        { role: "system", content: SUMMARY_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Dokument: ${document.filename}\n\n${content}`,
        },
      ],
      { temperature: 0.3 },
    );
    summary = result?.textResponse?.trim() || null;
  } catch (e) {
    consoleLogger.error(`[DocumentSummary] LLM call failed for ${document.docpath}:`, e.message);
    return null;
  }

  if (!summary) return null;

  // Persist to cache (TTL: 7 days, keyed by document DB id).
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  try {
    // Upsert: delete old entry then create fresh.
    await prisma.cache_data.deleteMany({
      where: {
        name: SUMMARY_CACHE_NAME,
        belongsTo: "doc_summary",
        byId: document.id,
      },
    });
    await prisma.cache_data.create({
      data: {
        name: SUMMARY_CACHE_NAME,
        belongsTo: "doc_summary",
        byId: document.id,
        data: JSON.stringify({ summary }),
        expiresAt,
      },
    });
  } catch (e) {
    consoleLogger.error(`[DocumentSummary] Cache write error:`, e.message);
  }

  consoleLogger.log(`[DocumentSummary] Generated summary for: ${document.filename}`);
  return summary;
}

/**
 * Retrieves a cached summary without generating a new one.
 *
 * @param {number} documentId - workspace_documents.id
 * @returns {Promise<string|null>}
 */
async function getCachedSummary(documentId) {
  try {
    const cached = await prisma.cache_data.findFirst({
      where: {
        name: SUMMARY_CACHE_NAME,
        belongsTo: "doc_summary",
        byId: documentId,
        expiresAt: { gte: new Date() },
      },
    });
    if (cached?.data) {
      const parsed = JSON.parse(cached.data);
      return parsed?.summary ?? null;
    }
  } catch (e) {
    consoleLogger.error(`[DocumentSummary] getCachedSummary error:`, e.message);
  }
  return null;
}

module.exports = { generateDocumentSummary, getCachedSummary };
