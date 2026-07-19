// SPDX-License-Identifier: MIT
// Purpose: Aggregates all system endpoint sub-modules into a single systemEndpoints function.
// Docs: server/endpoints/system.doc.md
const { healthEndpoints } = require("./health");
const { authEndpoints } = require("./auth");
const { documentEndpoints } = require("./documents");
const { settingsEndpoints } = require("./settings");
const { brandingEndpoints } = require("./branding");
const { pfpEndpoints } = require("./pfp");
const { apiKeyEndpoints } = require("./apiKeys");
const { dataExportEndpoints } = require("./dataExport");
const { userManagementEndpoints } = require("./userManagement");
const { miscEndpoints } = require("./misc");
const { feedbackEndpoints } = require("./feedback");

function systemEndpoints(app) {
  if (!app) return;

  healthEndpoints(app);
  authEndpoints(app);
  documentEndpoints(app);
  settingsEndpoints(app);
  brandingEndpoints(app);
  pfpEndpoints(app);
  apiKeyEndpoints(app);
  dataExportEndpoints(app);
  userManagementEndpoints(app);
  miscEndpoints(app);
  feedbackEndpoints(app);
}

module.exports = { systemEndpoints };
