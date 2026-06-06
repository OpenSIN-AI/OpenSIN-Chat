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

const { validApiKey } = require("../../../utils/middleware/validApiKey");
const path = require("path");
const fs = require("fs");

function getReportGenerator() {
  const { ReportGenerator } = require("../../../utils/reports");
  return ReportGenerator;
}

function getResearchPipeline() {
  const { getResearchPipeline } = require("../../../utils/research");
  return getResearchPipeline();
}

const STORAGE_DIR =
  process.env.NODE_ENV === "development"
    ? path.resolve(__dirname, "../../../storage/generated-reports")
    : path.resolve(process.env.STORAGE_DIR, "generated-reports");

function apiReportsEndpoints(app) {
  if (!app) return;

  app.post("/reports/generate", [validApiKey], async (request, response) => {
    try {
      const { title, query, summary, searchResults, politicianResults, extractedContent, template, researchJobId } = request.body;

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
      console.error(err.message, err);
      response.status(500).json({ error: err.message });
    }
  });

  app.get("/reports/list", [validApiKey], async (_, response) => {
    try {
      if (!fs.existsSync(STORAGE_DIR)) return response.status(200).json({ reports: [] });
      const files = fs.readdirSync(STORAGE_DIR).filter((f) => f.endsWith(".pdf"));
      const reports = files.map((f) => {
        const stat = fs.statSync(path.join(STORAGE_DIR, f));
        return { fileName: f, fileSizeKB: (stat.size / 1024).toFixed(1), createdAt: stat.birthtime };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      response.status(200).json({ reports });
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });

  app.get("/reports/:fileName", [validApiKey], async (request, response) => {
    try {
      const { fileName } = request.params;
      const safeName = path.basename(fileName);
      const filePath = path.join(STORAGE_DIR, safeName);
      if (!fs.existsSync(filePath)) return response.status(404).json({ error: "Report not found" });
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
      fs.createReadStream(filePath).pipe(response);
    } catch (err) {
      console.error(err.message, err);
      response.sendStatus(500).end();
    }
  });
}

module.exports = { apiReportsEndpoints };
