// SPDX-License-Identifier: MIT

function sourceDocumentId(document) {
  const candidates = [document?.docId, document?.id, document?.docpath, document?.filename];
  const value = candidates.find(
    (candidate) => candidate !== null && candidate !== undefined && String(candidate).trim(),
  );
  return value === undefined ? null : String(value);
}

function validateSelectedSources({ workspace, requestedIds = [] }) {
  const documents = Array.isArray(workspace?.documents) ? workspace.documents : [];
  const byId = new Map();

  for (const document of documents) {
    const id = sourceDocumentId(document);
    if (id) byId.set(id, document);
  }

  const selectedDocuments = requestedIds
    .map((id) => byId.get(String(id)))
    .filter(Boolean);

  return {
    selectedIds: selectedDocuments.map(sourceDocumentId).filter(Boolean),
    selectedDocuments,
    rejectedIds: requestedIds.filter((id) => !byId.has(String(id))),
  };
}

module.exports = { sourceDocumentId, validateSelectedSources };
