// SPDX-License-Identifier: MIT
const consoleLogger = require("../logger/console.js");
const { getVectorDbClass, getEmbeddingEngineSelection } = require("../helpers");

/**
 * Embeds a DocumentInsight as a standalone vector in the workspace namespace
 * so it is discoverable during RAG retrieval and cited as a source.
 *
 * @param {object} params
 * @param {object} params.insight       - persisted DocumentInsight row
 * @param {object} params.document      - workspace_documents row
 * @param {object} params.workspace
 * @param {object} params.transformation
 */
async function embedInsight({ insight, document, workspace, transformation }) {
  const VectorDb = getVectorDbClass();
  const EmbedderEngine = getEmbeddingEngineSelection();
  if (!VectorDb || !EmbedderEngine) return;

  const textContent = `[INSIGHT: ${transformation.title}] (Dokument: ${document.filename})\n\n${insight.content}`;

  // Use the LanceDB addDocumentToNamespace path — it handles embedding, chunking,
  // and caching internally.  We pass a synthetic docId so the vector can be
  // cleaned up independently of the parent document.
  const syntheticDocId = `insight-${insight.id}`;
  const syntheticDocpath = `insights/insight-${insight.id}.json`;

  await VectorDb.addDocumentToNamespace(
    workspace.slug,
    {
      docId: syntheticDocId,
      id: syntheticDocId,
      title: `Insight: ${transformation.title} – ${document.filename}`,
      docpath: syntheticDocpath,
      pageContent: textContent,
      token_count_estimate: Math.ceil(textContent.length / 4),
      isInsight: true,
      parentDocId: document.docId,
    },
    syntheticDocpath,
    true, // skipCache
  );

  consoleLogger.log(
    `[Transformations] Insight ${insight.id} embedded into namespace "${workspace.slug}".`,
  );
}

module.exports = { embedInsight };
