// SPDX-License-Identifier: MIT
/**
 * Report generation agent plugin for aibitat.
 *
 * Docs: generate-report.doc.md
 * Purpose: Exposes generate_report as an aibitat function for the AI agent.
 */

const generateReport = {
  name: "generate-report",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: "generate_report",
          description:
            "Generate an AfD-branded PDF report from research results or custom content. " +
            "Returns a download link. Can use a research job ID to auto-fill content.",
          examples: [
            {
              prompt: "Create a report about my research",
              call: JSON.stringify({ researchJobId: "abc-123", title: "Migrationspolitik Analyse", template: "standard" }),
            },
          ],
          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Report title. Defaults to the research query.",
              },
              researchJobId: {
                type: "string",
                description: "Optional research job ID to pull results from.",
              },
              summary: {
                type: "string",
                description: "Custom summary markdown (overrides research result).",
              },
              template: {
                type: "string",
                description: "Report template: 'standard' (full report), 'brief' (short memo), 'full' (comprehensive analysis).",
                enum: ["standard", "brief", "full"],
              },
            },
            additionalProperties: false,
          },
          handler: async function ({ title, researchJobId, summary, template = "standard" } = {}) {
            try {
              const { ReportGenerator } = require("../../../reports");
              const { getResearchPipeline } = require("../../../research");

              let reportData = { title: title || "Recherche-Bericht", query: "", summary: summary || "", searchResults: [], politicianResults: [], extractedContent: [], template };

              if (researchJobId) {
                const pipeline = getResearchPipeline();
                const results = pipeline.getResults(researchJobId);
                if (results && results.summary) {
                  reportData.query = results.query || "";
                  reportData.summary = summary || results.summary;
                  reportData.searchResults = results.searchResults || [];
                  reportData.politicianResults = results.politicianResults || [];
                  reportData.extractedContent = results.extractedContent || [];
                }
              }

              const result = await ReportGenerator.generate(reportData);
              return `Report generated: "${result.fileName}" (${result.fileSizeKB} KB). Download via GET /api/reports/${result.fileName}`;
            } catch (error) {
              return `Error generating report: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { generateReport };
