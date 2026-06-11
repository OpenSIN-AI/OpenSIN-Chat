// SPDX-License-Identifier: MIT
/**
 * REST-Endpoints: /api/pdf-analysis/*
 * Geschützt über validApiKey — analog zu /api/research/* und /api/reports/*.
 */
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { validApiKey } = require("../../../utils/middleware/validApiKey");
const { PdfAnalysisPipeline } = require("../../../utils/pdfAnalysis");
const { CrossCheckPipeline } = require("../../../utils/pdfAnalysis/crossCheck");
const config = require("../../../utils/pdfAnalysis/config");

const UPLOAD_DIR = path.join(config.STORAGE_DIR, "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      // Pfad-Traversal verhindern + Kollisionen vermeiden
      const safe = path
        .basename(file.originalname)
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  // KEIN Dateigrößen-Limit — das Tool ist für Riesen-Dateien gebaut.
  // multer streamt multipart direkt auf Disk, RAM bleibt konstant.
  limits: {
    fileSize: Infinity,
    fieldSize: Infinity,
  },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf");
    cb(ok ? null : new Error("Nur PDF-Dateien sind erlaubt."), ok);
  },
});

function apiPdfAnalysisEndpoints(app) {
  if (!app) return;

  // PDF hochladen — liefert pdfPath für /start zurück
  app.post(
    "/api/pdf-analysis/upload",
    [validApiKey, upload.single("file")],
    (request, response) => {
      if (!request.file)
        return response
          .status(400)
          .json({ error: "Keine PDF-Datei im Feld 'file' gefunden." });
      response.status(200).json({
        pdfPath: request.file.path,
        documentName: request.file.originalname,
        sizeBytes: request.file.size,
      });
    }
  );

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

  // ---- Cross-Check (Kreuz-Verifikation) — vor /:id registriert! ----
  app.post(
    "/api/pdf-analysis/crosscheck",
    [validApiKey],
    (request, response) => {
      try {
        const { claims, factIds, sources, deepWeb } = request.body || {};
        const { jobId } = CrossCheckPipeline.start(
          {
            claims: Array.isArray(claims) ? claims : [],
            factIds: Array.isArray(factIds) ? factIds : [],
            sources: Array.isArray(sources) ? sources : [],
            deepWeb: !!deepWeb,
          },
          PdfAnalysisPipeline.factStore
        );
        response.status(200).json({ jobId });
      } catch (e) {
        response
          .status(e.statusCode || 400)
          .json({ error: e.message });
      }
    }
  );

  app.get(
    "/api/pdf-analysis/crosscheck/list",
    [validApiKey],
    (_req, response) => {
      response.status(200).json({ jobs: CrossCheckPipeline.list() });
    }
  );

  app.get(
    "/api/pdf-analysis/crosscheck/:id",
    [validApiKey],
    (request, response) => {
      const status = CrossCheckPipeline.getStatus(request.params.id);
      if (!status)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(status);
    }
  );

  app.get(
    "/api/pdf-analysis/crosscheck/:id/result",
    [validApiKey],
    (request, response) => {
      const result = CrossCheckPipeline.getResult(request.params.id);
      if (!result)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(result);
    }
  );

  app.delete(
    "/api/pdf-analysis/crosscheck/:id",
    [validApiKey],
    (request, response) => {
      const ok = CrossCheckPipeline.cancel(request.params.id);
      response.status(ok ? 200 : 404).json({ cancelled: ok });
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
