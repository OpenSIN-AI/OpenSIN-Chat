// SPDX-License-Identifier: MIT
/**
 * Browser-Endpoints: /pdf-analysis/*
 * Session-geschützt über validatedRequest — für die Frontend-UI.
 * (Die Developer-API unter /api/pdf-analysis/* bleibt unverändert bestehen.)
 */
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const {
  validatedRequest,
} = require("../utils/middleware/validatedRequest");
const { PdfAnalysisPipeline } = require("../utils/pdfAnalysis");
const { CrossCheckPipeline } = require("../utils/pdfAnalysis/crossCheck");
const config = require("../utils/pdfAnalysis/config");

const UPLOAD_DIR = path.join(config.STORAGE_DIR, "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
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

function pdfAnalysisEndpoints(app) {
  if (!app) return;

  app.post(
    "/pdf-analysis/upload",
    [validatedRequest, upload.single("file")],
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

  app.post("/pdf-analysis/start", [validatedRequest], (request, response) => {
    try {
      const { pdfPath, task, reportType, factCriteria, deepScan } =
        request.body || {};
      const { jobId } = PdfAnalysisPipeline.start({
        pdfPath,
        task,
        reportType,
        factCriteria,
        deepScan: !!deepScan,
      });
      response.status(200).json({ jobId });
    } catch (e) {
      response.status(e.statusCode || 400).json({ error: e.message });
    }
  });

  app.get("/pdf-analysis/list", [validatedRequest], (_request, response) => {
    response.status(200).json({ jobs: PdfAnalysisPipeline.list() });
  });

  // ---- Cross-Check (Kreuz-Verifikation) — vor /:id registriert! ----
  app.post(
    "/pdf-analysis/crosscheck",
    [validatedRequest],
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
    "/pdf-analysis/crosscheck/list",
    [validatedRequest],
    (_req, response) => {
      response.status(200).json({ jobs: CrossCheckPipeline.list() });
    }
  );

  app.get(
    "/pdf-analysis/crosscheck/:id",
    [validatedRequest],
    (request, response) => {
      const status = CrossCheckPipeline.getStatus(request.params.id);
      if (!status)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(status);
    }
  );

  app.get(
    "/pdf-analysis/crosscheck/:id/result",
    [validatedRequest],
    (request, response) => {
      const result = CrossCheckPipeline.getResult(request.params.id);
      if (!result)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(result);
    }
  );

  app.delete(
    "/pdf-analysis/crosscheck/:id",
    [validatedRequest],
    (request, response) => {
      const ok = CrossCheckPipeline.cancel(request.params.id);
      response.status(ok ? 200 : 404).json({ cancelled: ok });
    }
  );

  app.get("/pdf-analysis/facts", [validatedRequest], (request, response) => {
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
    "/pdf-analysis/facts/stats",
    [validatedRequest],
    (_request, response) => {
      response.status(200).json(PdfAnalysisPipeline.factStore.stats());
    }
  );

  app.delete(
    "/pdf-analysis/facts/:factId",
    [validatedRequest],
    (request, response) => {
      const removed = PdfAnalysisPipeline.factStore.remove(
        request.params.factId
      );
      response.status(removed ? 200 : 404).json({ removed });
    }
  );

  // ---- Report-Downloads (vor /:id registriert) ----
  app.get(
    "/pdf-analysis/:id/report/download",
    [validatedRequest],
    (request, response) => {
      const result = PdfAnalysisPipeline.getResult(request.params.id);
      if (!result || result.status !== "completed" || !result.report)
        return response
          .status(404)
          .json({ error: "Kein Report verfügbar." });
      response.setHeader("Content-Type", "text/markdown; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="analysebericht-${request.params.id}.md"`
      );
      response.status(200).send(result.report);
    }
  );

  app.get(
    "/pdf-analysis/crosscheck/:id/report/download",
    [validatedRequest],
    (request, response) => {
      const result = CrossCheckPipeline.getResult(request.params.id);
      if (!result || result.status !== "completed" || !result.report)
        return response
          .status(404)
          .json({ error: "Kein Bericht verfügbar." });
      response.setHeader("Content-Type", "text/markdown; charset=utf-8");
      response.setHeader(
        "Content-Disposition",
        `attachment; filename="verifikationsbericht-${request.params.id}.md"`
      );
      response.status(200).send(result.report);
    }
  );

  app.get("/pdf-analysis/:id", [validatedRequest], (request, response) => {
    const status = PdfAnalysisPipeline.getStatus(request.params.id);
    if (!status)
      return response.status(404).json({ error: "Job nicht gefunden." });
    response.status(200).json(status);
  });

  app.get(
    "/pdf-analysis/:id/result",
    [validatedRequest],
    (request, response) => {
      const result = PdfAnalysisPipeline.getResult(request.params.id);
      if (!result)
        return response.status(404).json({ error: "Job nicht gefunden." });
      response.status(200).json(result);
    }
  );

  app.delete("/pdf-analysis/:id", [validatedRequest], (request, response) => {
    const ok = PdfAnalysisPipeline.cancel(request.params.id);
    response.status(ok ? 200 : 404).json({ cancelled: ok });
  });
}

module.exports = { pdfAnalysisEndpoints };
