// SPDX-License-Identifier: MIT
/**
 * Report generation REST API endpoints.
 *
 * Docs: index.doc.md
 * Purpose: Generate AfD-branded PDF reports from research results.
 *
 * Endpoints:
 *   POST /reports/generate — generate a PDF report
 *   GET  /reports/:id      — download a generated report
 *   GET  /reports/list     — list generated reports
 */

const { getStoragePath } = require("../../../utils/paths");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  simpleRateLimit,
} = require("../../../utils/middleware/simpleRateLimit");
const logger = require("../../../utils/logger")();
const path = require("path");
const fs = require("fs");

const VALID_TEMPLATES = ["standard", "brief", "full"];
const MAX_SUMMARY_CHARS = 100000;
const MAX_ARRAY_ITEMS = 50;
const MAX_TITLE_CHARS = 300;

const generateRateLimit = simpleRateLimit({
  bucket: "reports-generate",
  max: 5,
  windowMs: 60 * 1000,
});

function getReportGenerator() {
  const { ReportGenerator } = require("../../../utils/reports");
  return ReportGenerator;
}

function getResearchPipeline() {
  const { getResearchPipeline } = require("../../../utils/research");
  return getResearchPipeline();
}

const STORAGE_DIR = getStoragePath("generated-reports");

function apiReportsEndpoints(app) {
  if (!app) return;

  app.post(
    "/reports/generate",
    [generateRateLimit, validApiKey],
    async (request, response) => {
      try {
        const {
          title,
          query,
          summary,
          searchResults,
          politicianResults,
          extractedContent,
          template,
          researchJobId,
        } = request.body || {};

        if (template !== undefined && !VALID_TEMPLATES.includes(template))
          return response.status(400).json({
            error: `template must be one of: ${VALID_TEMPLATES.join(", ")}`,
          });
        if (!researchJobId && !title && !query && !summary)
          return response.status(400).json({
            error:
              "at least one of title, query, summary, or researchJobId is required",
          });
        if (typeof summary === "string" && summary.length > MAX_SUMMARY_CHARS)
          return response.status(400).json({
            error: `summary must be ${MAX_SUMMARY_CHARS} characters or fewer`,
          });
        if (typeof title === "string" && title.length > MAX_TITLE_CHARS)
          return response.status(400).json({
            error: `title must be ${MAX_TITLE_CHARS} characters or fewer`,
          });
        for (const [key, value] of Object.entries({
          searchResults,
          politicianResults,
          extractedContent,
        })) {
          if (value !== undefined && !Array.isArray(value))
            return response
              .status(400)
              .json({ error: `${key} must be an array` });
          if (Array.isArray(value) && value.length > MAX_ARRAY_ITEMS)
            return response.status(400).json({
              error: `${key} must contain ${MAX_ARRAY_ITEMS} items or fewer`,
            });
        }

        let reportData = {
          title: title || query || "Recherche-Bericht",
          query: query || "",
          summary: summary || "",
          searchResults: searchResults || [],
          politicianResults: politicianResults || [],
          extractedContent: extractedContent || [],
          template: template || "standard",
        };

        if (researchJobId) {
          const pipeline = getResearchPipeline();
          const results = pipeline.getResults(researchJobId);
          if (results && results.summary) {
            reportData.query = reportData.query || results.query;
            reportData.summary = results.summary;
            reportData.searchResults = results.searchResults || [];
            reportData.politicianResults = results.politicianResults || [];
            reportData.extractedContent = results.extractedContent || [];
          }
        }

        const ReportGen = getReportGenerator();
        const result = await ReportGen.generate(reportData);
        response.status(200).json(result);
      } catch (err) {
        logger.error(`[reports/generate] ${err.message}`, err);
        response.status(500).json({ error: "Internal Server Error" });
      }
    },
  );

  app.get("/reports/list", [validApiKey], async (_, response) => {
    try {
      if (!fs.existsSync(STORAGE_DIR))
        return response.status(200).json({ reports: [] });
      const files = fs
        .readdirSync(STORAGE_DIR)
        .filter((f) => f.endsWith(".pdf"));
      const reports = files
        .map((f) => {
          const stat = fs.statSync(path.join(STORAGE_DIR, f));
          return {
            fileName: f,
            fileSizeKB: (stat.size / 1024).toFixed(1),
            createdAt: stat.birthtime,
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      response.status(200).json({ reports });
    } catch (err) {
      logger.error(`[reports] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/reports/:fileName", [validApiKey], async (request, response) => {
    try {
      const { fileName } = request.params;
      const safeName = path.basename(fileName);
      const filePath = path.join(STORAGE_DIR, safeName);
      if (!fs.existsSync(filePath))
        return response.status(404).json({ error: "Report not found" });
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `inline; filename="${safeName}"`,
      );
      fs.createReadStream(filePath).pipe(response);
    } catch (err) {
      logger.error(`[reports] ${err.message}`, err);
      response.status(500).json({ error: "Internal Server Error" });
    }
  });
}

module.exports = { apiReportsEndpoints };
