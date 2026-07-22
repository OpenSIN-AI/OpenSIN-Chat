// SPDX-License-Identifier: MIT

function sourceDocumentId(document) {
  const candidates = [
    document?.docId,
    document?.id,
    document?.docpath,
    document?.filename,
    document?.title,
    document?.url,
  ];
  const value = candidates.find(
    (candidate) =>
      candidate !== null && candidate !== undefined && String(candidate).trim(),
  );
  return value === undefined ? null : String(value);
}

function validateSelectedSources({ workspace, requestedIds = [] }) {
  const documents = Array.isArray(workspace?.documents)
    ? workspace.documents
    : [];
  const byId = new Map();

  for (const document of documents) {
    // Index documents by every known identifier so that source IDs from
    // vector DB results (title, url) and canonical IDs (docId, filename)
    // all resolve to the same document.
    const ids = [
      document?.docId,
      document?.id,
      document?.docpath,
      document?.filename,
      document?.title,
      document?.url,
    ];
    for (const id of ids) {
      if (id !== null && id !== undefined && String(id).trim()) {
        byId.set(String(id), document);
      }
    }
  }

  const uniqueRequested = [...new Set(requestedIds.map(String))];
  const selectedDocuments = uniqueRequested
    .map((id) => byId.get(id))
    .filter(Boolean);

  return {
    selectedIds: selectedDocuments.map(sourceDocumentId).filter(Boolean),
    selectedDocuments,
    rejectedIds: uniqueRequested.filter((id) => !byId.has(id)),
  };
}

module.exports = { sourceDocumentId, validateSelectedSources };
