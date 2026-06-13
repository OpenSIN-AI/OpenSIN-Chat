// SPDX-License-Identifier: MIT
/**
 * Deep Research agent plugin for aibitat.
 *
 * Docs: deep-research.doc.md
 * Purpose: Exposes research_topic, get_research_status, get_research_result
 * as aibitat functions for the AI agent.
 */

function getResearchPipeline() {
  const { getResearchPipeline } = require("../../../research");
  return getResearchPipeline();
}

const deepResearch = {
  name: "deep-research",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "research_topic",
          description:
            "Start a deep research on a topic. Searches the web, politician database, and extracts content to generate a structured summary. Returns a job ID for polling. Use this for complex research questions that require multiple sources.",
          examples: [
            {
              prompt: "Research AfD's position on migration policy",
              call: JSON.stringify({
                query: "AfD Migrationspolitik Position Bundestag",
                depth: "deep",
              }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The research question or topic.",
              },
              depth: {
                type: "string",
                description:
                  "Research depth: 'quick' (1 search) or 'deep' (3+ searches). Default: 'quick'.",
                enum: ["quick", "deep"],
              },
              sources: {
                type: "array",
                items: { type: "string" },
                description:
                  "Sources to search: 'web', 'politician'. Default: both.",
              },
            },
            required: ["query"],
            additionalProperties: false,
          },
          handler: async function ({
            query,
            depth = "quick",
            sources = ["web", "politician"],
          } = {}) {
            try {
              const pipeline = getResearchPipeline();
              const result = await pipeline.startResearch({
                query,
                depth,
                sources,
              });
              return `Research started. Job ID: ${result.jobId}. Use get_research_status to check progress.`;
            } catch (error) {
              return `Error starting research: ${error.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "get_research_status",
          description:
            "Check the status of a running research job. Returns progress percentage and current step.",
          examples: [
            {
              prompt: "How is my research going?",
              call: JSON.stringify({ jobId: "abc-123" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              jobId: {
                type: "string",
                description: "The job ID from research_topic.",
              },
            },
            required: ["jobId"],
            additionalProperties: false,
          },
          handler: async function ({ jobId } = {}) {
            try {
              const pipeline = getResearchPipeline();
              const status = pipeline.getStatus(jobId);
              if (!status) return "Job not found.";
              return JSON.stringify(status);
            } catch (error) {
              return `Error checking status: ${error.message}`;
            }
          },
        });

        aibitat.function({
          super: aibitat,
          name: "get_research_result",
          description:
            "Get the results of a completed research job. Returns summary, sources, and extracted content.",
          examples: [
            {
              prompt: "Show me the research results",
              call: JSON.stringify({ jobId: "abc-123" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              jobId: {
                type: "string",
                description: "The job ID from research_topic.",
              },
            },
            required: ["jobId"],
            additionalProperties: false,
          },
          handler: async function ({ jobId } = {}) {
            try {
              const pipeline = getResearchPipeline();
              const results = pipeline.getResults(jobId);
              if (!results) return "Job not found.";
              if (results.status && results.status !== "completed") {
                return `Research is still in progress (${results.status}, ${results.progress}%). Try again later.`;
              }
              return JSON.stringify(results);
            } catch (error) {
              return `Error getting results: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { deepResearch };
