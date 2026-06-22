// SPDX-License-Identifier: MIT
const { useSwagger } = require("../../swagger/utils");
const { apiAdminEndpoints } = require("./admin");
const { apiAuthEndpoints } = require("./auth");
const { apiDocumentEndpoints } = require("./document");
const { apiSystemEndpoints } = require("./system");
const { apiWorkspaceEndpoints } = require("./workspace");
const { apiWorkspaceThreadEndpoints } = require("./workspaceThread");
const { apiUserManagementEndpoints } = require("./userManagement");
const { apiOpenAICompatibleEndpoints } = require("./openai");
const { apiEmbedEndpoints } = require("./embed");
const { apiPoliticianEndpoints } = require("./politician");
const { apiResearchEndpoints } = require("./research");
const { apiReportsEndpoints } = require("./reports");
const { apiOrchestratorEndpoints } = require("./orchestrator");
const { apiPdfAnalysisEndpoints } = require("./pdfAnalysis");
const { apiEnhancePromptEndpoints } = require("./enhancePrompt");
const { apiTerminalExecEndpoints } = require("./terminalExec");

// All endpoints must be documented and pass through the validApiKey Middleware.
// How to JSDoc an endpoint
// https://www.npmjs.com/package/swagger-autogen#openapi-3x
function developerEndpoints(app, router) {
  if (!router) return;
  useSwagger(app);
  apiAuthEndpoints(router);
  apiAdminEndpoints(router);
  apiSystemEndpoints(router);
  apiWorkspaceEndpoints(router);
  apiDocumentEndpoints(router);
  apiWorkspaceThreadEndpoints(router);
  apiUserManagementEndpoints(router);
  apiOpenAICompatibleEndpoints(router);
  apiEmbedEndpoints(router);
  apiPoliticianEndpoints(router);
  apiResearchEndpoints(router);
  apiReportsEndpoints(router);
  apiOrchestratorEndpoints(router);
  apiPdfAnalysisEndpoints(router);
  apiEnhancePromptEndpoints(router);
  apiTerminalExecEndpoints(router);
}

module.exports = { developerEndpoints };
