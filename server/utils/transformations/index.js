// SPDX-License-Identifier: MIT
/**
 * Applies a Transformation prompt to a workspace document and stores the result
 * as a DocumentInsight.
 *
 * Concept ported from open-notebook graphs/transformation.py and
 * domain/transformation.py (MIT licence).
 */

const consoleLogger = require("../logger/console.js");
const fs = require("fs");
const path = require("path");
const { getStoragePath } = require("../paths");
const { getLLMProvider } = require("../helpers");
const { DocumentInsight } = require("../../models/documentInsight");

/**
 * @param {object} params
 * @param {import("@prisma/client").transformations} params.transformation
 * @param {import("@prisma/client").workspace_documents} params.document
 * @param {object} params.workspace
 * @returns {Promise<import("@prisma/client").document_insights>}
 */
async function runTransformation({ transformation, document, workspace }) {
  const documentsPath = getStoragePath("documents");
  const filePath = path.resolve(documentsPath, document.docpath);
  if (!fs.existsSync(filePath))
    throw new Error(`Document file not found: ${document.docpath}`);

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, { encoding: "utf-8" }));
  } catch (e) {
    throw new Error(`Failed to read document file: ${e.message}`);
  }

  if (!data?.pageContent) throw new Error("Document has no page content");

  const LLMConnector = getLLMProvider({
    provider: workspace?.chatProvider,
    model: workspace?.chatModel,
  });

  // Truncate to keep within the prompt window (leave 2 000 tokens for response).
  const maxChars = Math.min(
    (LLMConnector.promptWindowLimit() - 2_000) * 4,
    400_000,
  );
  const content = String(data.pageContent).slice(0, maxChars);

  const result = await LLMConnector.getChatCompletion(
    [
      {
        role: "system",
        content: `${transformation.prompt}\n\nAntworte auf Deutsch. Antworte nur mit dem Ergebnis, ohne Einleitung oder Meta-Kommentare.`,
      },
      {
        role: "user",
        content: `Dokument: ${document.filename}\n\n${content}`,
      },
    ],
    { temperature: 0.3 },
  );

  const output = result?.textResponse?.trim();
  if (!output) throw new Error("LLM returned empty transformation result");

  const insight = await DocumentInsight.create({
    docId: document.docId,
    workspaceId: workspace.id,
    transformationId: transformation.id,
    title: transformation.title,
    content: output,
  });

  // Embed the insight into the workspace vector namespace so it is
  // retrievable during RAG queries and cited as a source.
  try {
    const { embedInsight } = require("./embedInsight");
    await embedInsight({ insight, document, workspace, transformation });
  } catch (e) {
    consoleLogger.error(`[Transformations] embed insight failed: ${e.message}`);
  }

  consoleLogger.log(
    `[Transformations] "${transformation.name}" applied to ${document.filename}`,
  );
  return insight;
}

module.exports = { runTransformation };
