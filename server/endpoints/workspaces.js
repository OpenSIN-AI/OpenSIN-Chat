// SPDX-License-Identifier: MIT
const { workspaceParsedFilesEndpoints } = require("./workspacesParsedFiles");
const { workspaceCrudEndpoints } = require("./workspace/workspaceCrud");
const { workspaceDocumentEndpoints } = require("./workspace/workspaceDocuments");
const { workspaceChatEndpoints } = require("./workspace/workspaceChats");
const { workspacePinEndpoints } = require("./workspace/workspacePins");
const { workspaceMediaEndpoints } = require("./workspace/workspaceMedia");
const { workspaceMiscEndpoints } = require("./workspace/workspaceMisc");

function workspaceEndpoints(app) {
  if (!app) return;
  workspaceCrudEndpoints(app);
  workspaceDocumentEndpoints(app);
  workspaceChatEndpoints(app);
  workspacePinEndpoints(app);
  workspaceMediaEndpoints(app);
  workspaceMiscEndpoints(app);
  workspaceParsedFilesEndpoints(app);
}

module.exports = { workspaceEndpoints };
