// SPDX-License-Identifier: MIT
/**
 * REST-Endpoints: /api/pdf-analysis/*
 * Geschützt über validApiKey — analog zu /api/research/* und /api/reports/*.
 */
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const {
  PdfAnalysisPipeline,
} = require("../../../utils/pdfAnalysis");

function apiPdfAnalysisEndpoints(app) {
  if (!app) return;

  // Analyse starten — Nutzer gibt nur PDF + Auftrag an, Rest läuft autonom
  app.post("/api/pdf-analysis/start", [validApiKey], (request, response) => {
    try {
      const { pdfPath, task, reportType, factCriteria } = request.body || {};
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath,
        task,
        reportType,
        factCriteria,
      });
      response.status(200).json({ jobId });
    } catch (e) {
      response.status(e.statusCode || 400).json({ error: e.message });
    }
  });

  app.get("/api/pdf-analysis/list", [validApiKey], (_request, response) => {
    response.status(200).json({ jobs: PdfAnalysisPipeline.list() });
  });

  // ---- Fakten-Speicher (vor /:id registrieren!) ----
  app.get("/api/pdf-analysis/facts", [validApiKey], (request, response) => {
    const { q, document, tag, page, limit } = request.query || {};
    response.status(200).json({
      facts: PdfAnalysisPipeline.factStore.search({
        q,
        document,
        tag,
        page,
        limit,
      }),
    });
  });

  app.get(
    "/api/pdf-analysis/facts/stats",
    [validApiKey],
    (_request, response) => {
      response.status(200).json(PdfAnalysisPipeline.factStore.stats());
    }
  );

  app.get(
    "/api/pdf-analysis/facts/:factId",
    [validApiKey],
    (request, response) => {
      const fact = PdfAnalysisPipeline.factStore.get(request.params.factId);
      if (!fact)
        return response.status(404).json({ error: "Fakt nicht gefunden." });
      response.status(200).json(fact);
    }
  );

  app.delete(
    "/api/pdf-analysis/facts/:factId",
    [validApiKey],
    (request, response) => {
      const removed = PdfAnalysisPipeline.factStore.remove(
        request.params.factId
      );
      response.status(removed ? 200 : 404).json({ removed });
    }
  );

  // ---- Job-Status / Ergebnis ----
  app.get("/api/pdf-analysis/:id", [validApiKey], (request, response) => {
    const status = PdfAnalysisPipeline.getStatus(request.params.id);
    if (!status)
      return response.status(404).json({ error: "Job nicht gefunden." });
    response.status(200).json(status);
  });

  app.get(
    "/api/pdf-analysis/:id/result",
    [validApiKey],
    (request, response) => {
      const result = PdfAnalysisPipeline.getResult(request.params.id);
      if (!result)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(result);
    }
  );

  app.delete("/api/pdf-analysis/:id", [validApiKey], (request, response) => {
    const ok = PdfAnalysisPipeline.cancel(request.params.id);
    response.status(ok ? 200 : 404).json({ cancelled: ok });
  });
}

module.exports = { apiPdfAnalysisEndpoints };
