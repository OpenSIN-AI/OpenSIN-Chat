// SPDX-License-Identifier: MIT
// Purpose: Document API endpoint registration.
//
// This file was refactored as part of issue #510 (God-File split).
// Route handlers are now split across focused modules:
//   - helpers.js              — shared middleware and utility functions
//   - uploadRoutes.js         — file upload, link upload, raw text routes
//   - queryRoutes.js          — document listing, folder listing, metadata routes
//   - folderRoutes.js         — create/remove folder, move files routes
//   - generatedFilesRoutes.js — agent-generated file download route
//
// This file re-exports apiDocumentEndpoints so existing imports continue to work.

const { registerUploadRoutes } = require("./uploadRoutes");
const { registerQueryRoutes } = require("./queryRoutes");
const { registerFolderRoutes } = require("./folderRoutes");
const { registerGeneratedFilesRoutes } = require("./generatedFilesRoutes");

function apiDocumentEndpoints(app) {
  if (!app) return;
  registerUploadRoutes(app);
  registerQueryRoutes(app);
  registerFolderRoutes(app);
  registerGeneratedFilesRoutes(app);
}

module.exports = { apiDocumentEndpoints };
