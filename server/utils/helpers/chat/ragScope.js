// SPDX-License-Identifier: MIT

function buildRagScope({ workspace, selectedDocuments, selectionWasExplicit }) {
  const documents = Array.isArray(selectedDocuments) ? selectedDocuments : [];

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    selectionWasExplicit: Boolean(selectionWasExplicit),
    documentIds: documents
      .map((d) => d.docId ?? d.id ?? null)
      .filter((v) => v !== null)
      .map(String),
    documentPaths: documents.map((d) => d.docpath ?? null).filter(Boolean),
    filenames: documents.map((d) => d.filename ?? null).filter(Boolean),
  };
}

module.exports = { buildRagScope };
