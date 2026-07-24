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
              call: JSON.stringify({
                researchJobId: "abc-123",
                title: "Migrationspolitik Analyse",
                template: "standard",
              }),
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
                description:
                  "Custom summary markdown (overrides research result).",
              },
              template: {
                type: "string",
                description:
                  "Report template: 'standard' (full report), 'brief' (short memo), 'full' (comprehensive analysis).",
                enum: ["standard", "brief", "full"],
              },
            },
            additionalProperties: false,
          },
          handler: async function ({
            title,
            researchJobId,
            summary,
            template = "standard",
          } = {}) {
            try {
              const { ReportGenerator } = require("../../../reports");
              const { getResearchPipeline } = require("../../../research");

              let reportData = {
                title: title || "Recherche-Bericht",
                query: "",
                summary: summary || "",
                searchResults: [],
                politicianResults: [],
                extractedContent: [],
                template,
              };

              if (researchJobId) {
                const pipeline = getResearchPipeline();
                const results = pipeline.getResults(researchJobId);
                if (results && results.summary) {
                  reportData.query = results.query || "";
                  reportData.summary = summary || results.summary;
                  reportData.searchResults = results.searchResults || [];
                  reportData.politicianResults =
                    results.politicianResults || [];
                  reportData.extractedContent = results.extractedContent || [];
                }
              }

              const result = await ReportGenerator.generate(reportData);
              const fileSizeBytes = Math.round(
                parseFloat(result.fileSizeKB) * 1024,
              );
              const downloadUrl = `/api/utils/reports/${result.fileName}`;
              const templateLabel =
                template === "brief"
                  ? "Kurzbericht"
                  : template === "full"
                    ? "Ausführlicher Bericht"
                    : "Standardbericht";
              const versions = [
                {
                  label: templateLabel,
                  fileName: result.fileName,
                  downloadUrl,
                },
              ];

              // Notify the frontend so PreviewSidebar opens automatically (Issue #55).
              this.super.socket?.send?.("reportPreview", {
                title: reportData.title,
                fileName: result.fileName,
                fileSizeKB: result.fileSizeKB,
                type: "pdf",
                // Public, no-API-key route so the browser iframe can load it.
                // (the /api/reports/:fileName route requires a valid API key)
                downloadUrl,
                versions,
              });

              // Send a fileDownloadCard event so a download card appears in
              // the chat history AND is persisted for reloads.  Without this,
              // the report is invisible after a page refresh even though the
              // PDF still exists on disk.  Include `versions` so the
              // PreviewSidebar version dropdown survives the auto-preview
              // that FileDownloadCard triggers.
              this.super.socket?.send?.("fileDownloadCard", {
                filename: result.fileName,
                fileSize: fileSizeBytes,
                downloadUrl,
                versions,
              });

              // Register the output on the aibitat instance so it is persisted
              // in the chat history (re-rendered via HistoricalOutputs on reload).
              if (!this.super._pendingOutputs) this.super._pendingOutputs = [];
              this.super._pendingOutputs.push({
                type: "ReportFileDownload",
                payload: {
                  filename: result.fileName,
                  fileSize: fileSizeBytes,
                  downloadUrl,
                  versions,
                },
              });

              return `Report generated: "${result.fileName}" (${result.fileSizeKB} KB). Download via GET ${downloadUrl}`;
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
