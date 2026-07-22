// SPDX-License-Identifier: MIT
// Purpose: Parse @agent mode tags + research source selections from prompts.
// Docs: Used by AgentHandler / EphemeralAgentHandler to inject system role hints.

const { isFeatureEnabled } = require("../features");

/**
 * @typedef {{ modeId: string|null, sources: string[], cleanMessage: string, systemPrompt: string|null }} ParsedAgentMode
 */

const MODE_HINTS = {
  "deep-research":
    "You are operating in DEEP RESEARCH mode. Perform multi-step reasoning: search broadly first, then drill down into specific sources. Always cite your sources with URLs. Structure your response with clear sections: Summary, Key Findings, Sources. Be thorough and analytical. You MUST call the generate_report tool at the end to produce a downloadable PDF report of your findings when that tool is available.",
  report:
    "You are operating in REPORT mode. You MUST use the generate_report tool to create a professional PDF report. Call generate_report with a title and a summary containing your structured report in markdown format. Use this structure in the summary: 1) Executive Summary (2-3 sentences), 2) Background/Context, 3) Main Analysis (with subheadings), 4) Key Findings (bulleted), 5) Conclusions, 6) Recommendations. If web-search tools are available, use them to gather current information before generating the report. Always cite sources in the summary text.",
  "image-gen":
    "You are operating in IMAGE GENERATION mode. Use the image-generation tool to create the requested image. Translate the user's request into a detailed, descriptive English image prompt covering subject, style, composition, colors, and lighting.",
  "video-gen":
    "You are operating in VIDEO GENERATION mode. Use the video-generation tool to create a short video. Write a detailed cinematic English prompt covering subject, camera motion, lighting, and style. Choose a short descriptive filename ending in .mp4. If video generation is not configured, tell the user to set AI_GATEWAY_API_KEY / VIDEO_GENERATION_API_KEY on the server.",
};

const MODE_FEATURES = Object.freeze({
  "image-gen": "imageGeneration",
  "video-gen": "videoGeneration",
});

function isAgentModeEnabled(modeId, env = process.env) {
  const featureName = MODE_FEATURES[modeId];
  if (!featureName) return true;
  return isFeatureEnabled(featureName, env);
}

/** Connectors that are UI-selectable but not fully wired yet */
const COMING_SOON_SOURCES = new Set([
  "gmail",
  "google-drive",
  "terrabox",
  "oracle-vm",
  "lightning-ai",
  "local-pc",
  "mobile",
]);

const READY_SOURCES = new Set(["web-search"]);

/**
 * Build the deep-research system prompt based on selected source connector ids.
 * @param {string[]} sources
 * @returns {string}
 */
function buildDeepResearchHint(sources = []) {
  const selected = sources.length ? sources : ["web-search"];
  const ready = selected.filter((s) => READY_SOURCES.has(s));
  const soon = selected.filter((s) => COMING_SOON_SOURCES.has(s));
  const unknown = selected.filter(
    (s) => !READY_SOURCES.has(s) && !COMING_SOON_SOURCES.has(s),
  );

  const lines = [MODE_HINTS["deep-research"]];

  if (ready.includes("web-search") || ready.length === 0) {
    lines.push(
      "Allowed sources for this turn: WEB — use web-browsing / web-scraping / deep-research (research_topic) tools extensively.",
    );
  } else {
    lines.push(
      `Allowed ready sources for this turn: ${ready.join(", ")}. Prefer tools that match these sources.`,
    );
  }

  if (soon.length) {
    lines.push(
      `The user also selected connectors that are NOT available yet: ${soon.join(", ")}. Do NOT claim you accessed email, cloud storage, or remote machines. Tell the user those sources are coming soon if they are essential.`,
    );
  }

  if (unknown.length) {
    lines.push(
      `Unrecognized source tags (ignore safely): ${unknown.join(", ")}.`,
    );
  }

  return lines.join("\n");
}

/**
 * Parse @agent mode + optional [sources:a,b] from a user prompt.
 * @param {string} message
 * @returns {ParsedAgentMode}
 */
function parseAgentModeFromPrompt(message = "") {
  let stripped = String(message)
    .replace(/^@agent\s*/i, "")
    .trim();

  let modeId = null;
  let sources = [];
  let systemPrompt = null;

  const modeMatch = stripped.match(/^\[([a-z-]+)\]\s*([\s\S]*)/i);
  if (modeMatch) {
    modeId = modeMatch[1].toLowerCase();
    stripped = (modeMatch[2] || "").trim();
  }

  if (modeId && !isAgentModeEnabled(modeId)) {
    modeId = null;
  }

  const sourcesMatch = stripped.match(/^\[sources:([^\]]+)\]\s*([\s\S]*)/i);
  if (sourcesMatch) {
    sources = sourcesMatch[1]
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    stripped = (sourcesMatch[2] || "").trim();
  }

  if (modeId === "deep-research") {
    systemPrompt = buildDeepResearchHint(sources);
  } else if (modeId && MODE_HINTS[modeId]) {
    systemPrompt = MODE_HINTS[modeId];
  }

  return {
    modeId,
    sources,
    cleanMessage: stripped || "Hello!",
    systemPrompt,
  };
}

/**
 * Build the frontend prefix for an agent mode (incl. deep-research sources).
 * @param {string} modeId
 * @param {string[]} [sources]
 * @returns {string}
 */
function buildAgentModePrefix(modeId, sources = []) {
  if (modeId === "deep-research") {
    const src = sources.length > 0 ? sources.join(",") : "web-search";
    return `@agent [deep-research]\n[sources:${src}]`;
  }
  return `@agent [${modeId}]`;
}

module.exports = {
  MODE_HINTS,
  COMING_SOON_SOURCES,
  READY_SOURCES,
  buildDeepResearchHint,
  isAgentModeEnabled,
  parseAgentModeFromPrompt,
  buildAgentModePrefix,
};
