// SPDX-License-Identifier: MIT
"use strict";

const { isFeatureEnabled } = require("../../../features");

const { webBrowsing } = require("./web-browsing.js");
const { webScraping } = require("./web-scraping.js");
const { websocket } = require("./websocket.js");
const { docSummarizer } = require("./summarize.js");
const { chatHistory } = require("./chat-history.js");
const { memory } = require("./memory.js");
const { rechart } = require("./rechart.js");
const { sqlAgent } = require("./sql-agent/index.js");
const { filesystemAgent } = require("./filesystem/index.js");
const { createFilesAgent } = require("./create-files/index.js");
const { gmailAgent } = require("./gmail/index.js");
const { outlookAgent } = require("./outlook/index.js");
const { googleCalendarAgent } = require("./google-calendar/index.js");
const { requestUserInput } = require("./request-user-input.js");
const { politicianSearch } = require("./politician-search.js");
const { deepResearch } = require("./deep-research.js");
const { generateReport } = require("./generate-report.js");
const { orchestratorAgent } = require("./orchestrator.js");
const { browserVision } = require("./browser-vision.js");
const { pdfAnalyze } = require("./pdf-analyze.js");
const { subagentPlugin } = require("./subagentPlugin.js");

const registry = {};

function registerPlugin(exportName, plugin) {
  if (!plugin?.name) {
    throw new Error(`Invalid built-in agent plugin: ${exportName}`);
  }

  registry[exportName] = plugin;
  registry[plugin.name] = plugin;
}

const corePlugins = {
  webScraping,
  webBrowsing,
  websocket,
  docSummarizer,
  chatHistory,
  memory,
  rechart,
  sqlAgent,
  filesystemAgent,
  createFilesAgent,
  gmailAgent,
  outlookAgent,
  googleCalendarAgent,
  requestUserInput,
  politicianSearch,
  deepResearch,
  generateReport,
  orchestratorAgent,
  browserVision,
  pdfAnalyze,
  subagentPlugin,
};

for (const [exportName, plugin] of Object.entries(corePlugins)) {
  registerPlugin(exportName, plugin);
}

if (isFeatureEnabled("imageGeneration")) {
  const { imageGeneration } = require("./image-generation.js");
  registerPlugin("imageGeneration", imageGeneration);
}

if (isFeatureEnabled("videoGeneration")) {
  const { videoGeneration } = require("./video-generation.js");
  registerPlugin("videoGeneration", videoGeneration);
}

module.exports = registry;
